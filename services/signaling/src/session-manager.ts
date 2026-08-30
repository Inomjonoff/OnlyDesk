import { WebSocket } from "ws";
import {
  SignalingEventEnvelope,
  SessionPermission,
  SessionStatus,
  SessionEndReason,
} from "@nexusdesk/types";
import { generateSecureToken } from "@nexusdesk/crypto";
import { canTransition, validateTransition } from "@nexusdesk/protocol";

export interface ConnectedSocket {
  connectionId: string;
  userId: string;
  deviceId?: string;
  authenticatedAt: Date;
  connectedAt: Date;
  lastHeartbeatAt: Date;
  subscriptions: Set<string>;
  socket: WebSocket;
}

export interface InMemorySignalingSession {
  id: string;
  initiatorUserId: string;
  initiatorDeviceId: string;
  targetUserId?: string;
  targetDeviceId: string;
  status: SessionStatus;
  requestedPermissions: SessionPermission[];
  grantedPermissions: SessionPermission[];
  createdAt: Date;
  expiresAt: Date;
  approvedAt?: Date;
  endedAt?: Date;
  endReason?: SessionEndReason;
}

export class SignalingSessionManager {
  private connections = new Map<string, ConnectedSocket>(); // connectionId -> socket
  private userConnections = new Map<string, Set<string>>(); // userId -> Set<connectionId>
  private deviceConnections = new Map<string, Set<string>>(); // deviceId -> Set<connectionId>
  private sessions = new Map<string, InMemorySignalingSession>(); // sessionId -> session

  public registerConnection(socket: WebSocket, userId: string, deviceId?: string): ConnectedSocket {
    const connectionId = `conn_${generateSecureToken(12)}`;
    const now = new Date();

    const conn: ConnectedSocket = {
      connectionId,
      userId,
      deviceId,
      authenticatedAt: now,
      connectedAt: now,
      lastHeartbeatAt: now,
      subscriptions: new Set([`user:${userId}`]),
      socket,
    };

    if (deviceId) {
      conn.subscriptions.add(`device:${deviceId}`);
    }

    this.connections.set(connectionId, conn);

    // Index by user
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    // Index by device
    if (deviceId) {
      if (!this.deviceConnections.has(deviceId)) {
        this.deviceConnections.set(deviceId, new Set());
      }
      this.deviceConnections.get(deviceId)!.add(connectionId);
    }

    return conn;
  }

  public removeConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    // Clean user index
    const userSet = this.userConnections.get(conn.userId);
    if (userSet) {
      userSet.delete(connectionId);
      if (userSet.size === 0) this.userConnections.delete(conn.userId);
    }

    // Clean device index
    if (conn.deviceId) {
      const devSet = this.deviceConnections.get(conn.deviceId);
      if (devSet) {
        devSet.delete(connectionId);
        if (devSet.size === 0) this.deviceConnections.delete(conn.deviceId);
      }
    }

