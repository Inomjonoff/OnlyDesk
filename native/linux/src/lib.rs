//! Linux Native Platform Abstraction Layer for NexusDesk AI
//! Provides PipeWire / Wayland portal capture and uinput input injection.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum NativeError {
    #[error("Linux PipeWire portal error: {0}")]
    CaptureError(String),
    #[error("Linux uinput error: {0}")]
    InputError(String),
}

pub trait LinuxScreenCapture {
    fn start(&mut self) -> Result<(), NativeError>;
    fn stop(&mut self) -> Result<(), NativeError>;
}
