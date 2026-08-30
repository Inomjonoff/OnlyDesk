import { z } from "zod";
import { SessionPermissionEnum, SessionEndReasonEnum } from "./session.schema";

export const SignalingEnvelopeSchema = z.object({
  version: z.number().int().default(1),
  eventId: z.string().min(1),
  type: z.string().min(1),
  timestamp: z.number(),
  sessionId: z.string().optional(),
  sequence: z.number().int().optional(),
  sender: z
    .object({
      userId: z.string().optional(),
      deviceId: z.string().optional(),
    })
    .optional(),
  payload: z.record(z.unknown()).default({}),
});

export const SignalingAuthMessageSchema = z.object({
  type: z.literal("connection.authenticate"),
  token: z.string().min(1),
  deviceId: z.string().optional(),
});

export const SignalingSessionRequestSchema = z.object({
  type: z.literal("session.request"),
  targetDeviceId: z.string().min(1),
  requestedPermissions: z.array(SessionPermissionEnum).min(1),
});

export const SignalingSessionAcceptSchema = z.object({
  type: z.literal("session.accept"),
  sessionId: z.string().min(1),
  grantedPermissions: z.array(SessionPermissionEnum).min(1),
});

export const SignalingSessionRejectSchema = z.object({
  type: z.literal("session.reject"),
  sessionId: z.string().min(1),
  reason: SessionEndReasonEnum.optional(),
});

export const SignalingSessionCancelSchema = z.object({
  type: z.literal("session.cancel"),
  sessionId: z.string().min(1),
});

export const SignalingSessionEndSchema = z.object({
  type: z.literal("session.end"),
  sessionId: z.string().min(1),
  reason: SessionEndReasonEnum.optional(),
});

export const SignalingSessionSubscribeSchema = z.object({
  type: z.literal("session.subscribe"),
  sessionId: z.string().min(1),
});

export const SignalingHeartbeatSchema = z.object({
  type: z.literal("heartbeat"),
  timestamp: z.number(),
});

export const SignalingRtcOfferSchema = z.object({
  type: z.literal("rtc.offer"),
  sessionId: z.string().min(1),
  sdp: z.string().min(10),
});

export const SignalingRtcAnswerSchema = z.object({
  type: z.literal("rtc.answer"),
  sessionId: z.string().min(1),
  sdp: z.string().min(10),
});

export const SignalingRtcIceCandidateSchema = z.object({
  type: z.literal("rtc.ice_candidate"),
  sessionId: z.string().min(1),
  candidate: z.object({
    candidate: z.string(),
    sdpMid: z.string().nullable().optional(),
    sdpMLineIndex: z.number().nullable().optional(),
    usernameFragment: z.string().nullable().optional(),
  }),
});

export const SignalingRtcRestartSchema = z.object({
  type: z.literal("rtc.restart"),
  sessionId: z.string().min(1),
});

export const SignalingRtcConnectedSchema = z.object({
  type: z.literal("rtc.connected"),
  sessionId: z.string().min(1),
});

export const SignalingRtcFailedSchema = z.object({
  type: z.literal("rtc.failed"),
  sessionId: z.string().min(1),
  reason: z.string().optional(),
});

export const SignalingRtcVideoTrackAddedSchema = z.object({
  type: z.literal("rtc.video_track_added"),
  sessionId: z.string().min(1),
  displayId: z.string().optional(),
});

export const SignalingRtcKeyframeRequestSchema = z.object({
  type: z.literal("rtc.keyframe_request"),
  sessionId: z.string().min(1),
});

export const CaptureOptionsSchema = z.object({
  displayId: z.string().min(1),
  maxFps: z.number().int().min(1).max(120).default(30),
  maxWidth: z.number().int().min(640).max(7680).optional(),
  maxHeight: z.number().int().min(480).max(4320).optional(),
  cursor: z.boolean().default(true),
  preferHardwareEncoding: z.boolean().default(true),
});

export const ControlPingSchema = z.object({
  type: z.literal("control.ping"),
  sequence: z.number().int(),
  timestamp: z.number(),
});

export const ControlPongSchema = z.object({
  type: z.literal("control.pong"),
  sequence: z.number().int(),
  originalTimestamp: z.number(),
  receivedTimestamp: z.number(),
});

