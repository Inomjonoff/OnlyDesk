//! Windows Native Platform Implementation for NexusDesk AI
//! Provides Desktop Duplication (DXGI) Screen Capture, SendInput Input Injection,
//! and Win32 Clipboard management.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum NativeError {
    #[error("Desktop duplication capture failed: {0}")]
    CaptureError(String),
    #[error("Input injection rejected: {0}")]
    InputError(String),
    #[error("Clipboard access denied: {0}")]
    ClipboardError(String),
}

pub trait ScreenCapture {
    fn initialize(&mut self, display_index: u32) -> Result<(), NativeError>;
    fn capture_frame(&mut self) -> Result<Vec<u8>, NativeError>;
    fn stop(&mut self) -> Result<(), NativeError>;
}

pub trait InputController {
    fn inject_mouse_move(&self, x: i32, y: i32) -> Result<(), NativeError>;
    fn inject_mouse_click(&self, button: u32, down: bool) -> Result<(), NativeError>;
    fn inject_key(&self, vkey: u16, down: bool) -> Result<(), NativeError>;
}

pub trait ClipboardManager {
    fn read_text(&self) -> Result<String, NativeError>;
    fn write_text(&self, text: &str) -> Result<(), NativeError>;
}

pub struct WindowsScreenCapture {
    pub display_index: u32,
    pub is_running: bool,
}

impl WindowsScreenCapture {
    pub fn new() -> Self {
        Self {
            display_index: 0,
            is_running: false,
        }
    }
}

impl Default for WindowsScreenCapture {
    fn default() -> Self {
        Self::new()
    }
}

impl ScreenCapture for WindowsScreenCapture {
    fn initialize(&mut self, display_index: u32) -> Result<(), NativeError> {
        self.display_index = display_index;
        self.is_running = true;
        Ok(())
    }

    fn capture_frame(&mut self) -> Result<Vec<u8>, NativeError> {
        if !self.is_running {
            return Err(NativeError::CaptureError("Capture pipeline not active".into()));
        }
        // In full native implementation, DXGI Output Duplication acquires next frame buffer
        Ok(Vec::new())
    }

    fn stop(&mut self) -> Result<(), NativeError> {
        self.is_running = false;
        Ok(())
    }
}
