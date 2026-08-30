import { SessionPermission } from "./permission";
import { SessionStatus, SessionEndReason } from "./session";
import { AiActionProposal, AiActionStatus, AiToolResult, AiRiskLevel } from "./ai";

export const PROTOCOL_VERSION = 1;

export type ChannelType = "control" | "input" | "clipboard" | "file" | "telemetry" | "chat";

export type RTCConnectionState =
  "NEW" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "FAILED" | "CLOSED";
export type ICEConnectionState =
  "NEW" | "CHECKING" | "CONNECTED" | "COMPLETED" | "DISCONNECTED" | "FAILED" | "CLOSED";
export type DataChannelState = "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED";

export type ConnectionQuality = "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "FAILED";
export type CandidateTransportType = "DIRECT" | "RELAY" | "UNKNOWN";

export type CaptureState = "STOPPED" | "STARTING" | "RUNNING" | "PAUSED" | "STOPPING" | "FAILED";
export type VideoTrackState =
  "CREATED" | "STARTING" | "LIVE" | "PAUSED" | "STOPPING" | "ENDED" | "FAILED";
export type VideoCodec = "H264" | "VP8" | "VP9" | "AV1";
export type NetworkDegradationState =
  "STABLE" | "DEGRADED" | "SEVERELY_DEGRADED" | "RECOVERING" | "FAILED";

export type InputState = "DISABLED" | "ENABLED" | "PAUSED" | "STOPPING" | "FAILED";
export type MouseButtonType = "LEFT" | "RIGHT" | "MIDDLE" | "X1" | "X2";
export type ButtonActionType = "DOWN" | "UP" | "CLICK" | "DOUBLE_CLICK";
export type ViewerScalingMode = "contain" | "cover" | "fit" | "100%";

export type TransferStatus =
  | "PENDING"
  | "NEGOTIATING"
  | "TRANSFERRING"
  | "PAUSED"
  | "VERIFYING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED"
  | "EXPIRED"
  | "REJECTED";

export type TransferDirection = "UPLOAD" | "DOWNLOAD";

export type TransferErrorCode =
  | "FILE_NOT_FOUND"
  | "FILE_ACCESS_DENIED"
  | "FILE_TOO_LARGE"
  | "DISK_SPACE_LOW"
  | "DESTINATION_DENIED"
  | "TRANSFER_NOT_FOUND"
  | "TRANSFER_FORBIDDEN"
  | "TRANSFER_EXPIRED"
  | "TRANSFER_CANCELLED"
  | "TRANSFER_TIMEOUT"
  | "CHUNK_INVALID"
  | "CHUNK_HASH_MISMATCH"
  | "FILE_HASH_MISMATCH"
  | "CHANNEL_UNAVAILABLE"
  | "BUFFER_OVERFLOW"
  | "STORAGE_ERROR"
  | "PATH_TRAVERSAL_DETECTED";

export type ClipboardType = "TEXT" | "IMAGE";
export type ClipboardSyncMode = "OFF" | "ASK" | "ON";

export type ChatMessageType = "TEXT" | "SYSTEM" | "FILE_REFERENCE" | "RECORDING_EVENT";
export type ChatDeliveryState = "DRAFT" | "SENDING" | "SENT" | "DELIVERED" | "FAILED";

export type RecordingStatus =
  | "REQUESTED"
  | "CONSENT_PENDING"
  | "STARTING"
  | "RECORDING"
  | "STOPPING"
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "DELETED";

export type RecordingConsentState = "PENDING" | "GRANTED" | "REJECTED";

export type SessionTimelineEventType =
  | "SESSION_CREATED"
  | "SESSION_APPROVED"
  | "SCREEN_STARTED"
  | "SCREEN_STOPPED"
  | "INPUT_ENABLED"
  | "INPUT_DISABLED"
  | "FILE_STARTED"
  | "FILE_COMPLETED"
  | "CHAT_MESSAGE"
  | "RECORDING_STARTED"
  | "RECORDING_STOPPED"
  | "SESSION_ENDED";

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  scaleFactor: number;
  primary: boolean;
  refreshRate?: number;
}

export interface CaptureOptions {
  displayId: string;
  maxFps: number;
  maxWidth?: number;
  maxHeight?: number;
  cursor: boolean;
  preferHardwareEncoding?: boolean;
}

export interface StreamingMetrics {
  captureFps: number;
  encodeFps: number;
  sendFps: number;
  receiveFps: number;
  renderFps: number;
  bitrateKbps: number;
  width: number;
  height: number;
  codec: VideoCodec;
  keyframes: number;
  framesDropped: number;
  rttMs: number;
}

