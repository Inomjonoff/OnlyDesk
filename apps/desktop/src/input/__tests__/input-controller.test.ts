import { describe, it, expect } from "vitest";
import { InputController } from "../input-controller";
import { InputMouseMoveEvent, InputMouseButtonEvent, InputKeyboardEvent } from "@nexusdesk/types";

describe("Phase 5: InputController Host Enforcement & Safety Tests", () => {
  it("enforces permission gating for mouse and keyboard events independently", () => {
    // Only MOUSE_CONTROL granted
    const ctrl = new InputController(["MOUSE_CONTROL"]);

    const mouseMove: InputMouseMoveEvent = {
      type: "input.mouse.move",
      sequence: 1,
      timestamp: Date.now(),
      x: 0.5,
      y: 0.5,
    };

    const keyboardEvent: InputKeyboardEvent = {
      type: "input.keyboard",
      sequence: 2,
      timestamp: Date.now(),
      code: "KeyA",
      key: "a",
      action: "DOWN",
      modifiers: {},
    };

    // Mouse move should be accepted
    expect(ctrl.processInputEvent(mouseMove)).toBe(true);

    // Keyboard event should be rejected
    expect(ctrl.processInputEvent(keyboardEvent)).toBe(false);

    // Now grant KEYBOARD_CONTROL
    ctrl.setPermissions(["MOUSE_CONTROL", "KEYBOARD_CONTROL"]);
    const keyboardEvent2: InputKeyboardEvent = {
      type: "input.keyboard",
      sequence: 3,
      timestamp: Date.now(),
      code: "KeyA",
      key: "a",
      action: "DOWN",
      modifiers: {},
    };
    expect(ctrl.processInputEvent(keyboardEvent2)).toBe(true);
  });

  it("enforces strict monotonic sequence numbers to prevent replay attacks", () => {
    const ctrl = new InputController(["MOUSE_CONTROL"]);

    const eventSeq10: InputMouseMoveEvent = {
      type: "input.mouse.move",
      sequence: 10,
      timestamp: Date.now(),
      x: 0.5,
      y: 0.5,
    };

    const eventSeq5: InputMouseMoveEvent = {
      type: "input.mouse.move",
      sequence: 5, // Out of order / replay
      timestamp: Date.now(),
      x: 0.6,
      y: 0.6,
    };

    expect(ctrl.processInputEvent(eventSeq10)).toBe(true);
    expect(ctrl.processInputEvent(eventSeq5)).toBe(false);
  });

  it("tracks pressed buttons and releases them completely on releaseAll()", () => {
    const ctrl = new InputController(["MOUSE_CONTROL", "KEYBOARD_CONTROL"]);

    const btnDown: InputMouseButtonEvent = {
      type: "input.mouse.button",
      sequence: 1,
      timestamp: Date.now(),
      button: "LEFT",
      action: "DOWN",
      x: 0.5,
      y: 0.5,
    };

    const keyDown: InputKeyboardEvent = {
      type: "input.keyboard",
      sequence: 2,
      timestamp: Date.now(),
      code: "ShiftLeft",
      key: "Shift",
      action: "DOWN",
      modifiers: { shift: true },
    };

    ctrl.processInputEvent(btnDown);
    ctrl.processInputEvent(keyDown);

    expect(ctrl.getPressedButtons()).toContain("LEFT");
    expect(ctrl.getPressedKeys()).toContain("ShiftLeft");

    // Execute release all
    ctrl.releaseAll();
    expect(ctrl.getPressedButtons().length).toBe(0);
    expect(ctrl.getPressedKeys().length).toBe(0);
  });

  it("disables input immediately on emergency stop", () => {
    const ctrl = new InputController(["MOUSE_CONTROL"]);
    expect(ctrl.getState()).toBe("ENABLED");

    ctrl.emergencyStop();
    expect(ctrl.getState()).toBe("DISABLED");

    // Any subsequent input should be rejected
    const mouseMove: InputMouseMoveEvent = {
      type: "input.mouse.move",
      sequence: 100,
      timestamp: Date.now(),
      x: 0.5,
      y: 0.5,
    };
    expect(ctrl.processInputEvent(mouseMove)).toBe(false);
  });
});
