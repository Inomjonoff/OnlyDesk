export type AuditEventType =
  | "auth.login"
  | "auth.logout"
  | "auth.failed"
  | "device.created"
  | "device.revoked"
  | "session.created"
  | "session.approved"
  | "session.rejected"
  | "session.connected"
  | "session.ended"
  | "permission.granted"
  | "permission.revoked"
  | "file.started"
  | "file.completed"
  | "file.failed"
  | "command.proposed"
  | "command.approved"
  | "command.rejected"
  | "command.executed"
  | "recording.started"
  | "recording.stopped"
  | "ai.analysis.started"
  | "ai.analysis.completed"
  | "ai.action.proposed"
  | "ai.action.approved"
  | "ai.action.rejected"
  | "ai.action.executed"
  | "ai.action.failed"
  | "ai.action.verified"
  | "ai.vision.requested"
  | "ai.tool.denied"
  | "ai.emergency.stop";

export interface AuditLogEntry {
  id: string;
  eventType: AuditEventType;
  userId?: string;
  deviceId?: string;
  sessionId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
