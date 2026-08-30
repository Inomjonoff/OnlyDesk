import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebSocket } from "ws";
import * as jwt from "jsonwebtoken";
import { buildSignalingServer } from "../server";
import { SignalingSessionManager } from "../session-manager";
import { getEnv } from "@nexusdesk/config";
import { FastifyInstance } from "fastify";

function createTestToken(userId: string, email = "test@nexusdesk.ai"): string {
  const env = getEnv();
  return jwt.sign({ sub: userId, email, role: "USER" }, env.JWT_SECRET, { expiresIn: "1h" });
}

function waitForMessage(ws: WebSocket, predicate?: (msg: any) => boolean): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout waiting for WebSocket message"));
    }, 4000);

    const onMessage = (data: Buffer | string) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (!predicate || predicate(parsed)) {
          clearTimeout(timer);
          ws.off("message", onMessage);
          resolve(parsed);
        }
      } catch {
        // Continue waiting
      }
    };

    ws.on("message", onMessage);
  });
}

describe("Phase 2: Signaling Server & Session Negotiation Integration Tests", () => {
  let server: FastifyInstance;
  let serverPort: number;
  let wsUrl: string;

  beforeAll(async () => {
    server = buildSignalingServer(new SignalingSessionManager());
    await server.listen({ port: 0, host: "127.0.0.1" });
    const address = server.server.address();
    if (typeof address === "object" && address !== null) {
      serverPort = address.port;
      wsUrl = `ws://127.0.0.1:${serverPort}/ws`;
    }
  });

  afterAll(async () => {
    await server.close();
  });

  it("authenticates WebSocket connection using JWT", async () => {
    const token = createTestToken("usr_alice");
    const ws = new WebSocket(`${wsUrl}?token=${token}&deviceId=dev_alice`);

    const authEvent = await waitForMessage(ws, (m) => m.type === "connection.authenticated");
    expect(authEvent.payload.userId).toBe("usr_alice");
    expect(authEvent.payload.deviceId).toBe("dev_alice");
    expect(authEvent.payload.connectionId).toBeDefined();

    ws.close();
  });

  it("handles heartbeat ping/pong", async () => {
    const token = createTestToken("usr_alice");
    const ws = new WebSocket(`${wsUrl}?token=${token}&deviceId=dev_alice`);
    await waitForMessage(ws, (m) => m.type === "connection.authenticated");

    ws.send(JSON.stringify({ type: "heartbeat", timestamp: Date.now() }));
    const ack = await waitForMessage(ws, (m) => m.type === "heartbeat.ack");
    expect(ack.payload.acknowledgedAt).toBeDefined();

    ws.close();
  });

  it("executes full remote session request -> real-time delivery -> approval -> negotiation flow", async () => {
    const userA = "usr_clientA";
    const userB = "usr_clientB";
    const deviceB = "dev_targetB";

    const tokenA = createTestToken(userA);
    const tokenB = createTestToken(userB);

    const wsA = new WebSocket(`${wsUrl}?token=${tokenA}&deviceId=dev_clientA`);
    const wsB = new WebSocket(`${wsUrl}?token=${tokenB}&deviceId=${deviceB}`);

    await Promise.all([
      waitForMessage(wsA, (m) => m.type === "connection.authenticated"),
      waitForMessage(wsB, (m) => m.type === "connection.authenticated"),
    ]);

    // 1. Client A sends session.request targeting Device B
    wsA.send(
      JSON.stringify({
        type: "session.request",
        targetDeviceId: deviceB,
        requestedPermissions: ["SCREEN_VIEW", "MOUSE_CONTROL", "KEYBOARD_CONTROL"],
      }),
    );

    // 2. Client A receives session.requested confirmation
    const requestedAck = await waitForMessage(wsA, (m) => m.type === "session.requested");
    expect(requestedAck.payload.sessionId).toBeDefined();
    expect(requestedAck.payload.status).toBe("WAITING_FOR_APPROVAL");
    const sessionId = requestedAck.payload.sessionId;

    // 3. Device B receives real-time session.request envelope
    const incomingReq = await waitForMessage(wsB, (m) => m.type === "session.request");
    expect(incomingReq.payload.sessionId).toBe(sessionId);
    expect(incomingReq.payload.initiatorUserId).toBe(userA);
    expect(incomingReq.payload.requestedPermissions).toContain("SCREEN_VIEW");

    // 4. Device B approves connection with granted permissions
    wsB.send(
      JSON.stringify({
        type: "session.accept",
        sessionId,
        grantedPermissions: ["SCREEN_VIEW", "MOUSE_CONTROL"],
      }),
    );

    // 5. Client A receives session.accepted in real time with NEGOTIATING status
    const acceptedEvent = await waitForMessage(wsA, (m) => m.type === "session.accepted");
    expect(acceptedEvent.payload.sessionId).toBe(sessionId);
    expect(acceptedEvent.payload.status).toBe("NEGOTIATING");
    expect(acceptedEvent.payload.grantedPermissions).toEqual(["SCREEN_VIEW", "MOUSE_CONTROL"]);

    // 6. Test RTC signaling exchange between peers
    wsA.send(
      JSON.stringify({
        type: "rtc.offer",
        sessionId,
        sdp: "v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n",
      }),
    );

    const rtcOffer = await waitForMessage(wsB, (m) => m.type === "rtc.offer");
    expect(rtcOffer.payload.sdp).toContain("v=0");
    expect(rtcOffer.sessionId).toBe(sessionId);

    wsA.close();
    wsB.close();
  });

  it("handles session rejection flow in real time", async () => {
    const userA = "usr_clientA_rej";
    const userB = "usr_clientB_rej";
    const deviceB = "dev_targetB_rej";

    const wsA = new WebSocket(`${wsUrl}?token=${createTestToken(userA)}&deviceId=dev_clientA`);
    const wsB = new WebSocket(`${wsUrl}?token=${createTestToken(userB)}&deviceId=${deviceB}`);

    await Promise.all([
      waitForMessage(wsA, (m) => m.type === "connection.authenticated"),
      waitForMessage(wsB, (m) => m.type === "connection.authenticated"),
    ]);

    wsA.send(
      JSON.stringify({
        type: "session.request",
        targetDeviceId: deviceB,
        requestedPermissions: ["SCREEN_VIEW"],
      }),
    );

    const requestedAck = await waitForMessage(wsA, (m) => m.type === "session.requested");
    const sessionId = requestedAck.payload.sessionId;

    await waitForMessage(wsB, (m) => m.type === "session.request");

    // Device B rejects
    wsB.send(
      JSON.stringify({
        type: "session.reject",
        sessionId,
        reason: "REMOTE_REJECTED",
      }),
    );

    const rejectedEvent = await waitForMessage(wsA, (m) => m.type === "session.rejected");
    expect(rejectedEvent.payload.sessionId).toBe(sessionId);
    expect(rejectedEvent.payload.status).toBe("REJECTED");

    wsA.close();
    wsB.close();
  });

  it("handles session cancellation by initiator", async () => {
    const userA = "usr_clientA_can";
    const userB = "usr_clientB_can";
    const deviceB = "dev_targetB_can";

    const wsA = new WebSocket(`${wsUrl}?token=${createTestToken(userA)}&deviceId=dev_clientA`);
    const wsB = new WebSocket(`${wsUrl}?token=${createTestToken(userB)}&deviceId=${deviceB}`);

    await Promise.all([
      waitForMessage(wsA, (m) => m.type === "connection.authenticated"),
      waitForMessage(wsB, (m) => m.type === "connection.authenticated"),
    ]);

    wsA.send(
      JSON.stringify({
        type: "session.request",
        targetDeviceId: deviceB,
        requestedPermissions: ["SCREEN_VIEW"],
      }),
    );

    const requestedAck = await waitForMessage(wsA, (m) => m.type === "session.requested");
    const sessionId = requestedAck.payload.sessionId;

    await waitForMessage(wsB, (m) => m.type === "session.request");

    // Client A cancels
    wsA.send(JSON.stringify({ type: "session.cancel", sessionId }));

    const cancelledEvent = await waitForMessage(wsB, (m) => m.type === "session.cancelled");
    expect(cancelledEvent.payload.sessionId).toBe(sessionId);
    expect(cancelledEvent.payload.status).toBe("CANCELLED");

    wsA.close();
    wsB.close();
  });
});
