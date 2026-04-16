// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// src-tauri/src/main.rs
use std::collections::HashMap;
use std::sync::atomic::Ordering;
use tauri::Manager;

mod projects;
mod python_runner_io;
mod settings;
mod types;
mod state;

use state::AppState;

#[derive(serde::Serialize)]
struct WarmupResponse {
    warmup: bool,
    error: Option<String>,
    allow_feedback: Option<bool>,
}

fn read_allow_feedback(projects_dir: &str, project_name: &str) -> Option<bool> {
    let model_dir = std::path::Path::new(projects_dir).join(project_name);
    // Try interactive.json first, then model_meta.json
    for filename in &["interactive.json", "model_meta.json"] {
        let path = model_dir.join(filename);
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(&content) {
                    return value.get("allow_feedback").and_then(|v| v.as_bool());
                }
            }
        }
    }
    None
}

#[tauri::command]
async fn warmup_model(
    project_name: String,
    state: tauri::State<'_, AppState>,
) -> Result<WarmupResponse, String> {
    let projects_dir = {
        let settings = state.settings.lock().unwrap();
        settings.projects_directory.clone()
    };

    let allow_feedback = read_allow_feedback(&projects_dir, &project_name);

    match python_runner_io::load_model(&projects_dir, &project_name, state).await {
        Ok(_) => Ok(WarmupResponse {
            warmup: true,
            error: None,
            allow_feedback,
        }),
        Err(e) => Ok(WarmupResponse {
            warmup: false,
            error: Some(format!("Failed to warm up model: {}", e)),
            allow_feedback,
        }),
    }
}

#[tauri::command]
async fn invoke_model(
    project_name: String,
    inputs: HashMap<String, serde_json::Value>,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let projects_dir = {
        let settings = state.settings.lock().unwrap();
        settings.projects_directory.clone()
    };
    python_runner_io::run_model(&projects_dir, &project_name, inputs, state).await
}

#[tauri::command]
async fn invoke_interactive(
    project_name: String,
    inputs: HashMap<String, serde_json::Value>,
    request_id: Option<String>,
    session_turns: Option<Vec<serde_json::Value>>,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let projects_dir = {
        let settings = state.settings.lock().unwrap();
        settings.projects_directory.clone()
    };
    python_runner_io::run_interactive(&projects_dir, &project_name, inputs, request_id, session_turns, window, state).await
}

#[tauri::command]
async fn stop_interactive(
    request_id: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    python_runner_io::stop_interactive(request_id, state).await
}

// Settings commands
#[tauri::command]
async fn get_settings(state: tauri::State<'_, AppState>) -> Result<settings::Settings, String> {
    let settings = state.settings.lock().unwrap();
    Ok(settings.clone())
}

#[tauri::command]
async fn set_projects_directory(
    path: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();
    settings.projects_directory = path;
    settings.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn open_directory_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog()
        .file()
        .set_title("Select Projects Directory")
        .pick_folder(move |path| {
            let _ = tx.send(path);
        });

    match rx.await {
        Ok(Some(path)) => Ok(Some(path.to_string())),
        Ok(None) => Ok(None),
        Err(_) => Err("Failed to pick folder".to_string()),
    }
}

#[tauri::command]
async fn submit_feedback(
    project_name: String,
    feedback: serde_json::Value,
    state: tauri::State<'_, AppState>,
) -> Result<u64, String> {
    let projects_dir = {
        let settings = state.settings.lock().unwrap();
        settings.projects_directory.clone()
    };
    
    // Save to file
    let feedback_file = std::path::Path::new(&projects_dir)
        .join(&project_name)
        .join("feedback.jsonl");

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
        
    let entry = serde_json::json!({
        "timestamp": timestamp,
        "feedback": feedback
    });
    
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(feedback_file)
        .map_err(|e| format!("Failed to open feedback file: {}", e))?;
        
    writeln!(file, "{}", serde_json::to_string(&entry).unwrap())
        .map_err(|e| format!("Failed to write feedback: {}", e))?;

    // Send to python if running
    python_runner_io::submit_feedback(feedback, state).await.map(|_| timestamp).map_err(|e| e)
}

