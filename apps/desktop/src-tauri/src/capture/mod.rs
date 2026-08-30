//! NexusDesk Native Screen Capture Subsystem
//!
//! Provides Windows Graphics Capture and Desktop Duplication API abstractions,
//! display enumeration, monotonic frame timing, and bounded frame queues.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayInfo {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
    pub primary: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CaptureState {
    Stopped,
    Starting,
    Running,
    Paused,
    Stopping,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureOptions {
    pub display_id: String,
    pub max_fps: u32,
    pub max_width: Option<u32>,
    pub max_height: Option<u32>,
    pub cursor: bool,
}

pub struct CapturedFrame {
    pub timestamp_ms: u64,
    pub sequence: u64,
    pub width: u32,
    pub height: u32,
    pub stride: u32,
    pub data: Vec<u8>,
}

pub trait ScreenCapture {
    fn enumerate_displays(&self) -> Result<Vec<DisplayInfo>, String>;
    fn start(&mut self, options: CaptureOptions) -> Result<(), String>;
    fn stop(&mut self) -> Result<(), String>;
    fn next_frame(&mut self) -> Result<Option<CapturedFrame>, String>;
}
