import { describe, it, expect } from "vitest";
import { InputClient } from "../input-client";
import { ContainerRect } from "../coordinate-mapper";
import { InputEventMessage } from "@nexusdesk/types";

describe("Phase 5: InputClient Viewer Input Capture & Event Generation Tests", () => {
  const container: ContainerRect = { left: 0, top: 0, width: 1920, height: 1080 };

  it("normalizes and sends mouse button events with monotonic sequence numbers", () => {
    const emittedEvents: InputEventMessage[] = [];
    const client = new InputClient({
      sendInput: (msg) => emittedEvents.push(msg),
    });

    client.handleMouseButton("LEFT", "DOWN", 960, 540, container, 1920, 1080, "fit");
    client.handleMouseButton("LEFT", "UP", 960, 540, container, 1920, 1080, "fit");

    expect(emittedEvents.length).toBe(2);
    expect(emittedEvents[0]!.type).toBe("input.mouse.button");
    expect(emittedEvents[0]!.sequence).toBe(1);
    expect(emittedEvents[1]!.sequence).toBe(2);

    const btnEvent = emittedEvents[0] as { x: number; y: number; button: string; action: string };
    expect(btnEvent.x).toBeCloseTo(0.5, 2);
    expect(btnEvent.y).toBeCloseTo(0.5, 2);
    expect(btnEvent.button).toBe("LEFT");
    expect(btnEvent.action).toBe("DOWN");
  });

  it("captures keyboard keydown and keyup events with modifiers", () => {
    const emittedEvents: InputEventMessage[] = [];
    const client = new InputClient({
      sendInput: (msg) => emittedEvents.push(msg),
    });

    client.handleKeyboard("KeyC", "c", "DOWN", { ctrl: true });

    expect(emittedEvents.length).toBe(1);
    const keyEvent = emittedEvents[0] as {
      type: string;
      code: string;
      key: string;
      modifiers: { ctrl?: boolean };
    };
    expect(keyEvent.type).toBe("input.keyboard");
    expect(keyEvent.code).toBe("KeyC");
    expect(keyEvent.modifiers.ctrl).toBe(true);
  });

  it("sends emergency stop message when invoked", () => {
    const emittedEvents: InputEventMessage[] = [];
    const client = new InputClient({
      sendInput: (msg) => emittedEvents.push(msg),
    });

    client.sendEmergencyStop();

    expect(emittedEvents.length).toBe(1);
    expect(emittedEvents[0]!.type).toBe("input.emergency_stop");
  });
});
