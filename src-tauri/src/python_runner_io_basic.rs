use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::process::{Child, Command, Stdio};
// use HashMap
use std::collections::HashMap;

pub struct PythonProcess {
    child: Child,
    stdin: std::process::ChildStdin,
    stdout: BufReader<std::process::ChildStdout>,
    stderr: BufReader<std::process::ChildStderr>,
}

use crate::AppState;

// struct AppState {
//     ...
//     python_process: Mutex<Option<PythonProcess>>,
// }

pub async fn load_model(
    projects_dir: &str,
    project_name: &str,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    println!("Loading model for project: {}", project_name);
    let model_dir = Path::new(projects_dir).join(project_name);
    let handler_py = model_dir.join("handler_io.py");
    if !handler_py.exists() {
        return Err("handler.py not found".to_string());
    }
    let mut child = Command::new("python")
        .arg("-u") // Unbuffered output
        .arg(&handler_py)
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
    std::thread::sleep(std::time::Duration::from_millis(1000));

    // Check if process is still running
    if let Some(ref mut process) = state.python_process.lock().unwrap().as_mut() {
        match process.child.try_wait() {
            Ok(Some(status)) => {
                return Err(format!(
                    "Python process (PID: {}) exited early with status: {}",
                    process_id, status
                ));
            }
            Ok(None) => {
                println!(
                    "Python process (PID: {}) started successfully for project: {}",
                    process_id, project_name
                );

                // Independent system-level check using tasklist (Windows) or ps (Unix)
                if let Err(e) = check_process_exists(process_id) {
                    println!("Warning: System-level process check failed: {}", e);
                } else {
                    println!("System-level verification: Process {} exists", process_id);
                }
            }
            Err(e) => {
                return Err(format!("Failed to check Python process status: {}", e));
            }
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

    let pid = get_process_id(process);
    println!("Using Python process PID: {}", pid);

    // Check if process is still alive
    match process.child.try_wait() {
        Ok(Some(status)) => {
            return Err(format!(
                "Python process (PID: {}) has exited with status: {}",
                pid, status
            ));
        }
        Ok(None) => {
            // Process is still running, good!
        }
        Err(e) => {
            return Err(format!(
                "Failed to check Python process (PID: {}) status: {}",
                pid, e
            ));
        }
    }

    // Send request to the SAME running Python process
    let inputs_json = serde_json::to_string(&inputs).map_err(|e| e.to_string())?;
    println!("Sending to Python: {}", inputs_json);

    writeln!(process.stdin, "{}", inputs_json).map_err(|e| format!("Write failed: {}", e))?;

    // Read response from SAME process
    let mut response_line = String::new();
    match process.stdout.read_line(&mut response_line) {
        Ok(0) => {
            // Check stderr for any error messages
            let mut stderr_line = String::new();
            if process.stderr.read_line(&mut stderr_line).is_ok() && !stderr_line.is_empty() {
                return Err(format!(
                    "Python process ended unexpectedly. Stderr: {}",
                    stderr_line.trim()
                ));
            }
            return Err("Python process ended unexpectedly (EOF)".to_string());
        }
        Ok(_) => {
            println!("Received from Python: {}", response_line.trim());
        }
        Err(e) => {
            return Err(format!("Read failed: {}", e));
        }
    }

    serde_json::from_str(&response_line.trim()).map_err(|e| {
        format!(
            "Parse failed: {}. Raw response: '{}'",
            e,
            response_line.trim()
        )
    })
}

pub async fn check_python_process_health(
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let mut guard = state.python_process.lock().unwrap();

    if let Some(ref mut process) = guard.as_mut() {
        let pid = get_process_id(process);

        match process.child.try_wait() {
            Ok(Some(status)) => Err(format!(
                "Python process (PID: {}) has exited with status: {}",
                pid, status
            )),
            Ok(None) => {
                // Additional system-level check
                match check_process_exists(pid) {
                    Ok(()) => Ok(format!("Python process is running (PID: {})", pid)),
                    Err(e) => Err(format!("Process check failed for PID {}: {}", pid, e)),
                }
            }
            Err(e) => Err(format!(
                "Failed to check Python process (PID: {}) status: {}",
                pid, e
            )),
        }
    } else {
        Err("Python process not started".to_string())
    }
}

pub async fn get_python_process_id(state: tauri::State<'_, AppState>) -> Result<u32, String> {
    let guard = state.python_process.lock().unwrap();

    if let Some(ref process) = guard.as_ref() {
        Ok(get_process_id(process))
    } else {
        Err("Python process not started".to_string())
    }
}

// System-level process check (cross-platform)
fn check_process_exists(pid: u32) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::process::Command;
        let output = Command::new("tasklist")
            .args(&["/FI", &format!("PID eq {}", pid), "/NH"])
            .output()
            .map_err(|e| format!("Failed to run tasklist: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.contains(&pid.to_string()) {
            Ok(())
        } else {
            Err(format!("Process {} not found in tasklist", pid))
        }
    }

    #[cfg(unix)]
    {
        use std::process::Command;
        let output = Command::new("ps")
            .args(&["-p", &pid.to_string()])
            .output()
            .map_err(|e| format!("Failed to run ps: {}", e))?;

        if output.status.success() {
            Ok(())
        } else {
            Err(format!("Process {} not found by ps", pid))
        }
    }
}

fn get_process_id(process: &PythonProcess) -> u32 {
    process.child.id()
}

pub async fn check_model_ready(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let mut guard = state.python_process.lock().unwrap();
    let process = guard.as_mut().ok_or("Python process not started")?;

    let pid = get_process_id(process);
    println!("Checking if model is ready for PID: {}", pid);

    // Check if process is still alive first
    match process.child.try_wait() {
        Ok(Some(status)) => {
            return Err(format!(
                "Python process (PID: {}) has exited with status: {}",
                pid, status
            ));
        }
        Ok(None) => {
            // Process is still running, good!
        }
        Err(e) => {
            return Err(format!(
                "Failed to check Python process (PID: {}) status: {}",
                pid, e
            ));
        }
    }

    // Send ping to check if model is loaded
    let ping_request = r#"{"ping": true}"#;
    println!("Sending ping to Python: {}", ping_request);

    writeln!(process.stdin, "{}", ping_request).map_err(|e| format!("Ping write failed: {}", e))?;

    // Read response
    let mut response_line = String::new();
    match process.stdout.read_line(&mut response_line) {
        Ok(0) => {
            return Err("Python process ended unexpectedly during ping".to_string());
        }
        Ok(_) => {
            println!("Received ping response: {}", response_line.trim());
        }
        Err(e) => {
            return Err(format!("Ping read failed: {}", e));
        }
    }

    // Parse the ping response
    let response: serde_json::Value = serde_json::from_str(&response_line.trim()).map_err(|e| {
        format!(
            "Failed to parse ping response: {}. Raw: '{}'",
            e,
            response_line.trim()
        )
    })?;

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
