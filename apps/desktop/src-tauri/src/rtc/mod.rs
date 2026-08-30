//! NexusDesk WebRTC Transport Subsystem
//!
//! Provides native WebRTC peer-to-peer transport abstractions,
//! data channels (control, input, clipboard, file, telemetry, chat),
//! and video stream transceivers for desktop clients.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RtcState {
    New,
    Connecting,
    Connected,
    Disconnected,
    Failed,
    Closed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IceState {
    New,
    Checking,
    Connected,
    Completed,
    Disconnected,
    Failed,
    Closed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RtcStats {
    pub rtt_ms: u32,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub packets_lost: u32,
    pub transport_type: String,
}

pub struct PeerConnectionManager {
    pub session_id: Option<String>,
}

impl PeerConnectionManager {
    pub fn new() -> Self {
        Self { session_id: None }
    }
}
