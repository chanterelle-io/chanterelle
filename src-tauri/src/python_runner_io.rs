use std::io::{BufRead, BufReader, Read, Write};
use std::path::Path;
use std::process::{Child, Command, Stdio};
// use HashMap
use std::collections::HashMap;
use std::sync::atomic::Ordering;
use tauri::Emitter;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

pub struct PythonProcess {
    child: Child,
    stdin: std::process::ChildStdin,
    stdout: BufReader<std::process::ChildStdout>,
    stderr: BufReader<std::process::ChildStderr>,
}

impl PythonProcess {
    /// Get the process ID of the Python subprocess
    pub fn id(&self) -> u32 {
        self.child.id()
    }
}

impl Drop for PythonProcess {
    fn drop(&mut self) {
        let pid = self.child.id();
        println!("Cleaning up Python process with PID: {}", pid);
        
        // First check if the process is still running
        match self.child.try_wait() {
            Ok(Some(status)) => {
                println!("Python process {} already exited with status: {}", pid, status);
                return;
            }
            Ok(None) => {
                // Process is still running, proceed with cleanup
                println!("Python process {} is still running, terminating...", pid);
            }
            Err(e) => {
                eprintln!("Warning: Could not check status of Python process {}: {}", pid, e);
                // Continue with cleanup attempt anyway
            }
        }
        
        // Try to terminate the process
        if let Err(e) = self.child.kill() {
            eprintln!("Warning: Failed to kill Python process {}: {}", pid, e);
        } else {
            println!("Successfully sent kill signal to Python process {}", pid);
        }
        
        // Wait for the process to actually exit (with a reasonable timeout)
        match self.child.wait() {
            Ok(status) => {
                println!("Python process {} exited with status: {}", pid, status);
            }
            Err(e) => {
                eprintln!("Warning: Failed to wait for Python process {} to exit: {}", pid, e);
            }
        }
    }
}

use crate::state::AppState;
use crate::types::{ModelMeta, PythonEnvironment};

// load_model flow:
// spawn Python
// wait for the single init JSON on stdout
// store the process
// run the ping-based check_model_ready for an extra end-to-end verification

