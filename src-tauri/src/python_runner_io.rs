use std::io::{BufRead, BufReader, Read, Write};
use std::path::Path;
use std::process::{Child, Command, Stdio};
// use HashMap
use std::collections::HashMap;

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

use crate::AppState;
use crate::types::{ModelMeta, PythonEnvironment};

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
    }
    
    let model_dir = Path::new(projects_dir).join(project_name);
    let handler_py = model_dir.join("handler_io.py");
    if !handler_py.exists() {
        return Err("handler_io.py not found".to_string());
    }
    
    // Load model metadata to get Python environment configuration
    let metadata_path = model_dir.join("model_meta.json");
    let python_environment = if metadata_path.exists() {
        let metadata_content = std::fs::read_to_string(&metadata_path)
            .map_err(|e| format!("Failed to read model_meta.json: {}", e))?;
        let model_meta: ModelMeta = serde_json::from_str(&metadata_content)
            .map_err(|e| format!("Failed to parse model_meta.json: {}", e))?;
        model_meta.python_environment
    } else {
        None
    };
    
    // Ensure the base handler file exists in the project directory
    ensure_base_handler_exists(&model_dir)?;
    
    // Build the appropriate Python command based on environment configuration
    let mut command = build_python_command(&python_environment, &model_dir)?;
    
    let mut child = command
        .arg("-u") // Unbuffered output
        .arg(&model_dir.join("python_handler_base.py"))  // Run base handler directly
        .arg(&handler_py)  // Pass user's handler as argument
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped()) // Capture stderr for debugging
        .spawn()
        .map_err(|e| format!("Failed to start Python: {}", e))?;

    let stdin = child.stdin.take().unwrap();
    let stdout = BufReader::new(child.stdout.take().unwrap());
    let stderr = BufReader::new(child.stderr.take().unwrap());

    // Get process ID before storing
    let process_id = child.id();
    println!("Started Python process with PID: {}", process_id);

    let python_process = PythonProcess {
        child,
        stdin,
        stdout,
        stderr,
    };
    *state.python_process.lock().unwrap() = Some(python_process);

    // Wait a moment for Python to initialize and load model
    std::thread::sleep(std::time::Duration::from_millis(2000));

    // Check if process is still running and verify system-level existence
    match check_python_process_health(state.clone()).await {
        Ok(status_msg) => {
            println!("Process health check passed: {}", status_msg);
        }
        Err(e) => {
            // Get more detailed error information
            let detailed_error = get_detailed_process_error(state.clone(), &e);
            println!("Process validation failed: {}", detailed_error);
            return Err(format!("Process validation failed: {}", detailed_error));
        }
    }

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
    let mut command = match python_env {
        Some(PythonEnvironment::System) | None => {
            // Use system Python
            println!("Using system Python");
            Command::new("python")
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

pub async fn run_model(
    // model_id: String,
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

// Enhanced function to get detailed error information (synchronous, avoids peeking stdout)
fn get_detailed_process_error(state: tauri::State<'_, AppState>, original_error: &str) -> String {
    let mut guard = state.python_process.lock().unwrap();
    
    if let Some(ref mut process) = guard.as_mut() {
        let pid = get_process_id(process);
        
        // Check process exit status
        let status_info = match process.child.try_wait() {
            Ok(Some(status)) => {
                if status.success() {
                    format!("Process exited successfully (code: 0)")
                } else if let Some(code) = status.code() {
                    format!("Process exited with error code: {}", code)
                } else {
                    "Process was terminated by signal".to_string()
                }
            }
            Ok(None) => "Process is still running".to_string(),
            Err(e) => format!("Failed to check process status: {}", e),
        };
        
        // Only drain stderr/stdout fully if process has exited; otherwise, avoid consuming streams
        let (stderr_output, stdout_output) = match process.child.try_wait() {
            Ok(Some(_)) => {
                let mut buf = String::new();
                let _ = process.stderr.read_to_string(&mut buf);
                let stderr_opt = if buf.trim().is_empty() { None } else { Some(buf.trim().to_string()) };

                let mut obuf = String::new();
                let _ = process.stdout.read_to_string(&mut obuf);
                let stdout_opt = if obuf.trim().is_empty() { None } else { Some(obuf.trim().to_string()) };
                (stderr_opt, stdout_opt)
            }
            _ => (None, None),
        };

        match (stderr_output, stdout_output) {
            (Some(stderr), Some(stdout)) => format!(
                "Original error: {}. PID: {}. Status: {}. Stderr: {}. Stdout: {}",
                original_error, pid, status_info, stderr, stdout
            ),
            (Some(stderr), None) => format!(
                "Original error: {}. PID: {}. Status: {}. Stderr: {}",
                original_error, pid, status_info, stderr
            ),
            (None, Some(stdout)) => format!(
                "Original error: {}. PID: {}. Status: {}. Stdout: {}",
                original_error, pid, status_info, stdout
            ),
            (None, None) => format!(
                "Original error: {}. PID: {}. Status: {}.",
                original_error, pid, status_info
            ),
        }
    } else {
        format!("Original error: {}. No Python process found in state", original_error)
    }
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

// Comprehensive health check (public API)
// This checks if the Python process exists and is alive
// It uses validate_process_alive
pub async fn check_python_process_health(
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let mut guard = state.python_process.lock().unwrap();

    if let Some(ref mut process) = guard.as_mut() {
        let pid = get_process_id(process);
        
        // First check if process is alive
        if let Err(e) = validate_process_alive(process) {
            // Avoid draining stderr here; higher-level code will collect detailed diagnostics
            return Err(e);
        }
        
        Ok(format!("Python process is running (PID: {})", pid))
    } else {
        Err("Python process not started - no process found in application state".to_string())
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

/// Manually cleanup the Python process. This will be called on app shutdown.
pub async fn cleanup_python_process(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut guard = state.python_process.lock().unwrap();
    
    if let Some(process) = guard.take() {
        let pid = process.id();
        println!("Manually cleaning up Python process with PID: {}", pid);
        
        // The Drop implementation will handle the actual cleanup
        drop(process);
        
        println!("Python process cleanup completed");
        Ok(())
    } else {
        println!("No Python process to cleanup");
        Ok(())
    }
}
