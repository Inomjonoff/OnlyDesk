import { SessionPermission } from "./permission";

export type SessionStatus =
  | "CREATED"
  | "REQUESTED"
  | "WAITING_FOR_APPROVAL"
  | "APPROVED"
  | "NEGOTIATING"
  | "READY_FOR_WEBRTC"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED"
  | "ENDED";

export type SessionEndReason =
  | "USER_ENDED"
  | "REMOTE_REJECTED"
  | "TIMEOUT"
  | "DEVICE_OFFLINE"
  | "SERVER_ERROR"
  | "CANCELLED"
  | "SECURITY_POLICY";

export type ParticipantRole = "INITIATOR" | "TARGET" | "OBSERVER";

export interface SessionParticipant {
  id: string;
  sessionId: string;
  deviceId: string;
  userId?: string;
  role: ParticipantRole;
  connectionId?: string;
  joinedAt: Date;
  leftAt?: Date;
}

export interface RemoteSession {
  id: string;
  initiatorUserId: string;
  initiatorDeviceId: string;
  targetUserId?: string;
  targetDeviceId: string;
  status: SessionStatus;
  requestedPermissions: SessionPermission[];
  grantedPermissions: SessionPermission[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  approvedAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  endReason?: SessionEndReason;
}

export interface SignalingConnection {
  connectionId: string;
  userId: string;
  deviceId?: string;
  authenticatedAt: Date;
  connectedAt: Date;
  lastHeartbeatAt: Date;
  subscriptions: Set<string>;
}

export interface FileTransfer {
  id: string;
  sessionId: string;
  senderDeviceId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  totalChunks: number;
  transferredChunks: number;
  sha256Checksum: string;
  status: "PENDING" | "TRANSFERRING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderDeviceId: string;
  senderName: string;
  content: string;
  type: "TEXT" | "SYSTEM" | "AI" | "FILE";
  createdAt: Date;
}
