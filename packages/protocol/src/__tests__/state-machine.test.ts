import { describe, it, expect } from "vitest";
import { canTransition, validateTransition, isTerminalSessionStatus } from "../state-machine";

describe("Protocol: Session State Machine", () => {
  it("allows valid forward transitions", () => {
    expect(canTransition("CREATED", "WAITING_FOR_APPROVAL")).toBe(true);
    expect(canTransition("WAITING_FOR_APPROVAL", "APPROVED")).toBe(true);
    expect(canTransition("WAITING_FOR_APPROVAL", "REJECTED")).toBe(true);
    expect(canTransition("WAITING_FOR_APPROVAL", "CANCELLED")).toBe(true);
    expect(canTransition("WAITING_FOR_APPROVAL", "EXPIRED")).toBe(true);
    expect(canTransition("APPROVED", "NEGOTIATING")).toBe(true);
    expect(canTransition("NEGOTIATING", "READY_FOR_WEBRTC")).toBe(true);
    expect(canTransition("READY_FOR_WEBRTC", "ENDED")).toBe(true);
  });

  it("rejects illegal jumps and backward transitions", () => {
    expect(canTransition("REJECTED", "APPROVED")).toBe(false);
    expect(canTransition("EXPIRED", "NEGOTIATING")).toBe(false);
    expect(canTransition("CANCELLED", "WAITING_FOR_APPROVAL")).toBe(false);
    expect(canTransition("ENDED", "CREATED")).toBe(false);
    expect(canTransition("READY_FOR_WEBRTC", "WAITING_FOR_APPROVAL")).toBe(false);

    expect(() => validateTransition("REJECTED", "APPROVED")).toThrowError(
      /Invalid session state transition/,
    );
  });

  it("identifies terminal states", () => {
    expect(isTerminalSessionStatus("REJECTED")).toBe(true);
    expect(isTerminalSessionStatus("CANCELLED")).toBe(true);
    expect(isTerminalSessionStatus("EXPIRED")).toBe(true);
    expect(isTerminalSessionStatus("ENDED")).toBe(true);
    expect(isTerminalSessionStatus("APPROVED")).toBe(false);
    expect(isTerminalSessionStatus("WAITING_FOR_APPROVAL")).toBe(false);
  });
});
