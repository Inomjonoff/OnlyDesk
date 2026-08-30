use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStats {
    pub os_name: String,
    pub os_version: String,
    pub cpu_count: usize,
    pub cpu_usage: f32,
    pub memory_total_mb: u64,
    pub memory_used_mb: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceIdentity {
    pub display_id: String,
    pub fingerprint: String,
}

#[tauri::command]
pub fn get_system_stats() -> SystemStats {
    let mut sys = System::new_all();
    sys.refresh_all();

    SystemStats {
        os_name: System::name().unwrap_or_else(|| "Unknown".to_string()),
        os_version: System::os_version().unwrap_or_else(|| "Unknown".to_string()),
        cpu_count: sys.cpus().len(),
        cpu_usage: sys.global_cpu_usage(),
        memory_total_mb: sys.total_memory() / (1024 * 1024),
        memory_used_mb: sys.used_memory() / (1024 * 1024),
    }
}

#[tauri::command]
pub fn get_device_identity() -> DeviceIdentity {
    DeviceIdentity {
        display_id: "NXD-W9A2-K7L4".to_string(),
        fingerprint: "SHA256:4a8b7c9d0e1f2a3b4c5d6e7f8a9b0c1d".to_string(),
    }
}
