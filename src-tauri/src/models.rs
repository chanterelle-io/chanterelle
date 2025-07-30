// src-tauri/src/models.rs
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::types::ModelMetaShort;
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
pub struct ModelDetails {
    pub model: serde_json::Value,
    pub findings: Option<serde_json::Value>,
    pub project_path: String
}

/// Recursively resolves $href references in JSON by replacing them with content from referenced files
fn resolve_json_refs(value: &mut serde_json::Value, base_dir: &Path) -> Result<(), String> {
    match value {
        serde_json::Value::Object(map) => {
            // Check if this object has a $href property
            if let Some(href_value) = map.get("$href") {
                if let Some(href_str) = href_value.as_str() {
                    // Resolve the reference
                    let referenced_file = base_dir.join(href_str);
                    if referenced_file.exists() {
                        let content = fs::read_to_string(&referenced_file)
                            .map_err(|e| format!("Failed to read referenced file '{}': {}", referenced_file.display(), e))?;
                        let mut referenced_json: serde_json::Value = serde_json::from_str(&content)
                            .map_err(|e| format!("Failed to parse JSON in referenced file '{}': {}", referenced_file.display(), e))?;
                        
                        // Recursively resolve references in the loaded content
                        resolve_json_refs(&mut referenced_json, base_dir)?;
                        
                        // Replace the current object with the referenced content
                        *value = referenced_json;
                        return Ok(());
                    } else {
                        return Err(format!("Referenced file not found: '{}' (referenced as '{}')", referenced_file.display(), href_str));
                    }
                }
            }
            
            // Recursively process all values in the object
            for (_, v) in map.iter_mut() {
                resolve_json_refs(v, base_dir)?;
            }
        }
        serde_json::Value::Array(arr) => {
            // Recursively process all items in the array
            for item in arr.iter_mut() {
                resolve_json_refs(item, base_dir)?;
            }
        }
        _ => {
            // Primitive values don't need processing
        }
    }
    Ok(())
}




// pub async fn get_projects_dir() -> Result<PathBuf, String> {
//     let app_data_dir = path::data_dir()
//         .ok_or("Could not get app data directory")?;

//     let projects_dir = app_data_dir.join("YourAppName").join("projects");

//     // Create if it doesn't exist
//     if !projects_dir.exists() {
//         std::fs::create_dir_all(&projects_dir).map_err(|e| e.to_string())?;
//     }

//     Ok(projects_dir)
// }

pub async fn list_all_models(projects_dir: &str) -> Result<Vec<ModelMetaShort>, String> {
    let projects_path = Path::new(projects_dir);

    if !projects_path.exists() {
        return Err(format!(
            "Projects directory does not exist: {}",
            projects_dir
        ));
    }

    let mut models = Vec::new();

    for entry in fs::read_dir(projects_path).map_err(|e| format!("Failed to read projects directory '{}': {}", projects_dir, e))? {
        let entry = entry.map_err(|e| format!("Failed to read directory entry in '{}': {}", projects_dir, e))?;
        let path = entry.path();

        if path.is_dir() {
            let project_id = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            let metadata_path = path.join("model_meta.json");
            if metadata_path.exists() {
                match fs::read_to_string(&metadata_path) {
                    Ok(metadata_content) => {
                        match serde_json::from_str::<serde_json::Value>(&metadata_content) {
                            Ok(metadata) => {
                                models.push(ModelMetaShort {
                                    project_name: project_id,
                                    model_id: metadata["model_id"].as_str().unwrap_or("").to_string(),
                                    model_name: metadata["model_name"].as_str().unwrap_or("").to_string(),
                                    description: metadata["description"].as_str().unwrap_or("").to_string(),
                                    description_short: metadata["description_short"].as_str().unwrap_or("").to_string(),
                                    tags: metadata.get("tags").and_then(|t| t.as_object()).map(|t| {
                                        t.iter()
                                            .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                                            .collect::<HashMap<_, _>>()
                                    }),
                                });
                            }
                            Err(e) => {
                                eprintln!("Warning: Failed to parse JSON in file '{}': {}. Adding error placeholder.", metadata_path.display(), e);
                                models.push(ModelMetaShort {
                                    project_name: project_id.clone(),
                                    model_id: "[ERROR: Invalid JSON]".to_string(),
                                    model_name: format!("Error in {}", project_id),
                                    description: format!("Failed to parse JSON: {}", e),
                                    description_short: "Model metadata JSON parsing error".to_string(),
                                    tags: None,
                                });
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Warning: Failed to read file '{}': {}. Adding error placeholder.", metadata_path.display(), e);
                        models.push(ModelMetaShort {
                            project_name: project_id.clone(),
                            model_id: "[ERROR: File Read]".to_string(),
                            model_name: format!("Error in {}", project_id),
                            description: format!("Failed to read file: {}", e),
                            description_short: "Model metadata JSON parsing error".to_string(),
                            tags: None,
                        });
                    }
                }
            }
        }
    }
    Ok(models)
}

pub async fn get_model_details(
    projects_dir: &str,
    project_name: &str,
) -> Result<ModelDetails, String> {
    let model_dir = Path::new(projects_dir).join(project_name);

    if !model_dir.exists() {
        return Err(format!("Model directory not found: {}", model_dir.display()));
    }

    // Read model_meta.json
    let metadata_path = model_dir.join("model_meta.json");
    let mut metadata = if metadata_path.exists() {
        let content = fs::read_to_string(&metadata_path).map_err(|e| format!("Failed to read file '{}': {}", metadata_path.display(), e))?;
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON in file '{}': {}", metadata_path.display(), e))?
    } else {
        return Err(format!("Required file not found: {}", metadata_path.display()));
    };

    // Resolve $href references in metadata
    resolve_json_refs(&mut metadata, &model_dir)?;

    // // Read form.json
    // let form_path = model_dir.join("form.json");
    // let form = if form_path.exists() {
    //     let content = fs::read_to_string(form_path).map_err(|e| e.to_string())?;
    //     serde_json::from_str(&content).map_err(|e| e.to_string())?
    // } else {
    //     return Err("form.json not found".to_string());
    // };

    // Read findings.json (optional)
    let findings_path = model_dir.join("model_findings.json");
    let mut findings = if findings_path.exists() {
        let content = fs::read_to_string(&findings_path).map_err(|e| format!("Failed to read file '{}': {}", findings_path.display(), e))?;
        Some(serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON in file '{}': {}", findings_path.display(), e))?)
    } else {
        None
    };

    // Resolve $href references in findings if it exists
    if let Some(ref mut findings_value) = findings {
        resolve_json_refs(findings_value, &model_dir)?;
    }

    Ok(ModelDetails {
        model: metadata,
        // form,
        findings,
        project_path: model_dir.to_string_lossy().to_string()

    })
}
