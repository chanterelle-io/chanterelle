// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// src-tauri/src/main.rs
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;

mod models;
mod python_runner_io;
mod settings;
mod types;

// App state to store settings
#[derive(Default)]
struct AppState {
    settings: Mutex<settings::Settings>,
    python_process: Mutex<Option<python_runner_io::PythonProcess>>,
}

#[tauri::command]
async fn list_models(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<types::ModelMetaShort>, String> {
    // Clean up any existing Python process when browsing models
    // This ensures we don't have orphaned processes when switching between projects
    {
        let mut guard = state.python_process.lock().unwrap();
        if let Some(existing_process) = guard.take() {
            let existing_pid = existing_process.id();
            println!("User browsing models - cleaning up existing Python process with PID: {}", existing_pid);
            drop(existing_process); // Triggers Drop implementation
        }
    }
    
    let projects_dir = {
        let settings = state.settings.lock().unwrap();
        settings.projects_directory.clone()
    };

    if projects_dir.is_empty() {
        return Err("No projects directory set. Please configure it in settings.".to_string());
    }

    models::list_all_models(&projects_dir).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_model(
    project_name: String,
    state: tauri::State<'_, AppState>,
) -> Result<models::ModelDetails, String> {
    // println!("Getting model details for project: {}", project_name);
    // tauri::api::console::log(format!("Getting model details for project: {}", project_name).as_str());
    let projects_dir = {
        let settings = state.settings.lock().unwrap();
        settings.projects_directory.clone()
    };
    models::get_model_details(&projects_dir, &project_name).await.map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
struct WarmupResponse {
    warmup: bool,
    error: Option<String>,
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

    match python_runner_io::load_model(&projects_dir, &project_name, state).await {
        Ok(_) => Ok(WarmupResponse {
            warmup: true,
            error: None,
        }),
        Err(e) => Ok(WarmupResponse {
            warmup: false,
            error: Some(format!("Failed to warm up model: {}", e)),
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
fn open_directory_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let result = app
        .dialog()
        .file()
        .set_title("Select Projects Directory")
        .blocking_pick_folder();

    match result {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
async fn cleanup_python_process(
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    python_runner_io::cleanup_python_process(state).await
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .setup(|app| {
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
                        println!("Python process cleanup completed on window close");
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            list_models,
            get_model,
            warmup_model,
            invoke_model,
            get_settings,
            set_projects_directory,
            open_directory_dialog,
            cleanup_python_process,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
