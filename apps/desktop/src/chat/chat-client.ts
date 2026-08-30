import {
  ChatMessagePayload,
  ChatMessageType,
  ChatProtocolMessage,
  ChatSendMessage,
  ChatAckMessage,
} from "@nexusdesk/types";

export interface ChatTransportSender {
  sendChatMessage(msg: ChatProtocolMessage): boolean;
}

export type ChatEventHandler = (event: {
  type: "message_received" | "message_sent" | "message_delivered" | "system_message" | "error";
  message?: ChatMessagePayload;
  error?: string;
}) => void;

export class ChatClient {
  private sessionId: string;
  private localUserId: string;
  private localDeviceId: string;
  private localUserName: string;

  private sender: ChatTransportSender | null = null;
  private messages = new Map<string, ChatMessagePayload>();
  private messageOrder: string[] = [];
  private sequenceCounter = 0;
  private outboxQueue: ChatMessagePayload[] = [];
  private recentSendTimestamps: number[] = [];

  private maxMessageBytes = 16 * 1024; // 16 KiB
  private maxMessagesPerSecond = 10;
  private handlers = new Set<ChatEventHandler>();

  constructor(
    sessionId: string,
    localUserId: string,
    localDeviceId: string,
    localUserName: string,
  ) {
    this.sessionId = sessionId;
    this.localUserId = localUserId;
    this.localDeviceId = localDeviceId;
    this.localUserName = localUserName;
  }

  public setSender(sender: ChatTransportSender | null): void {
    this.sender = sender;
    if (this.sender) {
      this.flushOutbox();
    }
  }

  public onEvent(handler: ChatEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(event: Parameters<ChatEventHandler>[0]): void {
    for (const h of this.handlers) {
      try {
        h(event);
      } catch (err) {
        console.error("Error in ChatClient event handler:", err);
      }
    }
  }

  private isRateLimited(): boolean {
    const now = Date.now();
    this.recentSendTimestamps = this.recentSendTimestamps.filter((t) => now - t < 1000);
    if (this.recentSendTimestamps.length >= this.maxMessagesPerSecond) {
      return true;
    }
    this.recentSendTimestamps.push(now);
    return false;
  }

  public sendMessage(text: string, type: ChatMessageType = "TEXT"): ChatMessagePayload | null {
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }

    const byteLength = new TextEncoder().encode(trimmed).length;
    if (byteLength > this.maxMessageBytes) {
      this.emit({ type: "error", error: "MESSAGE_TOO_LARGE" });
      return null;
    }

    if (this.isRateLimited()) {
      this.emit({ type: "error", error: "RATE_LIMITED" });
      return null;
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const message: ChatMessagePayload = {
      messageId,
      sessionId: this.sessionId,
      senderUserId: this.localUserId,
      senderDeviceId: this.localDeviceId,
      senderName: this.localUserName,
      type,
      text: trimmed,
      sequence: ++this.sequenceCounter,
      timestamp: Date.now(),
      deliveryState: "SENDING",
    };

    this.messages.set(messageId, message);
    this.messageOrder.push(messageId);

    const protocolMsg: ChatSendMessage = {
      type: "chat.message",
      payload: message,
    };

    if (this.sender && this.sender.sendChatMessage(protocolMsg)) {
      message.deliveryState = "SENT";
      this.emit({ type: "message_sent", message });
    } else {
      this.outboxQueue.push(message);
      this.emit({ type: "message_sent", message });
    }

    return message;
  }

  public addSystemMessage(text: string): ChatMessagePayload {
    const messageId = `sys_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const message: ChatMessagePayload = {
      messageId,
      sessionId: this.sessionId,
      senderUserId: "system",
      senderDeviceId: "system",
      senderName: "System",
      type: "SYSTEM",
      text: text.trim(),
      sequence: ++this.sequenceCounter,
      timestamp: Date.now(),
      deliveryState: "DELIVERED",
    };

    this.messages.set(messageId, message);
    this.messageOrder.push(messageId);
    this.emit({ type: "system_message", message });
    return message;
  }

  public handleIncomingMessage(msg: ChatProtocolMessage): boolean {
    if (msg.type === "chat.message") {
      const payload = msg.payload;

      // Idempotency: ignore if messageId already exists
      if (this.messages.has(payload.messageId)) {
        return false;
      }

      // Rejection of oversized messages
      const byteLength = new TextEncoder().encode(payload.text).length;
      if (byteLength > this.maxMessageBytes) {
        return false;
      }

      const receivedMessage: ChatMessagePayload = {
        ...payload,
        deliveryState: "DELIVERED",
      };

      this.messages.set(payload.messageId, receivedMessage);
      this.messageOrder.push(payload.messageId);

      // Send ACK back to sender
      if (this.sender && payload.senderDeviceId !== this.localDeviceId) {
        const ack: ChatAckMessage = {
          type: "chat.ack",
          payload: {
            messageId: payload.messageId,
            sequence: payload.sequence,
            receivedTimestamp: Date.now(),
          },
        };
        this.sender.sendChatMessage(ack);
      }

      this.emit({ type: "message_received", message: receivedMessage });
      return true;
    } else if (msg.type === "chat.ack") {
      const ackPayload = msg.payload;
      const existing = this.messages.get(ackPayload.messageId);
      if (existing) {
        existing.deliveryState = "DELIVERED";
        this.emit({ type: "message_delivered", message: existing });
        return true;
      }
    }

    return false;
  }

  private flushOutbox(): void {
    if (!this.sender || this.outboxQueue.length === 0) return;

    while (this.outboxQueue.length > 0) {
      const msg = this.outboxQueue[0];
      if (!msg) break;

      const protocolMsg: ChatSendMessage = {
        type: "chat.message",
        payload: msg,
      };

      if (this.sender.sendChatMessage(protocolMsg)) {
        msg.deliveryState = "SENT";
        this.outboxQueue.shift();
        this.emit({ type: "message_sent", message: msg });
      } else {
        break;
      }
    }
  }

  public getMessages(): ChatMessagePayload[] {
    return this.messageOrder
      .map((id) => this.messages.get(id))
      .filter((m): m is ChatMessagePayload => m !== undefined);
  }

  public getMessageCount(): number {
    return this.messageOrder.length;
  }

  public clear(): void {
    this.messages.clear();
    this.messageOrder = [];
    this.outboxQueue = [];
  }
}
