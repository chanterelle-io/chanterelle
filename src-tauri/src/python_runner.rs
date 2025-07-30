// src-tauri/src/python_runner.rs
use std::collections::HashMap;
use std::process::Command;
use std::path::Path;

pub async fn run_model(
    projects_dir: &str, 
    project_name: &str, 
    inputs: HashMap<String, serde_json::Value>
) -> Result<serde_json::Value, String> {
    let model_dir = Path::new(projects_dir).join(project_name);
    let handler_py = model_dir.join("handler.py");

    if !handler_py.exists() {
        return Err("handler.py not found".to_string());
    }
    
    // Convert inputs to JSON string
    let inputs_json = serde_json::to_string(&inputs).map_err(|e| e.to_string())?;
    
    // Run Python subprocess
    let output = Command::new("python")
        .arg(&handler_py)
        .arg(&inputs_json)
        .output()
        .map_err(|e| format!("Failed to execute python: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python execution failed: {}", stderr));
    }
    
    // Parse output as JSON
    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse Python output: {}", e))?;
    
    Ok(result)
}