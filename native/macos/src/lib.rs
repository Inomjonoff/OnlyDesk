//! macOS Native Platform Abstraction Layer for NexusDesk AI
//! Provides CoreGraphics / ScreenCaptureKit hooks and CGEvent input synthesis.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum NativeError {
    #[error("macOS ScreenCaptureKit error: {0}")]
    CaptureError(String),
    #[error("macOS CGEvent injection error: {0}")]
    InputError(String),
}

pub trait MacOSScreenCapture {
    fn start(&mut self) -> Result<(), NativeError>;
    fn stop(&mut self) -> Result<(), NativeError>;
}
