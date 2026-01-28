use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use crate::types::ProjectMeta;
use crate::state::AppState;
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
pub struct ModelDetails {
    pub model: serde_json::Value,
    pub findings: Option<serde_json::Value>,
    pub project_path: String
}

#[derive(Serialize, Deserialize)]
pub struct AnalyticsDetails {
    pub insights: serde_json::Value,
    pub project_path: String
}

/// Recursively resolves $href references in JSON
pub fn resolve_json_refs(value: &mut serde_json::Value, base_dir: &Path) -> Result<(), String> {
    match value {
        serde_json::Value::Object(map) => {
            if let Some(href_value) = map.get("$href") {
                if let Some(href_str) = href_value.as_str() {
                    let referenced_file = base_dir.join(href_str);
                    if referenced_file.exists() {
                        let content = fs::read_to_string(&referenced_file)
                            .map_err(|e| format!("Failed to read referenced file '{}': {}", referenced_file.display(), e))?;
                        let mut referenced_json: serde_json::Value = serde_json::from_str(&content)
                            .map_err(|e| format!("Failed to parse JSON in referenced file '{}': {}", referenced_file.display(), e))?;
                        resolve_json_refs(&mut referenced_json, base_dir)?;
                        *value = referenced_json;
                        return Ok(());
                    } else {
                        return Err(format!("Referenced file not found: '{}' (referenced as '{}')", referenced_file.display(), href_str));
                    }
                }
            }
            for (_, v) in map.iter_mut() {
                resolve_json_refs(v, base_dir)?;
            }
        }
        serde_json::Value::Array(arr) => {
            for item in arr.iter_mut() {
                resolve_json_refs(item, base_dir)?;
            }
        }
        _ => {}
    }
    Ok(())
}

async fn internal_list_projects(projects_dir: &str) -> Result<Vec<ProjectMeta>, String> {
    let projects_path = Path::new(projects_dir);

    if !projects_path.exists() {
        return Err(format!("Projects directory does not exist: {}", projects_dir));
    }

    let mut projects = Vec::new();

    for entry in fs::read_dir(projects_path).map_err(|e| format!("Failed to read projects directory '{}': {}", projects_dir, e))? {
        let entry = entry.map_err(|e| format!("Failed to read directory entry in '{}': {}", projects_dir, e))?;
        let path = entry.path();

        if path.is_dir() {
            let project_id = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            let model_meta_path = path.join("model_meta.json");
            let analytics_meta_path = path.join("analytics.json");
            let interactive_meta_path = path.join("interactive.json");
            
            // Check for modeling project
            if model_meta_path.exists() {
                 match fs::read_to_string(&model_meta_path) {
                    Ok(metadata_content) => {
                        match serde_json::from_str::<serde_json::Value>(&metadata_content) {
                            Ok(metadata) => {
                                projects.push(ProjectMeta {
                                    project_name: project_id.clone(),
                                    project_title: metadata["model_name"].as_str().unwrap_or(&project_id).to_string(),
                                    description: metadata["description"].as_str().unwrap_or("").to_string(),
                                    description_short: metadata["description_short"].as_str().unwrap_or("").to_string(),
                                    tags: metadata.get("tags").and_then(|t| t.as_object()).map(|t| {
                                        t.iter()
                                            .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                                            .collect::<HashMap<_, _>>()
                                    }),
                                    kind: "model".to_string(),
                                });
                            }
                            Err(e) => {
                                projects.push(ProjectMeta {
                                    project_name: project_id.clone(),
                                    project_title: format!("Error in {}", project_id),
                                    description: format!("Failed to parse JSON: {}", e),
                                    description_short: "Error".to_string(),
                                    tags: None,
                                    kind: "model".to_string(),
                                });
                            }
                        }
                    }
                    Err(_) => {}
                }
            } else if interactive_meta_path.exists() {
                // Check for interactive project
                match fs::read_to_string(&interactive_meta_path) {
                    Ok(metadata_content) => {
                        match serde_json::from_str::<serde_json::Value>(&metadata_content) {
                            Ok(metadata) => {
                                projects.push(ProjectMeta {
                                    project_name: project_id.clone(),
                                    project_title: metadata["interactive_name"].as_str().unwrap_or(&project_id).to_string(),
                                    description: metadata["description"].as_str().unwrap_or("Interactive Project").to_string(),
                                    description_short: metadata["description_short"].as_str().unwrap_or("Interactive Project").to_string(),
                                    tags: metadata.get("tags").and_then(|t| t.as_object()).map(|t| {
                                        t.iter()
                                            .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                                            .collect::<HashMap<_, _>>()
                                    }),
                                    kind: "interactive".to_string(),
                                });
                            }
                            Err(e) => {
                                projects.push(ProjectMeta {
                                    project_name: project_id.clone(),
                                    project_title: format!("Error in {}", project_id),
                                    description: format!("Failed to parse JSON: {}", e),
                                    description_short: "Error".to_string(),
                                    tags: None,
                                    kind: "interactive".to_string(),
                                });
                            }
                        }
                    }
                    Err(e) => {
                        projects.push(ProjectMeta {
                            project_name: project_id.clone(),
                            project_title: format!("Error in {}", project_id),
                            description: format!("Failed to read file: {}", e),
                            description_short: "Error".to_string(),
                            tags: None,
                            kind: "interactive".to_string(),
                        });
                    }
                }
            } else if analytics_meta_path.exists() {
                // Check for analytics project
                match fs::read_to_string(&analytics_meta_path) {
                    Ok(metadata_content) => {
                        match serde_json::from_str::<serde_json::Value>(&metadata_content) {
                            Ok(metadata) => {
                                projects.push(ProjectMeta {
                                    project_name: project_id.clone(),
                                    project_title: metadata["analysis_name"].as_str().unwrap_or(&project_id).to_string(),
                                    description: metadata["description"].as_str().unwrap_or("Analytics Project").to_string(),
                                    description_short: metadata["description_short"].as_str().unwrap_or("Analytics Project").to_string(),
                                    tags: metadata.get("tags").and_then(|t| t.as_object()).map(|t| {
                                        t.iter()
                                            .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                                            .collect::<HashMap<_, _>>()
                                    }),
                                    kind: "analytics".to_string(),
                                });
                            }
                            Err(e) => {
                                projects.push(ProjectMeta {
                                    project_name: project_id.clone(),
                                    project_title: format!("Error in {}", project_id),
                                    description: format!("Failed to parse JSON: {}", e),
                                    description_short: "Error".to_string(),
                                    tags: None,
                                    kind: "analytics".to_string(),
                                });
                            }
                        }
                    }
                    Err(e) => {
                        projects.push(ProjectMeta {
                            project_name: project_id.clone(),
                            project_title: format!("Error in {}", project_id),
                            description: format!("Failed to read file: {}", e),
                            description_short: "Error".to_string(),
                            tags: None,
                            kind: "analytics".to_string(),
                        });
                    }
                }
            }
        }
    }
    Ok(projects)
}

