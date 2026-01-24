use std::sync::Mutex;
use crate::{settings, python_runner_io};

// App state to store settings
#[derive(Default)]
pub struct AppState {
    pub settings: Mutex<settings::Settings>,
    pub python_process: Mutex<Option<python_runner_io::PythonProcess>>,
}
