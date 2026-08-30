import { describe, it, expect } from "vitest";
import { ProtocolCodec } from "../codec";
import { PROTOCOL_VERSION } from "@nexusdesk/types";

describe("Protocol Package", () => {
  it("encodes and decodes packets with sequence tracking", () => {
    const codec = new ProtocolCodec("ses_test_123");
    const encoded = codec.encode({ type: "mouse.move", x: 500, y: 300 });

    const decoded = codec.decode<{ type: string; x: number; y: number }>(encoded);
    expect(decoded.header.version).toBe(PROTOCOL_VERSION);
    expect(decoded.header.sequence).toBe(1);
    expect(decoded.header.sessionId).toBe("ses_test_123");
    expect(decoded.payload.x).toBe(500);
    expect(decoded.payload.y).toBe(300);
  });

  it("detects replay and out-of-order sequence violation when enforced", () => {
    const sender = new ProtocolCodec("ses_test_123");
    const receiver = new ProtocolCodec("ses_test_123");

    const packet1 = sender.encode({ msg: 1 });
    const packet2 = sender.encode({ msg: 2 });

    receiver.decode(packet2, true); // seq 2 received

    // packet 1 (seq 1) arrives late -> should throw replay violation
    expect(() => receiver.decode(packet1, true)).toThrowError(/Replay or out-of-order/);
  });

  it("rejects packets with session mismatch", () => {
    const sender = new ProtocolCodec("ses_session_A");
    const receiver = new ProtocolCodec("ses_session_B");

    const packet = sender.encode({ msg: "hello" });
    expect(() => receiver.decode(packet)).toThrowError(/Session mismatch/);
  });
});
