// src-tauri/src/settings.rs
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub projects_directory: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            projects_directory: String::new(),
        }
    }
}

impl Settings {
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_dir = Self::get_config_dir()?;
        let config_file = config_dir.join("settings.json");

        if config_file.exists() {
            let content = fs::read_to_string(config_file)?;
            let settings: Settings = serde_json::from_str(&content)?;
            Ok(settings)
        } else {
            Ok(Self::default())
        }
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config_dir = Self::get_config_dir()?;
        fs::create_dir_all(&config_dir)?;

        let config_file = config_dir.join("settings.json");
        let content = serde_json::to_string_pretty(self)?;
        fs::write(config_file, content)?;

        Ok(())
    }

    fn get_config_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let config_dir = if cfg!(target_os = "windows") {
            env::var("APPDATA").map(PathBuf::from).or_else(|_| {
                env::var("USERPROFILE").map(|p| PathBuf::from(p).join("AppData").join("Roaming"))
            })
        } else if cfg!(target_os = "macos") {
            env::var("HOME").map(|p| PathBuf::from(p).join("Library").join("Application Support"))
        } else {
            env::var("XDG_CONFIG_HOME")
                .map(PathBuf::from)
                .or_else(|_| env::var("HOME").map(|p| PathBuf::from(p).join(".config")))
        };

        let config_dir = config_dir
            .map_err(|_| "Could not get config directory")?
            .join("YourAppName");

        Ok(config_dir)
    }
}