pub async fn internal_get_model_details(
    projects_dir: &str,
    project_name: &str,
) -> Result<ModelDetails, String> {
    let model_dir = Path::new(projects_dir).join(project_name);

    if !model_dir.exists() {
        return Err(format!("Model directory not found: {}", model_dir.display()));
    }

    let metadata_path = model_dir.join("model_meta.json");
    let mut metadata = if metadata_path.exists() {
        let content = fs::read_to_string(&metadata_path).map_err(|e| format!("Failed to read file '{}': {}", metadata_path.display(), e))?;
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON in file '{}': {}", metadata_path.display(), e))?
    } else {
        return Err(format!("Required file not found: {}", metadata_path.display()));
    };

    resolve_json_refs(&mut metadata, &model_dir)?;

    let findings_path = model_dir.join("model_findings.json");
    let mut findings = if findings_path.exists() {
        let content = fs::read_to_string(&findings_path).map_err(|e| format!("Failed to read file '{}': {}", findings_path.display(), e))?;
        Some(serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON in file '{}': {}", findings_path.display(), e))?)
    } else {
        None
    };

    if let Some(ref mut findings_value) = findings {
        resolve_json_refs(findings_value, &model_dir)?;
    }

    Ok(ModelDetails {
        model: metadata,
        findings,
        project_path: model_dir.to_string_lossy().to_string()
    })
}

pub async fn internal_get_analytics_details(
    projects_dir: &str,
    project_name: &str,
) -> Result<AnalyticsDetails, String> {
    let project_dir = Path::new(projects_dir).join(project_name);
    
    if !project_dir.exists() {
        return Err(format!("Project directory not found: {}", project_dir.display()));
    }

    let meta_path = project_dir.join("analytics.json");
     let mut insights = if meta_path.exists() {
        let content = fs::read_to_string(&meta_path).map_err(|e| format!("Failed to read file '{}': {}", meta_path.display(), e))?;
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON in file '{}': {}", meta_path.display(), e))?
    } else {
        return Err(format!("Required file not found: {}", meta_path.display()));
    };

    resolve_json_refs(&mut insights, &project_dir)?;

    Ok(AnalyticsDetails {
        insights,
        project_path: project_dir.to_string_lossy().to_string()
    })
}


// --- Commands ---

#[tauri::command]
pub async fn list_projects(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ProjectMeta>, String> {
    {
        let mut guard = state.python_process.lock().unwrap();
        if let Some(existing_process) = guard.take() {
            let existing_pid = existing_process.id();
            println!("Cleaning up existing Python process with PID: {}", existing_pid);
            drop(existing_process); 
        }
    }
    
    let projects_dir = {
        let settings = state.settings.lock().unwrap();
        settings.projects_directory.clone()
    };

    if projects_dir.is_empty() {
        return Err("No projects directory set. Please configure it in settings.".to_string());
    }

    internal_list_projects(&projects_dir).await
}

#[tauri::command]
pub async fn get_model_details(
    project_name: String,
    state: tauri::State<'_, AppState>,
) -> Result<ModelDetails, String> {
    let projects_dir = {
        let settings = state.settings.lock().unwrap();
        settings.projects_directory.clone()
    };
    internal_get_model_details(&projects_dir, &project_name).await
}


#[tauri::command]
pub async fn get_analytics_details(
    project_name: String,
    state: tauri::State<'_, AppState>,
) -> Result<AnalyticsDetails, String> {
    let projects_dir = {
        let settings = state.settings.lock().unwrap();
        settings.projects_directory.clone()
    };
    internal_get_analytics_details(&projects_dir, &project_name).await
}