pub async fn load_model(
    projects_dir: &str,
    project_name: &str,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    println!("Loading model for project: {}", project_name);
    
    // Clean up any existing Python process first
    {
        let mut guard = state.python_process.lock().unwrap();
        if let Some(existing_process) = guard.take() {
            let existing_pid = existing_process.id();
            println!("Cleaning up existing Python process with PID: {} before starting new one", existing_pid);
            drop(existing_process); // This will trigger the Drop implementation
        }
        state.python_pid.store(0, Ordering::SeqCst);
    }
    
    let model_dir = Path::new(projects_dir).join(project_name);
    let handler_py = model_dir.join("handler_io.py");
    if !handler_py.exists() {
        return Err("handler_io.py not found".to_string());
    }
    
    // Determine project type and load configuration
    let interactive_meta_path = model_dir.join("interactive.json");
    let is_interactive = interactive_meta_path.exists();

    let mut python_environment = None;

    if is_interactive {
        let content = std::fs::read_to_string(&interactive_meta_path)
            .map_err(|e| format!("Failed to read interactive.json: {}", e))?;
        
        let mut value: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse interactive.json: {}", e))?;
            
        crate::projects::resolve_json_refs(&mut value, &model_dir)?;
        
        if let Some(env_val) = value.get("python_environment") {
             let env: crate::types::PythonEnvironment = serde_json::from_value(env_val.clone())
                .map_err(|e| format!("Failed to parse python_environment from interactive.json: {}", e))?;
             python_environment = Some(env);
        }
    }

    if python_environment.is_none() {
        let metadata_path = model_dir.join("model_meta.json");
        if metadata_path.exists() {
            let metadata_content = std::fs::read_to_string(&metadata_path)
                .map_err(|e| format!("Failed to read model_meta.json: {}", e))?;
            
            let mut metadata_value: serde_json::Value = serde_json::from_str(&metadata_content)
                .map_err(|e| format!("Failed to parse model_meta.json: {}", e))?;
            
            crate::projects::resolve_json_refs(&mut metadata_value, &model_dir)?;
            
            let model_meta: ModelMeta = serde_json::from_value(metadata_value)
                .map_err(|e| format!("Failed to parse model_meta.json: {}", e))?;
            python_environment = model_meta.python_environment;
        }
    }
    
    // Ensure the base handler files exist in the project directory
    if is_interactive {
        println!("Project is interactive. Ensuring interactive handler exists.");
        ensure_interactive_handler_exists(&model_dir)?;
    } else {
        println!("Project is standard. Ensuring base handler exists.");
        ensure_base_handler_exists(&model_dir)?;
    }
    
    let handler_script = if is_interactive {
        "python_interactive_handler_base.py"
    } else {
        "python_handler_base.py"
    };

    // Build the appropriate Python command based on environment configuration
    let mut command = build_python_command(&python_environment, &model_dir)?;
    
    let python_exe_for_error = format!("{:?}", command.get_program());

    let mut child = command
        .arg("-u") // Unbuffered output
        .arg(&model_dir.join(handler_script))  // Run appropriate base handler
        .arg(&handler_py)  // Pass user's handler as argument
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped()) // Capture stderr for debugging
        .spawn()
        .map_err(|e| format!("Failed to start Python (exe={}): {}", python_exe_for_error, e))?;

    let stdin = child.stdin.take().unwrap();
    let mut stdout = BufReader::new(child.stdout.take().unwrap());
    let mut stderr = BufReader::new(child.stderr.take().unwrap());

    // Get process ID before storing
    let process_id = child.id();
    println!("Started Python process with PID: {}", process_id);

    // Handshake: expect a single JSON line announcing readiness or an error
    let mut init_line = String::new();
    // read_line waits until it sees a newline, EOF, or an error.
    match stdout.read_line(&mut init_line) {
        Ok(0) => { // 0 bytes from stdout means EOF with zero bytes read on that call
            // Process may have exited without stdout message; try to provide diagnostics
            match child.try_wait() {
                Ok(Some(_)) => {
                    let mut err_buf = String::new();
                    let _ = stderr.read_to_string(&mut err_buf);
                    let msg = if err_buf.trim().is_empty() {
                        "Python process exited during initialization (EOF)".to_string()
                    } else {
                        format!("Python initialization failed. Stderr: {}", err_buf.trim())
                    };
                    return Err(msg);
                }
                Ok(None) => {
                    return Err("Python stdout closed (EOF) while process still running".to_string());
                }
                Err(e) => {
                    return Err(format!("Failed checking Python status after EOF: {}", e));
                }
            }
        }
        Ok(_) => {
            println!("Init from Python: {}", init_line.trim());
            let val: serde_json::Value = serde_json::from_str(init_line.trim())
                .map_err(|e| format!("Failed to parse Python init JSON: {}. Raw: '{}'", e, init_line.trim()))?;
            if let Some(status) = val.get("status").and_then(|v| v.as_str()) {
                if status != "ready" {
                    // Prefer detailed error if present
                    let err_msg = val
                        .get("summary")
                        .and_then(|v| v.as_str())
                        .or_else(|| val.get("error").and_then(|v| v.as_str()))
                        .unwrap_or("Model initialization error");
                    return Err(format!("Python reported initialization failure: {}", err_msg));
                }
            } else {
                return Err("Invalid initialization message from Python (missing 'status')".to_string());
            }
        }
        Err(e) => {
            return Err(format!("Failed to read Python initialization message: {}", e));
        }
    }

    // Only store the process after successful handshake
    let python_process = PythonProcess {
        child,
        stdin,
        stdout,
        stderr,
    };
    *state.python_process.lock().unwrap() = Some(python_process);
    state.python_pid.store(process_id, Ordering::SeqCst);

    // Handshake already ensured the process is running and ready; proceed to model readiness check

    // Verify the model is actually loaded and ready
    match check_model_ready(state).await {
        Ok(true) => {
            println!("Model health check passed for project: {}", project_name);
            Ok(())
        }
        Ok(false) => Err("Model health check failed: model not ready".to_string()),
        Err(e) => Err(format!("Model health check failed: {}", e)),
    }
}