#[tauri::command]
async fn delete_feedback(
    project_name: String,
    timestamp: u64,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let projects_dir = {
        let settings = state.settings.lock().unwrap();
        settings.projects_directory.clone()
    };
    
    let feedback_file = std::path::Path::new(&projects_dir)
        .join(&project_name)
        .join("feedback.jsonl");
        
    if !feedback_file.exists() {
        return Ok(());
    }

    // Read all lines
    let file = std::fs::File::open(&feedback_file)
        .map_err(|e| format!("Failed to open feedback file: {}", e))?;
    let reader = std::io::BufReader::new(file);
    
    use std::io::BufRead;
    let mut lines = Vec::new(); // Store valid lines
    
    for line in reader.lines() {
        let line = line.map_err(|e| format!("Failed to read line: {}", e))?;
        if line.trim().is_empty() { continue; }
        
        match serde_json::from_str::<serde_json::Value>(&line) {
            Ok(entry) => {
                // If timestamp doesn't match, keep it
                let entry_ts = entry["timestamp"].as_u64().unwrap_or(0);
                if entry_ts != timestamp {
                    lines.push(line);
                }
            },
            Err(_) => lines.push(line), // Keep malformed lines to be safe? Or maybe drop them. Let's keep.
        }
    }

    // Write back
    use std::io::Write;
    let mut file = std::fs::File::create(&feedback_file)
        .map_err(|e| format!("Failed to open feedback file for writing: {}", e))?;
        
    for line in lines {
        writeln!(file, "{}", line)
            .map_err(|e| format!("Failed to write feedback: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
async fn update_feedback(
    project_name: String,
    timestamp: u64,
    context: serde_json::Value,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let projects_dir = {
        let settings = state.settings.lock().unwrap();
        settings.projects_directory.clone()
    };

    let feedback_file = std::path::Path::new(&projects_dir)
        .join(&project_name)
        .join("feedback.jsonl");

    if !feedback_file.exists() {
        return Err("Feedback file not found".to_string());
    }

    let file = std::fs::File::open(&feedback_file)
        .map_err(|e| format!("Failed to open feedback file: {}", e))?;
    let reader = std::io::BufReader::new(file);

    use std::io::BufRead;
    let mut lines = Vec::new();

    for line in reader.lines() {
        let line = line.map_err(|e| format!("Failed to read line: {}", e))?;
        if line.trim().is_empty() { continue; }

        match serde_json::from_str::<serde_json::Value>(&line) {
            Ok(mut entry) => {
                let entry_ts = entry["timestamp"].as_u64().unwrap_or(0);
                if entry_ts == timestamp {
                    // Update the context within the feedback object
                    if let Some(fb) = entry.get_mut("feedback") {
                        fb["context"] = context.clone();
                    }
                    lines.push(serde_json::to_string(&entry).unwrap());
                } else {
                    lines.push(line);
                }
            },
            Err(_) => lines.push(line),
        }
    }

    use std::io::Write;
    let mut file = std::fs::File::create(&feedback_file)
        .map_err(|e| format!("Failed to open feedback file for writing: {}", e))?;

    for line in lines {
        writeln!(file, "{}", line)
            .map_err(|e| format!("Failed to write feedback: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn get_feedback_history(
    project_name: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let projects_dir = {
        let settings = state.settings.lock().unwrap();
        settings.projects_directory.clone()
    };
    
    let feedback_file = std::path::Path::new(&projects_dir)
        .join(&project_name)
        .join("feedback.jsonl");
        
    if !feedback_file.exists() {
        return Ok(Vec::new());
    }

    let file = std::fs::File::open(feedback_file)
        .map_err(|e| format!("Failed to open feedback file: {}", e))?;
    let reader = std::io::BufReader::new(file);
    
    use std::io::BufRead;
    let mut history = Vec::new();
    
    for line in reader.lines() {
        let line = line.map_err(|e| format!("Failed to read line: {}", e))?;
        if line.trim().is_empty() { continue; }
        
        match serde_json::from_str::<serde_json::Value>(&line) {
            Ok(entry) => history.push(entry),
            Err(e) => println!("Failed to parse feedback line: {}", e),
        }
    }
    
    // Reverse to show newest first
    history.reverse();
    Ok(history)
}

#[tauri::command]
async fn cleanup_python_process(
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    python_runner_io::cleanup_python_process(state).await
}

#[tauri::command]
async fn force_kill_python_process(
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    python_runner_io::force_kill_python_process(state).await
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_decorations(false);
            }

            // Load settings on startup
            let app_handle = app.handle();
            let state = app_handle.state::<AppState>();
            let mut settings = state.settings.lock().unwrap();
            *settings = settings::Settings::load().unwrap_or_default();
            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { .. } => {
                    let app_handle = window.app_handle();
                    let state = app_handle.state::<AppState>();
                    
                    // Cleanup Python process immediately
                    let mut guard = state.python_process.lock().unwrap();
                    if let Some(process) = guard.take() {
                        let pid = process.id();
                        println!("Window closing - cleaning up Python process with PID: {}", pid);
                        // Drop will handle the cleanup
                        drop(process);
                        state.python_pid.store(0, Ordering::SeqCst);
                        println!("Python process cleanup completed on window close");
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            projects::list_projects,
            projects::get_model_details,
            projects::get_analytics_details,
            warmup_model,
            invoke_model,
            invoke_interactive,
            stop_interactive,
            get_settings,
            set_projects_directory,
            open_directory_dialog,
            cleanup_python_process,
            force_kill_python_process,
            submit_feedback,
            get_feedback_history,
            delete_feedback,
            update_feedback,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
