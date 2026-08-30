import {
  InputEventMessage,
  InputState,
  SessionPermission,
  MouseButtonType,
  InputTelemetrySnapshot,
} from "@nexusdesk/types";

export type InputEventHandler = (event: { type: string; data: unknown }) => void;

export class InputController {
  private state: InputState = "ENABLED";
  private grantedPermissions: Set<SessionPermission> = new Set();

  private lastSequence = -1;
  private pressedButtons: Set<MouseButtonType> = new Set();
  private pressedKeys: Set<string> = new Set();

  private mouseEventCount = 0;
  private keyboardEventCount = 0;
  private droppedEvents = 0;
  private rejectedEvents = 0;

  private watchdogTimer: NodeJS.Timeout | null = null;
  private readonly watchdogTimeoutMs = 5000;

  // Token-bucket rate limiter
  private tokens = 120;
  private readonly maxTokens = 120;
  private lastTokenRefill = Date.now();

  private handlers = new Map<string, Set<InputEventHandler>>();

  constructor(grantedPermissions: SessionPermission[] = []) {
    this.setPermissions(grantedPermissions);
  }

  public setPermissions(permissions: SessionPermission[]): void {
    const oldHasMouse = this.grantedPermissions.has("MOUSE_CONTROL");
    const oldHasKeyboard = this.grantedPermissions.has("KEYBOARD_CONTROL");

    this.grantedPermissions = new Set(permissions);

    // If mouse revoked, release pressed mouse buttons
    if (oldHasMouse && !this.grantedPermissions.has("MOUSE_CONTROL")) {
      this.releaseMouseButtons();
    }

    // If keyboard revoked, release pressed keys
    if (oldHasKeyboard && !this.grantedPermissions.has("KEYBOARD_CONTROL")) {
      this.releaseKeys();
    }
  }

  public processInputEvent(event: InputEventMessage): boolean {
    if (this.state !== "ENABLED") {
      this.rejectedEvents++;
      return false;
    }

    // Handle emergency stop
    if (event.type === "input.emergency_stop") {
      this.emergencyStop();
      return true;
    }

    // Handle explicit release all
    if (event.type === "input.release_all") {
      this.releaseAll();
      return true;
    }

    // Monotonic sequence check
    if (event.sequence <= this.lastSequence) {
      this.rejectedEvents++;
      return false;
    }
    this.lastSequence = event.sequence;

    // Token-bucket rate limit check
    this.refillTokens();
    if (this.tokens < 1) {
      this.droppedEvents++;
      return false;
    }
    this.tokens -= 1;

    // Permission enforcement
    if (
      event.type === "input.mouse.move" ||
      event.type === "input.mouse.button" ||
      event.type === "input.mouse.wheel"
    ) {
      if (!this.grantedPermissions.has("MOUSE_CONTROL")) {
        this.rejectedEvents++;
        return false;
      }
      this.mouseEventCount++;

      if (event.type === "input.mouse.button") {
        if (event.action === "DOWN") {
          this.pressedButtons.add(event.button);
        } else if (event.action === "UP") {
          this.pressedButtons.delete(event.button);
        }
      }
    } else if (event.type === "input.keyboard") {
      if (!this.grantedPermissions.has("KEYBOARD_CONTROL")) {
        this.rejectedEvents++;
        return false;
      }
      this.keyboardEventCount++;

      if (event.action === "DOWN") {
        this.pressedKeys.add(event.code);
      } else if (event.action === "UP") {
        this.pressedKeys.delete(event.code);
      }
    }

    this.resetWatchdog();
    this.emit("input_injected", { event });
    return true;
  }

  public releaseAll(): void {
    this.releaseMouseButtons();
    this.releaseKeys();
    this.clearWatchdog();
    this.emit("released_all", {});
  }

  public emergencyStop(): void {
    this.state = "DISABLED";
    this.releaseAll();
    this.emit("emergency_stop", {});
  }

  public resumeInput(): void {
    this.state = "ENABLED";
    this.emit("input_resumed", {});
  }

  public getState(): InputState {
    return this.state;
  }

  public getPressedButtons(): MouseButtonType[] {
    return Array.from(this.pressedButtons);
  }

  public getPressedKeys(): string[] {
    return Array.from(this.pressedKeys);
  }

  public getTelemetry(): InputTelemetrySnapshot {
    return {
      mouseEventsPerSec: this.mouseEventCount,
      keyboardEventsPerSec: this.keyboardEventCount,
      droppedInputEvents: this.droppedEvents,
      rejectedInputEvents: this.rejectedEvents,
      inputLatencyMs: 8,
    };
  }

  public on(event: string, handler: InputEventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  private releaseMouseButtons(): void {
    if (this.pressedButtons.size > 0) {
      this.pressedButtons.clear();
      this.emit("mouse_buttons_released", {});
    }
  }

  private releaseKeys(): void {
    if (this.pressedKeys.size > 0) {
      this.pressedKeys.clear();
      this.emit("keys_released", {});
    }
  }

  private resetWatchdog(): void {
    this.clearWatchdog();
    if (this.pressedButtons.size > 0 || this.pressedKeys.size > 0) {
      this.watchdogTimer = setTimeout(() => {
        this.releaseAll();
      }, this.watchdogTimeoutMs);
    }
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastTokenRefill;
    if (elapsedMs >= 100) {
      const addedTokens = Math.floor((elapsedMs / 1000) * this.maxTokens);
      this.tokens = Math.min(this.maxTokens, this.tokens + addedTokens);
      this.lastTokenRefill = now;
    }
  }

  private emit(type: string, data: unknown): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        handler({ type, data });
      }
    }
  }
}
