pub mod commands;

pub trait ScreenCapture {
    fn start_capture(&self) -> Result<(), String>;
    fn stop_capture(&self) -> Result<(), String>;
}

pub trait InputController {
    fn move_mouse(&self, x: i32, y: i32) -> Result<(), String>;
    fn click_mouse(&self, button: &str) -> Result<(), String>;
    fn key_event(&self, key: &str, down: bool) -> Result<(), String>;
}

pub trait ClipboardManager {
    fn read_text(&self) -> Result<String, String>;
    fn write_text(&self, text: &str) -> Result<(), String>;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_system_stats,
            commands::get_device_identity
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