export interface InputTelemetrySnapshot {
  mouseEventsPerSec: number;
  keyboardEventsPerSec: number;
  droppedInputEvents: number;
  rejectedInputEvents: number;
  inputLatencyMs: number;
}

export interface FileTransferMetadata {
  transferId: string;
  sessionId: string;
  senderDeviceId: string;
  receiverDeviceId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256: string;
  chunkSize: number;
  totalChunks: number;
}

export interface FileTransferProgress {
  transferId: string;
  fileName: string;
  fileSize: number;
  direction: TransferDirection;
  status: TransferStatus;
  bytesTransferred: number;
  chunksTransferred: number;
  totalChunks: number;
  progressPercent: number;
  speedBytesPerSec: number;
  etaSeconds: number;
  sha256: string;
  error?: string;
}

export interface FileTransferTelemetrySnapshot {
  activeTransfers: number;
  bytesTransferredTotal: number;
  transferSpeedMbps: number;
  queueDepth: number;
  completedTransfers: number;
  failedTransfers: number;
}

export interface ClipboardTelemetrySnapshot {
  clipboardUpdatesSent: number;
  clipboardUpdatesReceived: number;
  clipboardUpdatesRejected: number;
  lastSyncTimestamp: number;
}

// Chat Model
export interface ChatMessagePayload {
  messageId: string;
  sessionId: string;
  senderUserId: string;
  senderDeviceId: string;
  senderName: string;
  type: ChatMessageType;
  text: string;
  sequence: number;
  timestamp: number;
  deliveryState?: ChatDeliveryState;
}

export interface ChatAckPayload {
  messageId: string;
  sequence: number;
  receivedTimestamp: number;
}

// Recording Model
export interface RecordingMetadata {
  recordingId: string;
  sessionId: string;
  startedByUserId: string;
  startedByDeviceId: string;
  status: RecordingStatus;
  consentState: RecordingConsentState;
  displayId?: string;
  codec: VideoCodec;
  container: string;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  fileSize: number;
  storageKey?: string;
  sha256?: string;
  playbackUrl?: string;
  startedAt: number;
  stoppedAt?: number;
  expiresAt?: string;
}

