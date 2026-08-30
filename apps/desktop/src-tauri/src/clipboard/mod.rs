//! NexusDesk Native Clipboard Subsystem
//!
//! Provides native clipboard listeners, text & PNG image synchronization,
//! and origin-based loop prevention.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClipboardType {
    Text,
    Image,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardPayload {
    pub clipboard_id: String,
    pub origin_device_id: String,
    pub clipboard_type: ClipboardType,
    pub content: Vec<u8>,
    pub sha256: String,
}

pub trait ClipboardEngine {
    fn read_clipboard(&self) -> Result<Option<ClipboardPayload>, String>;
    fn write_clipboard(&self, payload: ClipboardPayload) -> Result<(), String>;
}
