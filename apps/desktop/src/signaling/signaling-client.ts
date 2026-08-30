import { SignalingEventEnvelope, SessionPermission, SessionEndReason } from "@nexusdesk/types";

export type SignalingClientState =
  "DISCONNECTED" | "CONNECTING" | "AUTHENTICATING" | "CONNECTED" | "RECONNECTING" | "STOPPING";

export type EventHandler = (envelope: SignalingEventEnvelope) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private state: SignalingClientState = "DISCONNECTED";
  private handlers = new Map<string, Set<EventHandler>>();
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private url: string;
  private token: string;
  private deviceId?: string;

  constructor(url: string, token: string, deviceId?: string) {
    this.url = url;
    this.token = token;
    this.deviceId = deviceId;
  }

  public connect(): void {
    if (this.state === "CONNECTED" || this.state === "CONNECTING") return;

    this.setState(this.reconnectAttempt > 0 ? "RECONNECTING" : "CONNECTING");

    try {
      const fullUrl = `${this.url}?token=${encodeURIComponent(this.token)}${
        this.deviceId ? `&deviceId=${encodeURIComponent(this.deviceId)}` : ""
      }`;

      this.ws = new WebSocket(fullUrl);

      this.ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.setState("CONNECTED");
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const envelope: SignalingEventEnvelope = JSON.parse(event.data.toString());
          this.dispatchEvent(envelope);
        } catch {
          // Ignore malformed packet
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        if (this.state !== "STOPPING") {
          this.setState("DISCONNECTED");
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.setState("STOPPING");
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState("DISCONNECTED");
  }

  public on(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.off(type, handler);
  }

  public off(type: string, handler: EventHandler): void {
    const set = this.handlers.get(type);
    if (set) {
      set.delete(handler);
    }
  }

  public send(payload: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public acceptSession(sessionId: string, grantedPermissions: SessionPermission[]): void {
    this.send({
      type: "session.accept",
      sessionId,
      grantedPermissions,
    });
  }

  public rejectSession(sessionId: string, reason: SessionEndReason = "REMOTE_REJECTED"): void {
    this.send({
      type: "session.reject",
      sessionId,
      reason,
    });
  }

  public cancelSession(sessionId: string): void {
    this.send({
      type: "session.cancel",
      sessionId,
    });
  }

  public getState(): SignalingClientState {
    return this.state;
  }

  private setState(state: SignalingClientState): void {
    this.state = state;
    this.dispatchEvent({
      version: 1,
      eventId: `evt_local_${Date.now()}`,
      type: "client.state_changed",
      timestamp: Date.now(),
      payload: { state },
    });
  }

  private dispatchEvent(envelope: SignalingEventEnvelope): void {
    const specificHandlers = this.handlers.get(envelope.type);
    if (specificHandlers) {
      for (const handler of specificHandlers) {
        handler(envelope);
      }
    }

    const wildcardHandlers = this.handlers.get("*");
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        handler(envelope);
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({
        type: "heartbeat",
        timestamp: Date.now(),
      });
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectAttempt++;
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max with jitter
    const delay = Math.min(Math.pow(2, this.reconnectAttempt) * 500, 30000) + Math.random() * 500;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