// Session Timeline Event
export interface SessionTimelineEvent {
  eventId: string;
  sessionId: string;
  type: SessionTimelineEventType;
  title: string;
  description?: string;
  actor?: string;
  timestamp: number;
  relativePlaybackMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ProtocolHeader {
  version: number;
  sequence: number;
  timestamp: number;
  sessionId: string;
}

export interface SignalingEventEnvelope<T = unknown> {
  version: number;
  eventId: string;
  type: string;
  timestamp: number;
  sessionId?: string;
  sequence?: number;
  sender?: {
    userId?: string;
    deviceId?: string;
  };
  payload: T;
}

export type SignalingMessageType =
  | "connection.authenticate"
  | "connection.authenticated"
  | "connection.error"
  | "session.request"
  | "session.requested"
  | "session.accept"
  | "session.accepted"
  | "session.reject"
  | "session.rejected"
  | "session.cancel"
  | "session.cancelled"
  | "session.expired"
  | "session.negotiating"
  | "session.ready"
  | "session.end"
  | "session.ended"
  | "session.subscribe"
  | "session.subscribed"
  | "rtc.offer"
  | "rtc.answer"
  | "rtc.ice_candidate"
  | "rtc.restart"
  | "rtc.connected"
  | "rtc.failed"
  | "rtc.video_track_added"
  | "rtc.keyframe_request"
  | "input.mouse.move"
  | "input.mouse.button"
  | "input.mouse.wheel"
  | "input.keyboard"
  | "input.release_all"
  | "input.emergency_stop"
  | "file.request"
  | "file.accept"
  | "file.reject"
  | "file.start"
  | "file.chunk"
  | "file.chunk_ack"
  | "file.pause"
  | "file.resume"
  | "file.cancel"
  | "file.complete"
  | "file.error"
  | "clipboard.update"
  | "clipboard.ack"
  | "chat.message"
  | "chat.ack"
  | "recording.request"
  | "recording.consent"
  | "recording.start"
  | "recording.stop"
  | "recording.status"
  | "ai.proposal"
  | "ai.approval"
  | "ai.rejection"
  | "ai.action"
  | "ai.result"
  | "ai.stop"
  | "heartbeat"
  | "heartbeat.ack";

export interface SessionRequestPayload {
  targetDeviceId: string;
  requestedPermissions: SessionPermission[];
  initiatorName?: string;
  initiatorDeviceName?: string;
}

export interface SessionRequestedPayload {
  sessionId: string;
  initiatorUserId: string;
  initiatorDeviceId: string;
  initiatorName?: string;
  initiatorDeviceName?: string;
  requestedPermissions: SessionPermission[];
  expiresAt: string;
}

export interface SessionAcceptPayload {
  sessionId: string;
  grantedPermissions: SessionPermission[];
}

export interface SessionAcceptedPayload {
  sessionId: string;
  grantedPermissions: SessionPermission[];
  status: SessionStatus;
}

export interface SessionRejectPayload {
  sessionId: string;
  reason?: SessionEndReason;
}

export interface SessionCancelPayload {
  sessionId: string;
}

export interface SessionEndPayload {
  sessionId: string;
  reason?: SessionEndReason;
}

export interface RtcOfferPayload {
  sessionId: string;
  sdp: string;
}

export interface RtcAnswerPayload {
  sessionId: string;
  sdp: string;
}

export interface RtcIceCandidatePayload {
  sessionId: string;
  candidate: {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
  };
}

export interface RTCIceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface RTCSessionConfig {
  sessionId: string;
  iceServers: RTCIceServerConfig[];
  iceTransportPolicy: "all" | "relay";
  expiresAt: string;
}

export interface RTCCandidatePairInfo {
  localCandidateType: string;
  remoteCandidateType: string;
  transportType: CandidateTransportType;
  localAddress?: string;
  remoteAddress?: string;
}

export interface RTCTelemetrySnapshot {
  sessionId: string;
  timestamp: number;
  connectionState: RTCConnectionState;
  iceState: ICEConnectionState;
  dataChannelState: DataChannelState;
  rttMs: number;
  quality: ConnectionQuality;
  candidatePair?: RTCCandidatePairInfo;
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
  packetsLost: number;
}

export interface InputMouseMoveEvent {
  type: "input.mouse.move";
  sequence: number;
  timestamp: number;
  x: number;
  y: number;
  displayId?: string;
}

export interface InputMouseButtonEvent {
  type: "input.mouse.button";
  sequence: number;
  timestamp: number;
  button: MouseButtonType;
  action: ButtonActionType;
  x: number;
  y: number;
  displayId?: string;
}

export interface InputMouseWheelEvent {
  type: "input.mouse.wheel";
  sequence: number;
  timestamp: number;
  deltaX: number;
  deltaY: number;
  x: number;
  y: number;
}

export interface InputKeyboardEvent {
  type: "input.keyboard";
  sequence: number;
  timestamp: number;
  code: string;
  key: string;
  action: "DOWN" | "UP";
  repeat?: boolean;
  modifiers: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
}

export interface InputReleaseAllEvent {
  type: "input.release_all";
  sequence: number;
  timestamp: number;
}

export interface InputEmergencyStopEvent {
  type: "input.emergency_stop";
  sequence: number;
  timestamp: number;
}

export type InputEventMessage =
  | InputMouseMoveEvent
  | InputMouseButtonEvent
  | InputMouseWheelEvent
  | InputKeyboardEvent
  | InputReleaseAllEvent
  | InputEmergencyStopEvent;

// File Transfer Messages
export interface FileTransferRequestMessage {
  type: "file.request";
  transferId: string;
  sessionId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256: string;
  chunkSize: number;
  totalChunks: number;
  timestamp: number;
}

export interface FileTransferAcceptMessage {
  type: "file.accept";
  transferId: string;
  sessionId: string;
  destinationPath?: string;
  startChunkIndex?: number;
  timestamp: number;
}

export interface FileTransferRejectMessage {
  type: "file.reject";
  transferId: string;
  sessionId: string;
  reason: TransferErrorCode;
  timestamp: number;
}

export interface FileTransferStartMessage {
  type: "file.start";
  transferId: string;
  startChunkIndex: number;
  timestamp: number;
}

export interface FileTransferChunkMessage {
  type: "file.chunk";
  transferId: string;
  chunkIndex: number;
  offset: number;
  length: number;
  chunkSha256?: string;
  data: string;
  timestamp: number;
}

export interface FileTransferChunkAckMessage {
  type: "file.chunk_ack";
  transferId: string;
  highestContiguousChunk: number;
  bytesReceived: number;
  timestamp: number;
}

export interface FileTransferPauseMessage {
  type: "file.pause";
  transferId: string;
  reason?: string;
  timestamp: number;
}

export interface FileTransferResumeMessage {
  type: "file.resume";
  transferId: string;
  fromChunkIndex: number;
  timestamp: number;
}

export interface FileTransferCancelMessage {
  type: "file.cancel";
  transferId: string;
  reason: TransferErrorCode;
  timestamp: number;
}

export interface FileTransferCompleteMessage {
  type: "file.complete";
  transferId: string;
  sha256: string;
  bytesTotal: number;
  timestamp: number;
}

export interface FileTransferErrorMessage {
  type: "file.error";
  transferId: string;
  code: TransferErrorCode;
  message: string;
  timestamp: number;
}

export type FileTransferMessage =
  | FileTransferRequestMessage
  | FileTransferAcceptMessage
  | FileTransferRejectMessage
  | FileTransferStartMessage
  | FileTransferChunkMessage
  | FileTransferChunkAckMessage
  | FileTransferPauseMessage
  | FileTransferResumeMessage
  | FileTransferCancelMessage
  | FileTransferCompleteMessage
  | FileTransferErrorMessage;

// Clipboard Sync Messages
export interface ClipboardUpdateMessage {
  type: "clipboard.update";
  clipboardId: string;
  originDeviceId: string;
  sequence: number;
  clipboardType: ClipboardType;
  content: string;
  sha256: string;
  sizeBytes: number;
  timestamp: number;
}

export interface ClipboardAckMessage {
  type: "clipboard.ack";
  clipboardId: string;
  sequence: number;
  applied: boolean;
  timestamp: number;
}

export type ClipboardMessage = ClipboardUpdateMessage | ClipboardAckMessage;

// Chat Messages
export interface ChatSendMessage {
  type: "chat.message";
  payload: ChatMessagePayload;
}

export interface ChatAckMessage {
  type: "chat.ack";
  payload: ChatAckPayload;
}

export type ChatProtocolMessage = ChatSendMessage | ChatAckMessage;

// Recording Messages
export interface RecordingRequestMessage {
  type: "recording.request";
  recordingId: string;
  sessionId: string;
  requesterUserId: string;
  timestamp: number;
}

export interface RecordingConsentMessage {
  type: "recording.consent";
  recordingId: string;
  sessionId: string;
  granted: boolean;
  timestamp: number;
}

export interface RecordingStartMessage {
  type: "recording.start";
  recordingId: string;
  sessionId: string;
  timestamp: number;
}

export interface RecordingStopMessage {
  type: "recording.stop";
  recordingId: string;
  sessionId: string;
  timestamp: number;
}

export interface RecordingStatusMessage {
  type: "recording.status";
  recordingId: string;
  status: RecordingStatus;
  durationMs: number;
  timestamp: number;
}

export type RecordingProtocolMessage =
  | RecordingRequestMessage
  | RecordingConsentMessage
  | RecordingStartMessage
  | RecordingStopMessage
  | RecordingStatusMessage;

// AI Protocol Messages
export interface AiProposalMessage {
  type: "ai.proposal";
  sessionId: string;
  proposal: AiActionProposal;
  timestamp: number;
}

export interface AiApprovalMessage {
  type: "ai.approval";
  proposalId: string;
  sessionId: string;
  approved: boolean;
  reason?: string;
  timestamp: number;
}

export interface AiActionMessage {
  type: "ai.action";
  actionId: string;
  proposalId: string;
  sessionId: string;
  tool: string;
  status: AiActionStatus;
  risk: AiRiskLevel;
  timestamp: number;
}

export interface AiResultMessage {
  type: "ai.result";
  actionId: string;
  sessionId: string;
  result: AiToolResult;
  timestamp: number;
}

export interface AiStopMessage {
  type: "ai.stop";
  sessionId: string;
  reason: string;
  timestamp: number;
}

export type AiProtocolMessage =
  AiProposalMessage | AiApprovalMessage | AiActionMessage | AiResultMessage | AiStopMessage;

export type ControlMessage =
  | {
      type: "session.request";
      sessionId: string;
      requesterDeviceId: string;
      permissions: SessionPermission[];
    }
  | { type: "session.approved"; sessionId: string; grantedPermissions: SessionPermission[] }
  | { type: "session.rejected"; sessionId: string; reason: string }
  | { type: "session.status"; sessionId: string; status: SessionStatus }
  | { type: "session.ended"; sessionId: string; reason?: string }
  | { type: "permission.change"; permission: SessionPermission; granted: boolean }
  | { type: "control.ping"; sequence: number; timestamp: number }
  | { type: "control.pong"; sequence: number; originalTimestamp: number; receivedTimestamp: number }
  | { type: "control.keyframe_request"; timestamp: number }
  | InputEventMessage
  | FileTransferMessage
  | ClipboardMessage
  | ChatProtocolMessage
  | RecordingProtocolMessage
  | AiProtocolMessage
  | { type: "heartbeat"; timestamp: number; rtt?: number };
