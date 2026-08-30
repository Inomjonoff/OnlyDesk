//! NexusDesk Native File Transfer Subsystem
//!
//! Provides streaming chunk I/O, SHA-256 validation, temporary file (.part)
//! management, and atomic rename finalization.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub transfer_id: String,
    pub file_name: String,
    pub file_size: u64,
    pub chunk_size: u32,
    pub total_chunks: u32,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkData {
    pub transfer_id: String,
    pub chunk_index: u32,
    pub offset: u64,
    pub length: u32,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransferError {
    FileNotFound,
    AccessDenied,
    FileTooLarge,
    DiskSpaceLow,
    PathTraversalDetected,
    HashMismatch,
    IoError(String),
}

pub trait FileTransferEngine {
    fn read_chunk(&self, transfer_id: &str, chunk_index: u32) -> Result<ChunkData, TransferError>;
    fn write_chunk(&self, chunk: ChunkData) -> Result<(), TransferError>;
    fn verify_and_finalize(&self, transfer_id: &str, expected_sha256: &str) -> Result<String, TransferError>;
    fn cancel_and_cleanup(&self, transfer_id: &str) -> Result<(), TransferError>;
}
