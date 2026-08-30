import {
  RemoteSession,
  SessionPermission,
  SessionStatus,
  SessionEndReason,
} from "@nexusdesk/types";
import { generateSessionId } from "@nexusdesk/crypto";
import { canTransition, validateTransition } from "@nexusdesk/protocol";

export class SessionRepository {
  private sessions = new Map<string, RemoteSession>();

  public async createSession(data: {
    initiatorUserId: string;
    initiatorDeviceId: string;
    targetDeviceId: string;
    targetUserId?: string;
    requestedPermissions: SessionPermission[];
    ttlSeconds?: number;
  }): Promise<RemoteSession> {
    const id = generateSessionId();
    const now = new Date();
    const ttl = (data.ttlSeconds ?? 60) * 1000;
    const expiresAt = new Date(now.getTime() + ttl);

    const session: RemoteSession = {
      id,
      initiatorUserId: data.initiatorUserId,
      initiatorDeviceId: data.initiatorDeviceId,
      targetUserId: data.targetUserId,
      targetDeviceId: data.targetDeviceId,
      status: "WAITING_FOR_APPROVAL",
      requestedPermissions: data.requestedPermissions,
      grantedPermissions: [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    this.sessions.set(id, session);
    return this.evaluateExpiration(session);
  }

  public async findById(id: string): Promise<RemoteSession | null> {
    const session = this.sessions.get(id);
    if (!session) return null;
    return this.evaluateExpiration(session);
  }

  public async listSessions(params: {
    userId?: string;
    deviceId?: string;
    status?: SessionStatus;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: RemoteSession[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    let all = Array.from(this.sessions.values()).map((s) => this.evaluateExpiration(s));

    if (params.userId) {
      all = all.filter(
        (s) => s.initiatorUserId === params.userId || s.targetUserId === params.userId,
      );
    }

    if (params.deviceId) {
      all = all.filter(
        (s) => s.initiatorDeviceId === params.deviceId || s.targetDeviceId === params.deviceId,
      );
    }

    if (params.status) {
      all = all.filter((s) => s.status === params.status);
    }

    // Sort descending by createdAt
    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = all.length;
    const startIndex = (page - 1) * pageSize;
    const items = all.slice(startIndex, startIndex + pageSize);

    return { items, total };
  }

  public async approveSession(
    id: string,
    grantedPermissions: SessionPermission[],
  ): Promise<RemoteSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error("SESSION_NOT_FOUND");

    const current = this.evaluateExpiration(session);
    if (current.status === "EXPIRED") throw new Error("SESSION_EXPIRED");

    validateTransition(current.status, "APPROVED");

    const now = new Date();
    current.status = "APPROVED";
    current.grantedPermissions = grantedPermissions;
    current.approvedAt = now;
    current.updatedAt = now;

    // Immediately transition to NEGOTIATING
    if (canTransition("APPROVED", "NEGOTIATING")) {
      current.status = "NEGOTIATING";
    }

    return current;
  }

  public async readyForWebRtc(id: string): Promise<RemoteSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error("SESSION_NOT_FOUND");

    const current = this.evaluateExpiration(session);
    validateTransition(current.status, "READY_FOR_WEBRTC");

    current.status = "READY_FOR_WEBRTC";
    current.startedAt = current.startedAt ?? new Date();
    current.updatedAt = new Date();
    return current;
  }

  public async rejectSession(
    id: string,
    reason: SessionEndReason = "REMOTE_REJECTED",
  ): Promise<RemoteSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error("SESSION_NOT_FOUND");

    const current = this.evaluateExpiration(session);
    if (current.status === "EXPIRED") return current;

    validateTransition(current.status, "REJECTED");

    const now = new Date();
    current.status = "REJECTED";
    current.endedAt = now;
    current.endReason = reason;
    current.updatedAt = now;

    return current;
  }

  public async cancelSession(
    id: string,
    reason: SessionEndReason = "CANCELLED",
  ): Promise<RemoteSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error("SESSION_NOT_FOUND");

    const current = this.evaluateExpiration(session);
    if (current.status === "EXPIRED") return current;

    validateTransition(current.status, "CANCELLED");

    const now = new Date();
    current.status = "CANCELLED";
    current.endedAt = now;
    current.endReason = reason;
    current.updatedAt = now;

    return current;
  }

  public async endSession(
    id: string,
    reason: SessionEndReason = "USER_ENDED",
  ): Promise<RemoteSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error("SESSION_NOT_FOUND");

    const current = this.evaluateExpiration(session);
    if (["REJECTED", "CANCELLED", "EXPIRED", "ENDED"].includes(current.status)) {
      return current;
    }

    validateTransition(current.status, "ENDED");

    const now = new Date();
    current.status = "ENDED";
    current.endedAt = now;
    current.endReason = reason;
    current.updatedAt = now;

    return current;
  }

  private evaluateExpiration(session: RemoteSession): RemoteSession {
    if (
      ["APPROVED", "NEGOTIATING", "READY_FOR_WEBRTC", "REJECTED", "CANCELLED", "ENDED"].includes(
        session.status,
      )
    ) {
      return session;
    }

    if (Date.now() > session.expiresAt.getTime() && session.status === "WAITING_FOR_APPROVAL") {
      session.status = "EXPIRED";
      session.endedAt = new Date(session.expiresAt);
      session.endReason = "TIMEOUT";
      session.updatedAt = new Date();
    }

    return session;
  }
}

export const sessionRepository = new SessionRepository();
