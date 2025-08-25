use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelInputConstraintOption {
    pub value: String,
    pub label: Option<String>,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(untagged)]
pub enum ModelInputConstraintOptions {
    Strings(Vec<String>),
    Objects(Vec<ModelInputConstraintOption>),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelInputConstraint {
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub step: Option<f64>,
    pub options: Option<ModelInputConstraintOptions>,
    pub regex: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelInputDependencyMappingValue {
    pub constraints: Option<ModelInputConstraint>,
}

pub type ModelInputDependencyMapping = HashMap<String, ModelInputDependencyMappingValue>;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelInputDependsOn {
    pub input_name: String,
    pub mapping: ModelInputDependencyMapping,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ModelInputType {
    Float,
    Int,
    String,
    Category,
    Boolean,
    Textarea,
    File
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelInput {
    pub name: String,
    pub label: String,
    #[serde(rename = "type")]
    pub input_type: ModelInputType,
    pub unit: Option<String>,
    pub required: Option<bool>,
    pub description: Option<String>,
    pub default: Option<serde_json::Value>,
    pub constraints: Option<ModelInputConstraint>,
    pub depends_on: Option<ModelInputDependsOn>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelInputPresetValues {
    pub name: String,
    pub values: HashMap<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelInputPresetDependsOn {
    pub field: String,
    pub mapping: ModelInputDependencyMapping,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelInputPreset {
    pub input_preset: String,
    pub label: String,
    pub description: String,
    pub affects: Vec<String>,
    pub presets: Vec<ModelInputPresetValues>,
    pub depends_on: Option<ModelInputPresetDependsOn>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelInputGrouping {
    pub grouping: String,
    pub description: String,
    pub inputs: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelOutputOption {
    pub value: String,
    pub label: Option<String>,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ModelOutputType {
    Float,
    Int,
    String,
    Boolean,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(untagged)]
pub enum ModelOutputOptions {
    Strings(Vec<String>),
    Objects(Vec<ModelOutputOption>),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelOutput {
    pub name: String,
    pub label: String,
    #[serde(rename = "type")]
    pub output_type: ModelOutputType,
    pub unit: Option<String>,
    pub description: Option<String>,
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub options: Option<ModelOutputOptions>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelLinks {
    pub name: String,
    pub url: Option<String>,
    pub file_name: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum PythonEnvironment {
    System,
    Venv {
        path: String,
    },
    Conda {
        name: String,
    },
    Virtualenv {
        path: String,
    },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelMeta {
    pub model_id: String,
    pub model_name: String,
    pub model_version: String,
    pub description: String,
    pub description_short: String,
    pub links: Option<Vec<ModelLinks>>,
    pub tags: Option<HashMap<String, String>>,
    pub inputs: Vec<ModelInput>,
    pub input_presets: Option<Vec<ModelInputPreset>>,
    pub input_groupings: Option<Vec<ModelInputGrouping>>,
    pub outputs: Vec<ModelOutput>,
    pub signed_url_base: Option<String>,
    pub signed_url_params: Option<String>,
    pub python_environment: Option<PythonEnvironment>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelMetaShort {
    pub project_name: String, // folder name
    pub model_id: String,
    pub model_name: String,
    pub description: String,
    pub description_short: String,
    pub tags: Option<HashMap<String, String>>,
}
