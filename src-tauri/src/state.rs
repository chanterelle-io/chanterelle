use std::sync::Mutex;
use std::sync::atomic::AtomicU32;
use crate::{settings, python_runner_io};

// App state to store settings
pub struct AppState {
    pub settings: Mutex<settings::Settings>,
    pub python_process: Mutex<Option<python_runner_io::PythonProcess>>,
    pub python_pid: AtomicU32,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            settings: Mutex::new(settings::Settings::default()),
            python_process: Mutex::new(None),
            python_pid: AtomicU32::new(0),
        }
    }
}
