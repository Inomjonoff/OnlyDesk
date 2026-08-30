import {
  InputEventMessage,
  MouseButtonType,
  ButtonActionType,
  ViewerScalingMode,
} from "@nexusdesk/types";
import { CoordinateMapper, ContainerRect } from "./coordinate-mapper";

export interface InputSender {
  sendInput(message: InputEventMessage): void;
}

export class InputClient {
  private sender: InputSender | null = null;
  private sequence = 0;
  private enabled = true;

  private pendingMouseMove: { clientX: number; clientY: number } | null = null;
  private moveThrottleTimer: NodeJS.Timeout | null = null;
  private readonly moveIntervalMs = 16; // ~60 Hz coalesced mouse movement

  constructor(sender?: InputSender) {
    if (sender) this.sender = sender;
  }

  public setSender(sender: InputSender): void {
    this.sender = sender;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.sendReleaseAll();
    }
  }

  public handleMouseMove(
    clientX: number,
    clientY: number,
    container: ContainerRect,
    videoWidth: number,
    videoHeight: number,
    scalingMode: ViewerScalingMode = "contain",
  ): void {
    if (!this.enabled) return;

    this.pendingMouseMove = { clientX, clientY };

    if (!this.moveThrottleTimer) {
      this.moveThrottleTimer = setTimeout(() => {
        this.moveThrottleTimer = null;
        if (this.pendingMouseMove) {
          const norm = CoordinateMapper.normalizePoint(
            this.pendingMouseMove.clientX,
            this.pendingMouseMove.clientY,
            container,
            videoWidth,
            videoHeight,
            scalingMode,
          );

          if (norm) {
            this.sequence++;
            this.emitEvent({
              type: "input.mouse.move",
              sequence: this.sequence,
              timestamp: Date.now(),
              x: norm.x,
              y: norm.y,
            });
          }
          this.pendingMouseMove = null;
        }
      }, this.moveIntervalMs);
    }
  }

  public handleMouseButton(
    button: MouseButtonType,
    action: ButtonActionType,
    clientX: number,
    clientY: number,
    container: ContainerRect,
    videoWidth: number,
    videoHeight: number,
    scalingMode: ViewerScalingMode = "contain",
  ): void {
    if (!this.enabled) return;

    const norm = CoordinateMapper.normalizePoint(
      clientX,
      clientY,
      container,
      videoWidth,
      videoHeight,
      scalingMode,
    );

    if (norm) {
      this.sequence++;
      this.emitEvent({
        type: "input.mouse.button",
        sequence: this.sequence,
        timestamp: Date.now(),
        button,
        action,
        x: norm.x,
        y: norm.y,
      });
    }
  }

  public handleMouseWheel(
    deltaX: number,
    deltaY: number,
    clientX: number,
    clientY: number,
    container: ContainerRect,
    videoWidth: number,
    videoHeight: number,
    scalingMode: ViewerScalingMode = "contain",
  ): void {
    if (!this.enabled) return;

    const norm = CoordinateMapper.normalizePoint(
      clientX,
      clientY,
      container,
      videoWidth,
      videoHeight,
      scalingMode,
    );

    if (norm) {
      this.sequence++;
      this.emitEvent({
        type: "input.mouse.wheel",
        sequence: this.sequence,
        timestamp: Date.now(),
        deltaX: Math.round(deltaX),
        deltaY: Math.round(deltaY),
        x: norm.x,
        y: norm.y,
      });
    }
  }

  public handleKeyboard(
    code: string,
    key: string,
    action: "DOWN" | "UP",
    modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean },
    repeat = false,
  ): void {
    if (!this.enabled) return;

    this.sequence++;
    this.emitEvent({
      type: "input.keyboard",
      sequence: this.sequence,
      timestamp: Date.now(),
      code,
      key,
      action,
      repeat,
      modifiers,
    });
  }

  public sendReleaseAll(): void {
    this.sequence++;
    this.emitEvent({
      type: "input.release_all",
      sequence: this.sequence,
      timestamp: Date.now(),
    });
  }

  public sendEmergencyStop(): void {
    this.sequence++;
    this.emitEvent({
      type: "input.emergency_stop",
      sequence: this.sequence,
      timestamp: Date.now(),
    });
  }

  private emitEvent(event: InputEventMessage): void {
    if (this.sender) {
      this.sender.sendInput(event);
    }
  }
}