/// Build the appropriate Python command based on the environment configuration
fn build_python_command(python_env: &Option<PythonEnvironment>, model_dir: &Path) -> Result<Command, String> {
    let command = match python_env {
        Some(PythonEnvironment::System) | None => {
            // Use system Python
            println!("Using system Python");
            if cfg!(windows) {
                Command::new("python")
            } else {
                Command::new("python3")
            }
        }
        Some(PythonEnvironment::Venv { path }) => {
            // Use virtual environment
            let venv_path = if Path::new(path).is_absolute() {
                Path::new(path).to_path_buf()
            } else {
                model_dir.join(path)
            };
            
            let python_executable = if cfg!(windows) {
                venv_path.join("Scripts").join("python.exe")
            } else {
                venv_path.join("bin").join("python")
            };
            
            if !python_executable.exists() {
                return Err(format!("Python executable not found in venv: {}", python_executable.display()));
            }
            
            println!("Using venv Python at: {}", python_executable.display());
            Command::new(python_executable)
        }
        Some(PythonEnvironment::Virtualenv { path }) => {
            // Use virtualenv (same logic as venv)
            let venv_path = if Path::new(path).is_absolute() {
                Path::new(path).to_path_buf()
            } else {
                model_dir.join(path)
            };
            
            let python_executable = if cfg!(windows) {
                venv_path.join("Scripts").join("python.exe")
            } else {
                venv_path.join("bin").join("python")
            };
            
            if !python_executable.exists() {
                return Err(format!("Python executable not found in virtualenv: {}", python_executable.display()));
            }
            
            println!("Using virtualenv Python at: {}", python_executable.display());
            Command::new(python_executable)
        }
        Some(PythonEnvironment::Conda { name }) => {
            // Use conda environment
            println!("Using conda environment: {}", name);
            let mut cmd = Command::new("conda");
            cmd.args(["run", "-n", name, "python"]);
            cmd
        }
    };
    
    // On Windows, configure the command to hide the console window
    #[cfg(windows)]
    {
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    
    Ok(command)
}

fn ensure_base_handler_exists(model_dir: &Path) -> Result<(), String> {
    let base_handler_path = model_dir.join("python_handler_base.py");
    
    // Always update the base handler to ensure we have the latest version
    let base_handler_content = include_str!("python_handler_base.py");
    std::fs::write(&base_handler_path, base_handler_content)
        .map_err(|e| format!("Failed to create/update base handler file: {}", e))?;
    println!("Updated python_handler_base.py in project directory");
    
    Ok(())
}

fn ensure_interactive_handler_exists(model_dir: &Path) -> Result<(), String> {
    let handler_path = model_dir.join("python_interactive_handler_base.py");
    let content = include_str!("python_interactive_handler_base.py");
    std::fs::write(&handler_path, content)
        .map_err(|e| format!("Failed to create/update interactive handler file: {}", e))?;
    Ok(())
}

pub async fn run_interactive(
    _projects_dir: &str,
    _project_name: &str,
    inputs: HashMap<String, serde_json::Value>,
    request_id: Option<String>,
    session_turns: Option<Vec<serde_json::Value>>,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    println!("Running interactive session with inputs: {:?}", inputs);
    
    let mut guard = state.python_process.lock().unwrap();
    let process = guard.as_mut().ok_or("Python process not started")?;
    validate_process_alive(process)?;
    
    let request_payload = if inputs.is_empty() {
        let mut payload = serde_json::json!({
            "command": "initialize",
            "request_id": request_id
        });
        if let Some(turns) = session_turns {
            payload["session_turns"] = serde_json::Value::Array(turns);
        }
        payload
    } else {
        serde_json::json!({
            "command": "on_input",
            "inputs": inputs,
            "request_id": request_id
        })
    };
    let inputs_json = serde_json::to_string(&request_payload).map_err(|e| e.to_string())?;
    send_request_to_python(process, &inputs_json)?;
    
    // Loop to read streaming responses
    loop {
        let mut line = String::new();
        match process.stdout.read_line(&mut line) {
            Ok(0) => break, // EOF
            Ok(_) => {
                let trimmed = line.trim();
                if trimmed.is_empty() { continue; }
                
                // Try parsing to ensure validity before emitting
                match serde_json::from_str::<serde_json::Value>(trimmed) {
                    Ok(json_val) => {
                        // Drain one full request/response turn using explicit Python boundary marker.
                        if json_val
                            .get("_chanterelle_turn_end")
                            .and_then(|v| v.as_bool())
                            == Some(true)
                        {
                            break;
                        }

                        window.emit("interactive:output", &json_val).map_err(|e| e.to_string())?;
                    },
                    Err(e) => {
                        println!("Error parsing interactive output: {}", e);
                    }
                }
            }
            Err(e) => return Err(format!("Error reading from Python: {}", e)),
        }
    }
    Ok(())
}

pub async fn stop_interactive(
    request_id: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    // Try cooperative cancel first if we can lock immediately.
    if let Ok(mut guard) = state.python_process.try_lock() {
        if let Some(process) = guard.as_mut() {
            let request = serde_json::json!({
                "command": "cancel",
                "request_id": request_id
            });
            let request_json = serde_json::to_string(&request).map_err(|e| e.to_string())?;
            if send_request_to_python(process, &request_json).is_ok() {
                return Ok(true);
            }
        }
    }

    // If cooperative cancel cannot be delivered (e.g., mutex busy), try a soft OS-level terminate.
    let pid = state.python_pid.load(Ordering::SeqCst);
    if pid == 0 {
        return Ok(false);
    }

    #[cfg(unix)]
    let status = Command::new("kill")
        .arg("-15")
        .arg(pid.to_string())
        .status()
        .map_err(|e| format!("Failed to run soft kill for PID {}: {}", pid, e))?;

    #[cfg(windows)]
    let status = Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T"])
        .status()
        .map_err(|e| format!("Failed to run soft taskkill for PID {}: {}", pid, e))?;

    Ok(status.success())
}

pub async fn run_model(
    _projects_dir: &str,
    _project_name: &str,
    inputs: HashMap<String, serde_json::Value>,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    println!("Running model with inputs: {:?}", inputs);
    
    let mut guard = state.python_process.lock().unwrap();
    let process = guard.as_mut().ok_or("Python process not started")?;

    // Validate process health first
    validate_process_alive(process)?;

    let pid = get_process_id(process);
    println!("Using Python process PID: {}", pid);

    // Send request to the Python process
    let inputs_json = serde_json::to_string(&inputs).map_err(|e| e.to_string())?;
    println!("Sending to Python: {}", inputs_json);

    send_request_to_python(process, &inputs_json)?;
    read_response_from_python(process)
}

fn send_request_to_python(process: &mut PythonProcess, request: &str) -> Result<(), String> {
    writeln!(process.stdin, "{}", request).map_err(|e| format!("Write failed: {}", e))
}

fn read_response_from_python(process: &mut PythonProcess) -> Result<serde_json::Value, String> {
    let mut response_line = String::new();
    match process.stdout.read_line(&mut response_line) {
        Ok(0) => {
            // Only drain stderr if the process has actually exited
            match process.child.try_wait() {
                Ok(Some(_)) => {
                    // Process exited; drain all stderr for diagnostics
                    let mut buf = String::new();
                    let _ = process.stderr.read_to_string(&mut buf);
                    if buf.trim().is_empty() {
                        return Err("Python process ended unexpectedly (EOF)".to_string());
                    } else {
                        return Err(format!("Python process ended unexpectedly. Stderr: {}", buf.trim()));
                    }
                }
                Ok(None) => {
                    return Err("Python stdout closed (EOF) while process still running".to_string());
                }
                Err(e) => {
                    return Err(format!("Failed to check Python process status after EOF: {}", e));
                }
            }
        }
        Ok(_) => {
            println!("Received from Python: {}", response_line.trim());
        }
        Err(e) => {
            return Err(format!("Read failed: {}", e));
        }
    }

    let parsed_response: serde_json::Value = serde_json::from_str(&response_line.trim()).map_err(|e| {
        format!(
            "Parse failed: {}. Raw response: '{}'",
            e,
            response_line.trim()
        )
    })?;

    // Check if the response contains error information and enhance it if it's detailed format
    if let Some(error_obj) = parsed_response.as_object() {
        // Check for detailed error format first
        if error_obj.contains_key("error") && error_obj.contains_key("error_type") {
            // This is a detailed error response from our enhanced Python handler
            let error_msg = error_obj.get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown error");
            
            // let error_type = error_obj.get("error_type")
            //     .and_then(|v| v.as_str())
            //     .unwrap_or("Error");
            
            // let context = error_obj.get("context")
            //     .and_then(|v| v.as_str())
            //     .unwrap_or("");
            
            // Only interested in summary
            let summary = error_obj.get("summary")
                .and_then(|v| v.as_str())
                .unwrap_or(error_msg);
            
            // // Format traceback information if available
            // let mut traceback_info = String::new();
            // if let Some(traceback) = error_obj.get("traceback").and_then(|v| v.as_array()) {
            //     traceback_info.push_str("\nTraceback:\n");
            //     for frame in traceback {
            //         if let Some(frame_obj) = frame.as_object() {
            //             let file = frame_obj.get("file").and_then(|v| v.as_str()).unwrap_or("unknown");
            //             let line = frame_obj.get("line").and_then(|v| v.as_u64()).unwrap_or(0);
            //             let function = frame_obj.get("function").and_then(|v| v.as_str()).unwrap_or("unknown");
            //             let code = frame_obj.get("code").and_then(|v| v.as_str()).unwrap_or("");
                        
            //             traceback_info.push_str(&format!(
            //                 "  File {}, line {}, in {}:\n    {}\n",
            //                 file, line, function, code
            //             ));
            //         }
            //     }
            // }
            
            // // Create enhanced error message with all the details
            // let detailed_msg = if !context.is_empty() {
            //     format!("{}: {}{}", context, summary, traceback_info)
            // } else {
            //     format!("{}{}", summary, traceback_info)
            // };
            let detailed_msg = summary.to_string();
            // Return a new JSON object with the enhanced error message
            let enhanced_response = serde_json::json!({
                "error": detailed_msg
            });
            return Ok(enhanced_response);
        }
    }

    // For simple errors or successful responses, return as-is
    Ok(parsed_response)
}

// Helper removed: avoid reading stderr here to preserve logs for detailed error reporting

// Enhanced validation function with more detailed error reporting
// This checks if the process did not exit unexpectedly or gave an error
fn validate_process_alive(process: &mut PythonProcess) -> Result<(), String> {
    let pid = get_process_id(process);

    match process.child.try_wait() {
        Ok(Some(status)) => {
            let exit_reason = if status.success() {
                format!("Process completed successfully (exit code: 0)")
            } else if let Some(code) = status.code() {
                format!("Process failed with exit code: {}", code)
            } else {
                "Process was terminated by signal".to_string()
            };
            
            Err(format!(
                "Python process (PID: {}) has exited. Reason: {}",
                pid, exit_reason
            ))
        }
        Ok(None) => Ok(()), // Process is still running
        Err(e) => Err(format!(
            "Failed to check Python process (PID: {}) status: {}. This might indicate the process crashed or system resource issues.",
            pid, e
        )),
    }
}

fn get_process_id(process: &PythonProcess) -> u32 {
    process.id()
}

/// Checks if the model is ready by sending a ping request to the Python process and verifying the response.
// It also uses validate_process_alive to ensure the process is still running.
pub async fn check_model_ready(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let mut guard = state.python_process.lock().unwrap();
    let process = guard.as_mut().ok_or("Python process not started")?;

    let pid = get_process_id(process);
    println!("Checking if model is ready for PID: {}", pid);

    // Check if process is still alive first
    validate_process_alive(process)?;

    // Send ping to check if model is loaded
    let ping_request = r#"{"ping": true}"#;
    println!("Sending ping to Python: {}", ping_request);

    send_request_to_python(process, ping_request)?;
    let response = read_response_from_python(process)?;

    // Parse the ping response
    if let Some(pong) = response.get("pong").and_then(|v| v.as_bool()) {
        if pong && response.get("status").and_then(|v| v.as_str()) == Some("ready") {
            Ok(true)
        } else {
            let error_msg = response
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Model not ready");
            Err(format!("Model health check failed: {}", error_msg))
        }
    } else {
        Err("Invalid ping response format".to_string())
    }
}

pub async fn submit_feedback(
    feedback: serde_json::Value,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    println!("Submitting feedback to Python");
    
    let mut guard = state.python_process.lock().unwrap();
    // If process is not running, we just ignore the Python part (it's optional custom action)
    if let Some(process) = guard.as_mut() {
         // Check if alive but don't fail hard if it's just for feedback? 
         // Actually if it's there but dead, we should probably know.
         // But validate_process_alive checks that.
         if let Err(e) = validate_process_alive(process) {
             println!("Python process validation failed during feedback: {}", e);
             return Ok(()); // Don't fail the whole feedback submission if python is dead
         }
         
         let request = serde_json::json!({
             "command": "feedback",
             "data": feedback
         });
         
         let request_json = serde_json::to_string(&request).map_err(|e| e.to_string())?;
         
         if let Err(e) = send_request_to_python(process, &request_json) {
              println!("Failed to send feedback to Python: {}", e);
              return Ok(());
         }
         
         // We expect a response
         match read_response_from_python(process) {
             Ok(response) => println!("Python feedback response: {:?}", response),
             Err(e) => println!("Failed to read Python feedback response: {}", e),
         }
    }
    
    Ok(())
}

/// Manually cleanup the Python process. This will be called on app shutdown.
pub async fn cleanup_python_process(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut guard = state.python_process.lock().unwrap();
    
    if let Some(process) = guard.take() {
        let pid = process.id();
        println!("Manually cleaning up Python process with PID: {}", pid);
        
        // The Drop implementation will handle the actual cleanup
        drop(process);
        state.python_pid.store(0, Ordering::SeqCst);
        
        println!("Python process cleanup completed");
        Ok(())
    } else {
        println!("No Python process to cleanup");
        state.python_pid.store(0, Ordering::SeqCst);
        Ok(())
    }
}

pub async fn force_kill_python_process(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let pid = state.python_pid.load(Ordering::SeqCst);
    if pid == 0 {
        return Ok(false);
    }

    println!("Force-killing Python process with PID: {}", pid);

    #[cfg(unix)]
    let status = Command::new("kill")
        .arg("-9")
        .arg(pid.to_string())
        .status()
        .map_err(|e| format!("Failed to run kill for PID {}: {}", pid, e))?;

    #[cfg(windows)]
    let status = Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .status()
        .map_err(|e| format!("Failed to run taskkill for PID {}: {}", pid, e))?;

    let killed = status.success();
    if killed {
        state.python_pid.store(0, Ordering::SeqCst);
        if let Ok(mut guard) = state.python_process.try_lock() {
            let _ = guard.take();
        }
    }

    Ok(killed)
}