export const ControlKeyframeRequestSchema = z.object({
  type: z.literal("control.keyframe_request"),
  timestamp: z.number(),
});

export const MouseButtonEnum = z.enum(["LEFT", "RIGHT", "MIDDLE", "X1", "X2"]);
export const ButtonActionEnum = z.enum(["DOWN", "UP", "CLICK", "DOUBLE_CLICK"]);

export const InputMouseMoveSchema = z.object({
  type: z.literal("input.mouse.move"),
  sequence: z.number().int().min(0),
  timestamp: z.number(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  displayId: z.string().optional(),
});

export const InputMouseButtonSchema = z.object({
  type: z.literal("input.mouse.button"),
  sequence: z.number().int().min(0),
  timestamp: z.number(),
  button: MouseButtonEnum,
  action: ButtonActionEnum,
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  displayId: z.string().optional(),
});

export const InputMouseWheelSchema = z.object({
  type: z.literal("input.mouse.wheel"),
  sequence: z.number().int().min(0),
  timestamp: z.number(),
  deltaX: z.number(),
  deltaY: z.number(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const InputKeyboardSchema = z.object({
  type: z.literal("input.keyboard"),
  sequence: z.number().int().min(0),
  timestamp: z.number(),
  code: z.string().min(1).max(50),
  key: z.string().min(1).max(50),
  action: z.enum(["DOWN", "UP"]),
  repeat: z.boolean().optional(),
  modifiers: z.object({
    ctrl: z.boolean().optional(),
    alt: z.boolean().optional(),
    shift: z.boolean().optional(),
    meta: z.boolean().optional(),
  }),
});

export const InputReleaseAllSchema = z.object({
  type: z.literal("input.release_all"),
  sequence: z.number().int().min(0),
  timestamp: z.number(),
});

export const InputEmergencyStopSchema = z.object({
  type: z.literal("input.emergency_stop"),
  sequence: z.number().int().min(0),
  timestamp: z.number(),
});

export const TransferErrorCodeEnum = z.enum([
  "FILE_NOT_FOUND",
  "FILE_ACCESS_DENIED",
  "FILE_TOO_LARGE",
  "DISK_SPACE_LOW",
  "DESTINATION_DENIED",
  "TRANSFER_NOT_FOUND",
  "TRANSFER_FORBIDDEN",
  "TRANSFER_EXPIRED",
  "TRANSFER_CANCELLED",
  "TRANSFER_TIMEOUT",
  "CHUNK_INVALID",
  "CHUNK_HASH_MISMATCH",
  "FILE_HASH_MISMATCH",
  "CHANNEL_UNAVAILABLE",
  "BUFFER_OVERFLOW",
  "STORAGE_ERROR",
  "PATH_TRAVERSAL_DETECTED",
]);

// File Transfer Schemas
export const FileTransferRequestSchema = z.object({
  type: z.literal("file.request"),
  transferId: z.string().min(1),
  sessionId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024 * 1024), // 10 GB limit
  mimeType: z.string().max(100).default("application/octet-stream"),
  sha256: z
    .string()
    .length(64)
    .regex(/^[a-f0-9]{64}$/i),
  chunkSize: z
    .number()
    .int()
    .min(1024)
    .max(4 * 1024 * 1024),
  totalChunks: z.number().int().positive(),
  timestamp: z.number(),
});

export const FileTransferAcceptSchema = z.object({
  type: z.literal("file.accept"),
  transferId: z.string().min(1),
  sessionId: z.string().min(1),
  destinationPath: z.string().optional(),
  startChunkIndex: z.number().int().min(0).default(0),
  timestamp: z.number(),
});

export const FileTransferRejectSchema = z.object({
  type: z.literal("file.reject"),
  transferId: z.string().min(1),
  sessionId: z.string().min(1),
  reason: TransferErrorCodeEnum,
  timestamp: z.number(),
});

export const FileTransferStartSchema = z.object({
  type: z.literal("file.start"),
  transferId: z.string().min(1),
  startChunkIndex: z.number().int().min(0),
  timestamp: z.number(),
});

export const FileTransferChunkSchema = z.object({
  type: z.literal("file.chunk"),
  transferId: z.string().min(1),
  chunkIndex: z.number().int().min(0),
  offset: z.number().int().min(0),
  length: z
    .number()
    .int()
    .positive()
    .max(4 * 1024 * 1024),
  chunkSha256: z.string().length(64).optional(),
  data: z.string().min(1),
  timestamp: z.number(),
});

export const FileTransferChunkAckSchema = z.object({
  type: z.literal("file.chunk_ack"),
  transferId: z.string().min(1),
  highestContiguousChunk: z.number().int().min(0),
  bytesReceived: z.number().int().min(0),
  timestamp: z.number(),
});

export const FileTransferPauseSchema = z.object({
  type: z.literal("file.pause"),
  transferId: z.string().min(1),
  reason: z.string().optional(),
  timestamp: z.number(),
});

export const FileTransferResumeSchema = z.object({
  type: z.literal("file.resume"),
  transferId: z.string().min(1),
  fromChunkIndex: z.number().int().min(0),
  timestamp: z.number(),
});

export const FileTransferCancelSchema = z.object({
  type: z.literal("file.cancel"),
  transferId: z.string().min(1),
  reason: TransferErrorCodeEnum,
  timestamp: z.number(),
});

export const FileTransferCompleteSchema = z.object({
  type: z.literal("file.complete"),
  transferId: z.string().min(1),
  sha256: z
    .string()
    .length(64)
    .regex(/^[a-f0-9]{64}$/i),
  bytesTotal: z.number().int().min(0),
  timestamp: z.number(),
});

export const FileTransferErrorSchema = z.object({
  type: z.literal("file.error"),
  transferId: z.string().min(1),
  code: TransferErrorCodeEnum,
  message: z.string().min(1),
  timestamp: z.number(),
});

// Clipboard Schemas
export const ClipboardUpdateSchema = z.object({
  type: z.literal("clipboard.update"),
  clipboardId: z.string().min(1),
  originDeviceId: z.string().min(1),
  sequence: z.number().int().min(0),
  clipboardType: z.enum(["TEXT", "IMAGE"]),
  content: z.string().min(1),
  sha256: z
    .string()
    .length(64)
    .regex(/^[a-f0-9]{64}$/i),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024),
  timestamp: z.number(),
});

export const ClipboardAckSchema = z.object({
  type: z.literal("clipboard.ack"),
  clipboardId: z.string().min(1),
  sequence: z.number().int().min(0),
  applied: z.boolean(),
  timestamp: z.number(),
});

// Chat Schemas
export const ChatMessageTypeEnum = z.enum(["TEXT", "SYSTEM", "FILE_REFERENCE", "RECORDING_EVENT"]);
export const ChatDeliveryStateEnum = z.enum(["DRAFT", "SENDING", "SENT", "DELIVERED", "FAILED"]);

export const ChatMessagePayloadSchema = z.object({
  messageId: z.string().min(1),
  sessionId: z.string().min(1),
  senderUserId: z.string().min(1),
  senderDeviceId: z.string().min(1),
  senderName: z.string().min(1),
  type: ChatMessageTypeEnum,
  text: z.string().max(16 * 1024),
  sequence: z.number().int().min(0),
  timestamp: z.number(),
  deliveryState: ChatDeliveryStateEnum.optional(),
});

export const ChatSendMessageSchema = z.object({
  type: z.literal("chat.message"),
  payload: ChatMessagePayloadSchema,
});

export const ChatAckMessageSchema = z.object({
  type: z.literal("chat.ack"),
  payload: z.object({
    messageId: z.string().min(1),
    sequence: z.number().int().min(0),
    receivedTimestamp: z.number(),
  }),
});

// Recording Schemas
export const RecordingStatusEnum = z.enum([
  "REQUESTED",
  "CONSENT_PENDING",
  "STARTING",
  "RECORDING",
  "STOPPING",
  "PROCESSING",
  "READY",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
  "DELETED",
]);

export const RecordingConsentStateEnum = z.enum(["PENDING", "GRANTED", "REJECTED"]);

export const RecordingRequestSchema = z.object({
  type: z.literal("recording.request"),
  recordingId: z.string().min(1),
  sessionId: z.string().min(1),
  requesterUserId: z.string().min(1),
  timestamp: z.number(),
});

export const RecordingConsentSchema = z.object({
  type: z.literal("recording.consent"),
  recordingId: z.string().min(1),
  sessionId: z.string().min(1),
  granted: z.boolean(),
  timestamp: z.number(),
});

export const RecordingStartSchema = z.object({
  type: z.literal("recording.start"),
  recordingId: z.string().min(1),
  sessionId: z.string().min(1),
  timestamp: z.number(),
});

export const RecordingStopSchema = z.object({
  type: z.literal("recording.stop"),
  recordingId: z.string().min(1),
  sessionId: z.string().min(1),
  timestamp: z.number(),
});

export const RecordingStatusSchema = z.object({
  type: z.literal("recording.status"),
  recordingId: z.string().min(1),
  status: RecordingStatusEnum,
  durationMs: z.number().min(0),
  timestamp: z.number(),
});

export const TimelineQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// AI Signaling Schemas
export const AiProposalMessageSchema = z.object({
  type: z.literal("ai.proposal"),
  sessionId: z.string().min(1),
  proposal: z.record(z.unknown()),
  timestamp: z.number(),
});

export const AiApprovalMessageSchema = z.object({
  type: z.literal("ai.approval"),
  proposalId: z.string().min(1),
  sessionId: z.string().min(1),
  approved: z.boolean(),
  reason: z.string().optional(),
  timestamp: z.number(),
});

export const AiActionMessageSchema = z.object({
  type: z.literal("ai.action"),
  actionId: z.string().min(1),
  proposalId: z.string().min(1),
  sessionId: z.string().min(1),
  tool: z.string().min(1),
  status: z.string().min(1),
  risk: z.string().min(1),
  timestamp: z.number(),
});

export const AiResultMessageSchema = z.object({
  type: z.literal("ai.result"),
  actionId: z.string().min(1),
  sessionId: z.string().min(1),
  result: z.record(z.unknown()),
  timestamp: z.number(),
});

export const AiStopMessageSchema = z.object({
  type: z.literal("ai.stop"),
  sessionId: z.string().min(1),
  reason: z.string().min(1),
  timestamp: z.number(),
});

export const SignalingClientMessageSchema = z.discriminatedUnion("type", [
  SignalingAuthMessageSchema,
  SignalingSessionRequestSchema,
  SignalingSessionAcceptSchema,
  SignalingSessionRejectSchema,
  SignalingSessionCancelSchema,
  SignalingSessionEndSchema,
  SignalingSessionSubscribeSchema,
  SignalingHeartbeatSchema,
  SignalingRtcOfferSchema,
  SignalingRtcAnswerSchema,
  SignalingRtcIceCandidateSchema,
  SignalingRtcRestartSchema,
  SignalingRtcConnectedSchema,
  SignalingRtcFailedSchema,
  SignalingRtcVideoTrackAddedSchema,
  SignalingRtcKeyframeRequestSchema,
  InputMouseMoveSchema,
  InputMouseButtonSchema,
  InputMouseWheelSchema,
  InputKeyboardSchema,
  InputReleaseAllSchema,
  InputEmergencyStopSchema,
  FileTransferRequestSchema,
  FileTransferAcceptSchema,
  FileTransferRejectSchema,
  FileTransferStartSchema,
  FileTransferChunkSchema,
  FileTransferChunkAckSchema,
  FileTransferPauseSchema,
  FileTransferResumeSchema,
  FileTransferCancelSchema,
  FileTransferCompleteSchema,
  FileTransferErrorSchema,
  ClipboardUpdateSchema,
  ClipboardAckSchema,
  ChatSendMessageSchema,
  ChatAckMessageSchema,
  RecordingRequestSchema,
  RecordingConsentSchema,
  RecordingStartSchema,
  RecordingStopSchema,
  RecordingStatusSchema,
  AiProposalMessageSchema,
  AiApprovalMessageSchema,
  AiActionMessageSchema,
  AiResultMessageSchema,
  AiStopMessageSchema,
]);

export type SignalingClientMessage = z.infer<typeof SignalingClientMessageSchema>;
export type SignalingEventEnvelopeInput = z.infer<typeof SignalingEnvelopeSchema>;
export type CaptureOptionsInput = z.infer<typeof CaptureOptionsSchema>;
export type FileTransferRequestInput = z.infer<typeof FileTransferRequestSchema>;
export type FileTransferAcceptInput = z.infer<typeof FileTransferAcceptSchema>;
export type ClipboardUpdateInput = z.infer<typeof ClipboardUpdateSchema>;
export type ChatMessagePayloadInput = z.infer<typeof ChatMessagePayloadSchema>;