    this.connections.delete(connectionId);
  }

  public getConnection(connectionId: string): ConnectedSocket | undefined {
    return this.connections.get(connectionId);
  }

  public updateHeartbeat(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.lastHeartbeatAt = new Date();
    }
  }

  public subscribeSession(connectionId: string, sessionId: string): boolean {
    const conn = this.connections.get(connectionId);
    if (!conn) return false;

    // Check authorization: user or device must be initiator or target
    const session = this.sessions.get(sessionId);
    if (session) {
      const isAuthorized =
        session.initiatorUserId === conn.userId ||
        session.targetUserId === conn.userId ||
        session.initiatorDeviceId === conn.deviceId ||
        session.targetDeviceId === conn.deviceId;

      if (!isAuthorized) return false;
    }

    conn.subscriptions.add(`session:${sessionId}`);
    return true;
  }

  // --- Session Management ---

  public createSession(data: {
    initiatorUserId: string;
    initiatorDeviceId: string;
    targetDeviceId: string;
    requestedPermissions: SessionPermission[];
    ttlSeconds?: number;
  }): InMemorySignalingSession {
    const id = `ses_${generateSecureToken(16)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (data.ttlSeconds ?? 60) * 1000);

    const session: InMemorySignalingSession = {
      id,
      initiatorUserId: data.initiatorUserId,
      initiatorDeviceId: data.initiatorDeviceId,
      targetDeviceId: data.targetDeviceId,
      status: "WAITING_FOR_APPROVAL",
      requestedPermissions: data.requestedPermissions,
      grantedPermissions: [],
      createdAt: now,
      expiresAt,
    };

    this.sessions.set(id, session);
    return session;
  }

  public getSession(id: string): InMemorySignalingSession | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    // Evaluate expiration
    if (session.status === "WAITING_FOR_APPROVAL" && Date.now() > session.expiresAt.getTime()) {
      session.status = "EXPIRED";
      session.endedAt = new Date(session.expiresAt);
      session.endReason = "TIMEOUT";
    }

    return session;
  }

  public approveSession(
    sessionId: string,
    grantedPermissions: SessionPermission[],
    approverDeviceId?: string,
  ): InMemorySignalingSession {
    const session = this.getSession(sessionId);
    if (!session) throw new Error("SESSION_NOT_FOUND");
    if (session.status === "EXPIRED") throw new Error("SESSION_EXPIRED");

    if (approverDeviceId && session.targetDeviceId !== approverDeviceId) {
      throw new Error("UNAUTHORIZED_TARGET_DEVICE");
    }

    validateTransition(session.status, "APPROVED");

    session.status = "APPROVED";
    session.grantedPermissions = grantedPermissions;
    session.approvedAt = new Date();

    // Immediately advance to NEGOTIATING
    if (canTransition("APPROVED", "NEGOTIATING")) {
      session.status = "NEGOTIATING";
    }

    return session;
  }

  public readySession(sessionId: string): InMemorySignalingSession {
    const session = this.getSession(sessionId);
    if (!session) throw new Error("SESSION_NOT_FOUND");

    validateTransition(session.status, "READY_FOR_WEBRTC");
    session.status = "READY_FOR_WEBRTC";
    return session;
  }

  public rejectSession(
    sessionId: string,
    reason: SessionEndReason = "REMOTE_REJECTED",
  ): InMemorySignalingSession {
    const session = this.getSession(sessionId);
    if (!session) throw new Error("SESSION_NOT_FOUND");

    validateTransition(session.status, "REJECTED");
    session.status = "REJECTED";
    session.endedAt = new Date();
    session.endReason = reason;
    return session;
  }

  public cancelSession(
    sessionId: string,
    reason: SessionEndReason = "CANCELLED",
  ): InMemorySignalingSession {
    const session = this.getSession(sessionId);
    if (!session) throw new Error("SESSION_NOT_FOUND");

    validateTransition(session.status, "CANCELLED");
    session.status = "CANCELLED";
    session.endedAt = new Date();
    session.endReason = reason;
    return session;
  }

  public endSession(
    sessionId: string,
    reason: SessionEndReason = "USER_ENDED",
  ): InMemorySignalingSession {
    const session = this.getSession(sessionId);
    if (!session) throw new Error("SESSION_NOT_FOUND");

    validateTransition(session.status, "ENDED");
    session.status = "ENDED";
    session.endedAt = new Date();
    session.endReason = reason;
    return session;
  }

  // --- Multi-Node Routing Helpers ---

  public routeToUser(userId: string, envelope: SignalingEventEnvelope): number {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return 0;

    let delivered = 0;
    for (const connId of connectionIds) {
      if (this.sendToConnection(connId, envelope)) delivered++;
    }
    return delivered;
  }

  public routeToDevice(deviceId: string, envelope: SignalingEventEnvelope): number {
    const connectionIds = this.deviceConnections.get(deviceId);
    if (!connectionIds) return 0;

    let delivered = 0;
    for (const connId of connectionIds) {
      if (this.sendToConnection(connId, envelope)) delivered++;
    }
    return delivered;
  }

  public routeToSession(
    sessionId: string,
    envelope: SignalingEventEnvelope,
    excludeConnectionId?: string,
  ): number {
    const channel = `session:${sessionId}`;
    let delivered = 0;

    for (const conn of this.connections.values()) {
      if (conn.connectionId === excludeConnectionId) continue;

      if (conn.subscriptions.has(channel)) {
        if (this.sendToConnection(conn.connectionId, envelope)) delivered++;
      }
    }

    return delivered;
  }

  public sendToConnection(connectionId: string, envelope: SignalingEventEnvelope): boolean {
    const conn = this.connections.get(connectionId);
    if (!conn || conn.socket.readyState !== WebSocket.OPEN) return false;

    try {
      conn.socket.send(JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }

  public getActiveConnectionCount(): number {
    return this.connections.size;
  }

  public getActiveSessionCount(): number {
    return this.sessions.size;
  }
}
