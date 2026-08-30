import {
  FileTransferMetadata,
  FileTransferProgress,
  FileTransferMessage,
  FileTransferRequestMessage,
  FileTransferAcceptMessage,
  FileTransferRejectMessage,
  FileTransferChunkMessage,
  FileTransferChunkAckMessage,
  FileTransferPauseMessage,
  FileTransferResumeMessage,
  FileTransferCancelMessage,
  FileTransferCompleteMessage,
  FileTransferErrorMessage,
  SessionPermission,
  TransferErrorCode,
  TransferStatus,
  FileTransferTelemetrySnapshot,
} from "@nexusdesk/types";
import { PathSanitizer } from "./path-sanitizer";
import { ChunkPipeline } from "./chunk-pipeline";

export interface FileTransferSender {
  sendFileMessage(message: FileTransferMessage): void;
  getBufferedAmount?(): number;
}

export type FileTransferEventHandler = (event: { type: string; data: unknown }) => void;

interface ActiveTransferState {
  metadata: FileTransferMetadata;
  direction: "UPLOAD" | "DOWNLOAD";
  status: TransferStatus;
  bytesTransferred: number;
  chunksTransferred: number;
  highestContiguousChunk: number;
  receivedChunks: Map<number, Uint8Array>;
  startTime: number;
  lastProgressTime: number;
  lastBytesTransferred: number;
  speedBytesPerSec: number;
  destinationPath?: string;
  sanitizedFileName: string;
  isPaused: boolean;
  error?: string;
}

export class FileTransferManager {
  private sender: FileTransferSender | null = null;
  private permissions = new Set<SessionPermission>();
  private activeTransfers = new Map<string, ActiveTransferState>();

  private highWaterMark = 4 * 1024 * 1024; // 4 MiB
  private totalBytesTransferred = 0;
  private completedCount = 0;
  private failedCount = 0;

  private handlers = new Map<string, Set<FileTransferEventHandler>>();

  constructor(grantedPermissions: SessionPermission[] = []) {
    this.setPermissions(grantedPermissions);
  }

  public setSender(sender: FileTransferSender): void {
    this.sender = sender;
  }

  public setPermissions(permissions: SessionPermission[]): void {
    this.permissions = new Set(permissions);

    // If FILE_READ revoked, cancel active uploads
    if (!this.permissions.has("FILE_READ")) {
      for (const [id, t] of this.activeTransfers.entries()) {
        if (t.direction === "UPLOAD" && t.status === "TRANSFERRING") {
          this.cancelTransfer(id, "FILE_ACCESS_DENIED");
        }
      }
    }

    // If FILE_WRITE revoked, cancel active downloads
    if (!this.permissions.has("FILE_WRITE")) {
      for (const [id, t] of this.activeTransfers.entries()) {
        if (t.direction === "DOWNLOAD" && t.status === "TRANSFERRING") {
          this.cancelTransfer(id, "DESTINATION_DENIED");
        }
      }
    }
  }

  public async initiateUpload(
    transferId: string,
    sessionId: string,
    senderDeviceId: string,
    receiverDeviceId: string,
    fileName: string,
    fileBuffer: ArrayBuffer | Uint8Array,
    mimeType = "application/octet-stream",
    chunkSize = 1024 * 1024,
  ): Promise<FileTransferProgress | null> {
    if (!this.permissions.has("FILE_READ")) {
      this.emit("transfer_error", { transferId, code: "FILE_ACCESS_DENIED" });
      return null;
    }

    if (PathSanitizer.isPathTraversalAttempt(fileName)) {
      this.emit("transfer_error", { transferId, code: "PATH_TRAVERSAL_DETECTED" });
      return null;
    }

    const sanitizedName = PathSanitizer.sanitizeFileName(fileName);
    const u8Buffer = new Uint8Array(fileBuffer as ArrayBuffer);
    const fileSize = u8Buffer.byteLength;
    const totalChunks = ChunkPipeline.calculateTotalChunks(fileSize, chunkSize);
    const sha256 = await ChunkPipeline.computeSha256Hex(u8Buffer);

    const metadata: FileTransferMetadata = {
      transferId,
      sessionId,
      senderDeviceId,
      receiverDeviceId,
      fileName: sanitizedName,
      fileSize,
      mimeType,
      sha256,
      chunkSize,
      totalChunks,
    };

    const transfer: ActiveTransferState = {
      metadata,
      direction: "UPLOAD",
      status: "PENDING",
      bytesTransferred: 0,
      chunksTransferred: 0,
      highestContiguousChunk: -1,
      receivedChunks: new Map(),
      startTime: Date.now(),
      lastProgressTime: Date.now(),
      lastBytesTransferred: 0,
      speedBytesPerSec: 0,
      sanitizedFileName: sanitizedName,
      isPaused: false,
    };

    // Store chunks for transmission
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      transfer.receivedChunks.set(i, u8Buffer.slice(start, end));
    }

