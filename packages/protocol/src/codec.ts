import { PROTOCOL_VERSION, ProtocolHeader } from "@nexusdesk/types";

export interface ProtocolPacket<T = unknown> {
  header: ProtocolHeader;
  payload: T;
}

export class ProtocolCodec {
  private currentSequence = 0;
  private lastReceivedSequence = -1;
  private readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  public encode<T>(payload: T): string {
    this.currentSequence += 1;
    const packet: ProtocolPacket<T> = {
      header: {
        version: PROTOCOL_VERSION,
        sequence: this.currentSequence,
        timestamp: Date.now(),
        sessionId: this.sessionId,
      },
      payload,
    };
    return JSON.stringify(packet);
  }

  public decode<T>(raw: string, enforceMonotonic = false): ProtocolPacket<T> {
    const packet = JSON.parse(raw) as ProtocolPacket<T>;

    if (!packet.header || typeof packet.header.version !== "number") {
      throw new Error("Invalid protocol packet: Missing header");
    }

    if (packet.header.version !== PROTOCOL_VERSION) {
      throw new Error(`Unsupported protocol version: ${packet.header.version}`);
    }

    if (packet.header.sessionId !== this.sessionId) {
      throw new Error(
        `Session mismatch: expected ${this.sessionId}, got ${packet.header.sessionId}`,
      );
    }

    if (enforceMonotonic && packet.header.sequence <= this.lastReceivedSequence) {
      throw new Error(
        `Replay or out-of-order packet detected: seq ${packet.header.sequence} <= ${this.lastReceivedSequence}`,
      );
    }

    this.lastReceivedSequence = Math.max(this.lastReceivedSequence, packet.header.sequence);
    return packet;
  }

  public reset(): void {
    this.currentSequence = 0;
    this.lastReceivedSequence = -1;
  }
}
