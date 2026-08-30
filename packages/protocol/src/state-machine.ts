import { SessionStatus } from "@nexusdesk/types";

export const ALLOWED_SESSION_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  CREATED: ["REQUESTED", "WAITING_FOR_APPROVAL", "CANCELLED"],
  REQUESTED: ["WAITING_FOR_APPROVAL", "CANCELLED", "REJECTED", "EXPIRED"],
  WAITING_FOR_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED", "EXPIRED"],
  APPROVED: ["NEGOTIATING", "READY_FOR_WEBRTC", "CANCELLED", "ENDED"],
  NEGOTIATING: ["READY_FOR_WEBRTC", "CANCELLED", "EXPIRED", "ENDED"],
  READY_FOR_WEBRTC: ["ENDED"],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
  ENDED: [],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  if (from === to) return true; // Idempotent no-op
  const allowed = ALLOWED_SESSION_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateTransition(from: SessionStatus, to: SessionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid session state transition: Cannot transition from '${from}' to '${to}'`,
    );
  }
}

export function isTerminalSessionStatus(status: SessionStatus): boolean {
  return ["REJECTED", "CANCELLED", "EXPIRED", "ENDED"].includes(status);
}