    this.activeTransfers.set(transferId, transfer);

    // Send file.request
    const requestMsg: FileTransferRequestMessage = {
      type: "file.request",
      transferId,
      sessionId,
      fileName: sanitizedName,
      fileSize,
      mimeType,
      sha256,
      chunkSize,
      totalChunks,
      timestamp: Date.now(),
    };

    this.emitMessage(requestMsg);
    this.emit("transfer_started", { transferId, metadata });
    return this.getProgress(transferId);
  }

  public async handleIncomingMessage(msg: FileTransferMessage): Promise<void> {
    switch (msg.type) {
      case "file.request":
        this.handleFileRequest(msg);
        break;
      case "file.accept":
        this.handleFileAccept(msg);
        break;
      case "file.reject":
        this.handleFileReject(msg);
        break;
      case "file.chunk":
        await this.handleFileChunk(msg);
        break;
      case "file.chunk_ack":
        this.handleChunkAck(msg);
        break;
      case "file.pause":
        this.handleFilePause(msg);
        break;
      case "file.resume":
        this.handleFileResume(msg);
        break;
      case "file.cancel":
        this.handleFileCancel(msg);
        break;
      case "file.complete":
        this.handleFileComplete(msg);
        break;
      case "file.error":
        this.handleFileError(msg);
        break;
    }
  }

  public acceptIncomingTransfer(transferId: string, destinationPath?: string): boolean {
    if (!this.permissions.has("FILE_WRITE")) {
      this.rejectIncomingTransfer(transferId, "DESTINATION_DENIED");
      return false;
    }

    const transfer = this.activeTransfers.get(transferId);
    if (!transfer || transfer.status !== "PENDING") {
      return false;
    }

    transfer.status = "TRANSFERRING";
    transfer.destinationPath = destinationPath;

    const acceptMsg: FileTransferAcceptMessage = {
      type: "file.accept",
      transferId,
      sessionId: transfer.metadata.sessionId,
      destinationPath,
      startChunkIndex: 0,
      timestamp: Date.now(),
    };

    this.emitMessage(acceptMsg);
    this.emit("transfer_accepted", { transferId });
    return true;
  }

  public rejectIncomingTransfer(
    transferId: string,
    reason: TransferErrorCode = "DESTINATION_DENIED",
  ): void {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer) {
      transfer.status = "REJECTED";
      this.failedCount++;
    }

    const rejectMsg: FileTransferRejectMessage = {
      type: "file.reject",
      transferId,
      sessionId: transfer?.metadata.sessionId || "",
      reason,
      timestamp: Date.now(),
    };

    this.emitMessage(rejectMsg);
    this.emit("transfer_rejected", { transferId, reason });
  }

  public pauseTransfer(transferId: string): void {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer && (transfer.status === "TRANSFERRING" || transfer.status === "PENDING")) {
      transfer.status = "PAUSED";
      transfer.isPaused = true;

      const msg: FileTransferPauseMessage = {
        type: "file.pause",
        transferId,
        timestamp: Date.now(),
      };
      this.emitMessage(msg);
      this.emit("transfer_paused", { transferId });
    }
  }

  public resumeTransfer(transferId: string): void {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer && transfer.status === "PAUSED") {
      transfer.status = "TRANSFERRING";
      transfer.isPaused = false;

      const fromChunk = Math.max(0, transfer.highestContiguousChunk + 1);
      const msg: FileTransferResumeMessage = {
        type: "file.resume",
        transferId,
        fromChunkIndex: fromChunk,
        timestamp: Date.now(),
      };
      this.emitMessage(msg);

      if (transfer.direction === "UPLOAD") {
        this.streamChunksFrom(transferId, fromChunk);
      }
      this.emit("transfer_resumed", { transferId, fromChunk });
    }
  }

  public cancelTransfer(
    transferId: string,
    reason: TransferErrorCode = "TRANSFER_CANCELLED",
  ): void {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer) {
      transfer.status = "CANCELLED";
      transfer.error = reason;
      transfer.receivedChunks.clear();
      this.failedCount++;

      const msg: FileTransferCancelMessage = {
        type: "file.cancel",
        transferId,
        reason,
        timestamp: Date.now(),
      };
      this.emitMessage(msg);
      this.emit("transfer_cancelled", { transferId, reason });
    }
  }

  public emergencyStopAll(): void {
    for (const [id, t] of this.activeTransfers.entries()) {
      if (t.status === "TRANSFERRING" || t.status === "PAUSED" || t.status === "PENDING") {
        this.cancelTransfer(id, "TRANSFER_CANCELLED");
      }
    }
  }

  public getProgress(transferId: string): FileTransferProgress | null {
    const t = this.activeTransfers.get(transferId);
    if (!t) return null;

    const progressPercent =
      t.metadata.fileSize > 0
        ? Number(((t.bytesTransferred / t.metadata.fileSize) * 100).toFixed(1))
        : 100;

    const remainingBytes = Math.max(0, t.metadata.fileSize - t.bytesTransferred);
    const etaSeconds = t.speedBytesPerSec > 0 ? Math.ceil(remainingBytes / t.speedBytesPerSec) : 0;

    return {
      transferId,
      fileName: t.sanitizedFileName,
      fileSize: t.metadata.fileSize,
      direction: t.direction,
      status: t.status,
      bytesTransferred: t.bytesTransferred,
      chunksTransferred: t.chunksTransferred,
      totalChunks: t.metadata.totalChunks,
      progressPercent,
      speedBytesPerSec: t.speedBytesPerSec,
      etaSeconds,
      sha256: t.metadata.sha256,
      error: t.error,
    };
  }

  public getAllTransfers(): FileTransferProgress[] {
    const list: FileTransferProgress[] = [];
    for (const id of this.activeTransfers.keys()) {
      const p = this.getProgress(id);
      if (p) list.push(p);
    }
    return list;
  }

  public getTelemetry(): FileTransferTelemetrySnapshot {
    let active = 0;
    for (const t of this.activeTransfers.values()) {
      if (t.status === "TRANSFERRING") active++;
    }
    return {
      activeTransfers: active,
      bytesTransferredTotal: this.totalBytesTransferred,
      transferSpeedMbps: Number(((this.calculateTotalSpeed() * 8) / 1_000_000).toFixed(2)),
      queueDepth: this.activeTransfers.size,
      completedTransfers: this.completedCount,
      failedTransfers: this.failedCount,
    };
  }

  public on(event: string, handler: FileTransferEventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  private handleFileRequest(msg: FileTransferRequestMessage): void {
    if (PathSanitizer.isPathTraversalAttempt(msg.fileName)) {
      const reject: FileTransferRejectMessage = {
        type: "file.reject",
        transferId: msg.transferId,
        sessionId: msg.sessionId,
        reason: "PATH_TRAVERSAL_DETECTED",
        timestamp: Date.now(),
      };
      this.emitMessage(reject);
      return;
    }

    const sanitizedName = PathSanitizer.sanitizeFileName(msg.fileName);
    const metadata: FileTransferMetadata = {
      transferId: msg.transferId,
      sessionId: msg.sessionId,
      senderDeviceId: "remote_peer",
      receiverDeviceId: "local_device",
      fileName: sanitizedName,
      fileSize: msg.fileSize,
      mimeType: msg.mimeType,
      sha256: msg.sha256,
      chunkSize: msg.chunkSize,
      totalChunks: msg.totalChunks,
    };

    const transfer: ActiveTransferState = {
      metadata,
      direction: "DOWNLOAD",
      status: "PENDING",
      bytesTransferred: 0,
      chunksTransferred: 0,
      highestContiguousChunk: -1,
      receivedChunks: new Map(),
      startTime: Date.now(),
      lastProgressTime: Date.now(),
      lastBytesTransferred: 0,
      speedBytesPerSec: 0,
      sanitizedFileName: sanitizedName,
      isPaused: false,
    };

    this.activeTransfers.set(msg.transferId, transfer);
    this.emit("incoming_transfer_request", { transferId: msg.transferId, metadata });
  }

  private handleFileAccept(msg: FileTransferAcceptMessage): void {
    const transfer = this.activeTransfers.get(msg.transferId);
    if (!transfer || transfer.direction !== "UPLOAD") return;

    transfer.status = "TRANSFERRING";
    this.emit("transfer_accepted_by_remote", { transferId: msg.transferId });
    this.streamChunksFrom(msg.transferId, msg.startChunkIndex || 0);
  }

  private handleFileReject(msg: FileTransferRejectMessage): void {
    const transfer = this.activeTransfers.get(msg.transferId);
    if (transfer) {
      transfer.status = "REJECTED";
      transfer.error = msg.reason;
      this.failedCount++;
    }
    this.emit("transfer_rejected_by_remote", { transferId: msg.transferId, reason: msg.reason });
  }

  private async handleFileChunk(msg: FileTransferChunkMessage): Promise<void> {
    const transfer = this.activeTransfers.get(msg.transferId);
    if (!transfer || transfer.direction !== "DOWNLOAD" || transfer.status !== "TRANSFERRING")
      return;

    const chunkBytes = ChunkPipeline.base64ToArrayBuffer(msg.data);
    transfer.receivedChunks.set(msg.chunkIndex, chunkBytes);
    transfer.bytesTransferred += chunkBytes.byteLength;
    transfer.chunksTransferred++;
    this.totalBytesTransferred += chunkBytes.byteLength;

    // Update speed
    this.updateSpeed(transfer);

    // Calculate highest contiguous chunk
    while (transfer.receivedChunks.has(transfer.highestContiguousChunk + 1)) {
      transfer.highestContiguousChunk++;
    }

    // Send chunk ack
    const ack: FileTransferChunkAckMessage = {
      type: "file.chunk_ack",
      transferId: msg.transferId,
      highestContiguousChunk: transfer.highestContiguousChunk,
      bytesReceived: transfer.bytesTransferred,
      timestamp: Date.now(),
    };
    this.emitMessage(ack);

    // If all chunks received, verify hash
    if (transfer.highestContiguousChunk === transfer.metadata.totalChunks - 1) {
      await this.finalizeDownload(transfer);
    }
  }

  private handleChunkAck(msg: FileTransferChunkAckMessage): void {
    const transfer = this.activeTransfers.get(msg.transferId);
    if (!transfer || transfer.direction !== "UPLOAD") return;

    transfer.highestContiguousChunk = msg.highestContiguousChunk;
    transfer.bytesTransferred = msg.bytesReceived;
    transfer.chunksTransferred = msg.highestContiguousChunk + 1;
    this.updateSpeed(transfer);
  }

  private handleFilePause(msg: FileTransferPauseMessage): void {
    const transfer = this.activeTransfers.get(msg.transferId);
    if (transfer) {
      transfer.status = "PAUSED";
      transfer.isPaused = true;
      this.emit("transfer_paused", { transferId: msg.transferId });
    }
  }

  private handleFileResume(msg: FileTransferResumeMessage): void {
    const transfer = this.activeTransfers.get(msg.transferId);
    if (transfer) {
      transfer.status = "TRANSFERRING";
      transfer.isPaused = false;
      if (transfer.direction === "UPLOAD") {
        this.streamChunksFrom(msg.transferId, msg.fromChunkIndex);
      }
      this.emit("transfer_resumed", { transferId: msg.transferId, fromChunk: msg.fromChunkIndex });
    }
  }

  private handleFileCancel(msg: FileTransferCancelMessage): void {
    const transfer = this.activeTransfers.get(msg.transferId);
    if (transfer) {
      transfer.status = "CANCELLED";
      transfer.error = msg.reason;
      transfer.receivedChunks.clear();
      this.failedCount++;
      this.emit("transfer_cancelled", { transferId: msg.transferId, reason: msg.reason });
    }
  }

  private handleFileComplete(msg: FileTransferCompleteMessage): void {
    const transfer = this.activeTransfers.get(msg.transferId);
    if (transfer) {
      transfer.status = "COMPLETED";
      this.completedCount++;
      this.emit("transfer_completed", { transferId: msg.transferId });
    }
  }

  private handleFileError(msg: FileTransferErrorMessage): void {
    const transfer = this.activeTransfers.get(msg.transferId);
    if (transfer) {
      transfer.status = "FAILED";
      transfer.error = msg.message;
      this.failedCount++;
      this.emit("transfer_error", {
        transferId: msg.transferId,
        code: msg.code,
        error: msg.message,
      });
    }
  }

  private async finalizeDownload(transfer: ActiveTransferState): Promise<void> {
    transfer.status = "VERIFYING";

    // Combine all chunks to compute whole-file hash
    const fullBuffer = new Uint8Array(transfer.metadata.fileSize);
    let offset = 0;
    for (let i = 0; i < transfer.metadata.totalChunks; i++) {
      const chunk = transfer.receivedChunks.get(i);
      if (chunk) {
        fullBuffer.set(chunk, offset);
        offset += chunk.byteLength;
      }
    }

    const calculatedSha256 = await ChunkPipeline.computeSha256Hex(fullBuffer);

    if (calculatedSha256.toLowerCase() !== transfer.metadata.sha256.toLowerCase()) {
      transfer.status = "FAILED";
      transfer.error = "FILE_HASH_MISMATCH";
      this.failedCount++;

      const errMsg: FileTransferErrorMessage = {
        type: "file.error",
        transferId: transfer.metadata.transferId,
        code: "FILE_HASH_MISMATCH",
        message: "Whole-file SHA-256 verification failed",
        timestamp: Date.now(),
      };
      this.emitMessage(errMsg);
      this.emit("transfer_error", {
        transferId: transfer.metadata.transferId,
        code: "FILE_HASH_MISMATCH",
      });
      return;
    }

    // Atomic completion
    transfer.status = "COMPLETED";
    this.completedCount++;

    const completeMsg: FileTransferCompleteMessage = {
      type: "file.complete",
      transferId: transfer.metadata.transferId,
      sha256: calculatedSha256,
      bytesTotal: transfer.bytesTransferred,
      timestamp: Date.now(),
    };
    this.emitMessage(completeMsg);
    this.emit("transfer_completed", {
      transferId: transfer.metadata.transferId,
      sha256: calculatedSha256,
    });
  }

  private async streamChunksFrom(transferId: string, startIndex: number): Promise<void> {
    const transfer = this.activeTransfers.get(transferId);
    if (!transfer || transfer.direction !== "UPLOAD") return;

    for (let i = startIndex; i < transfer.metadata.totalChunks; i++) {
      if (transfer.status !== "TRANSFERRING" || transfer.isPaused) break;

      // Flow control: check dataChannel buffered amount
      if (this.sender?.getBufferedAmount && this.sender.getBufferedAmount() > this.highWaterMark) {
        await new Promise((r) => setTimeout(r, 50));
      }

      const chunk = transfer.receivedChunks.get(i);
      if (chunk) {
        const base64Data = ChunkPipeline.arrayBufferToBase64(chunk);
        const chunkMsg: FileTransferChunkMessage = {
          type: "file.chunk",
          transferId,
          chunkIndex: i,
          offset: i * transfer.metadata.chunkSize,
          length: chunk.byteLength,
          data: base64Data,
          timestamp: Date.now(),
        };

        this.emitMessage(chunkMsg);
        transfer.bytesTransferred += chunk.byteLength;
        transfer.chunksTransferred++;
        this.totalBytesTransferred += chunk.byteLength;
        this.updateSpeed(transfer);
      }
    }
  }

  private updateSpeed(transfer: ActiveTransferState): void {
    const now = Date.now();
    const elapsed = (now - transfer.lastProgressTime) / 1000;
    if (elapsed >= 0.5) {
      const deltaBytes = transfer.bytesTransferred - transfer.lastBytesTransferred;
      transfer.speedBytesPerSec = Math.round(deltaBytes / elapsed);
      transfer.lastBytesTransferred = transfer.bytesTransferred;
      transfer.lastProgressTime = now;
      this.emit("transfer_progress", {
        transferId: transfer.metadata.transferId,
        progress: this.getProgress(transfer.metadata.transferId),
      });
    }
  }

  private calculateTotalSpeed(): number {
    let speed = 0;
    for (const t of this.activeTransfers.values()) {
      if (t.status === "TRANSFERRING") speed += t.speedBytesPerSec;
    }
    return speed;
  }

  private emitMessage(msg: FileTransferMessage): void {
    if (this.sender) {
      this.sender.sendFileMessage(msg);
    }
  }

  private emit(type: string, data: unknown): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        handler({ type, data });
      }
    }
  }
}
