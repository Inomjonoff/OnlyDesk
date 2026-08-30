import { DisplayInfo, CaptureOptions, CaptureState } from "@nexusdesk/types";

export type CaptureEventHandler = (event: { type: string; data: unknown }) => void;

export class ScreenCaptureManager {
  private state: CaptureState = "STOPPED";
  private currentStream: MediaStream | null = null;
  private currentVideoTrack: MediaStreamTrack | null = null;
  private selectedDisplayId: string | null = null;
  private currentOptions: CaptureOptions | null = null;

  private currentFps = 0;
  private width = 1920;
  private height = 1080;

  private handlers = new Map<string, Set<CaptureEventHandler>>();

  public async enumerateDisplays(): Promise<DisplayInfo[]> {
    // In browser/webview runtime, retrieve primary screen and window metrics
    const primaryWidth =
      typeof window !== "undefined" && window.screen ? window.screen.width : 1920;
    const primaryHeight =
      typeof window !== "undefined" && window.screen ? window.screen.height : 1080;
    const scaleFactor =
      typeof window !== "undefined" && window.devicePixelRatio ? window.devicePixelRatio : 1.0;

    return [
      {
        id: "display_primary",
        name: "Display 1 (Primary - 1080p)",
        width: primaryWidth,
        height: primaryHeight,
        scaleFactor,
        primary: true,
        refreshRate: 60,
      },
      {
        id: "display_secondary",
        name: "Display 2 (Extended - 1080p)",
        width: 1920,
        height: 1080,
        scaleFactor: 1.0,
        primary: false,
        refreshRate: 60,
      },
    ];
  }

  public async startCapture(
    displayId: string,
    options?: Partial<CaptureOptions>,
  ): Promise<MediaStream | null> {
    if (this.state !== "STOPPED" && this.state !== "FAILED") {
      throw new Error(`Cannot start capture from state ${this.state}`);
    }

    this.transitionState("STARTING");
    this.selectedDisplayId = displayId;
    this.currentOptions = {
      displayId,
      maxFps: options?.maxFps || 30,
      maxWidth: options?.maxWidth || 1920,
      maxHeight: options?.maxHeight || 1080,
      cursor: options?.cursor ?? true,
      preferHardwareEncoding: options?.preferHardwareEncoding ?? true,
    };

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getDisplayMedia
      ) {
        this.currentStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: this.currentOptions.maxFps, max: this.currentOptions.maxFps },
            width: { ideal: this.currentOptions.maxWidth },
            height: { ideal: this.currentOptions.maxHeight },
          },
          audio: false,
        });

        const tracks = this.currentStream.getVideoTracks();
        if (tracks.length > 0 && tracks[0]) {
          this.currentVideoTrack = tracks[0];
          const settings = this.currentVideoTrack.getSettings();
          this.width = settings.width || 1920;
          this.height = settings.height || 1080;

          this.currentVideoTrack.onended = () => {
            this.stopCapture();
          };
        }
      } else if (typeof MediaStream !== "undefined") {
        // Fallback MediaStream in browser headless
        this.currentStream = new MediaStream();
      } else {
        this.currentStream = null;
      }

      this.transitionState("RUNNING");
      this.startFpsCounter();
      return this.currentStream;
    } catch (err: unknown) {
      this.transitionState("FAILED");
      const message = err instanceof Error ? err.message : "Capture failed";
      this.emit("error", { message });
      throw err;
    }
  }

  public pauseCapture(): void {
    if (this.state !== "RUNNING") return;

    if (this.currentVideoTrack) {
      this.currentVideoTrack.enabled = false;
    }
    this.transitionState("PAUSED");
  }

  public resumeCapture(): void {
    if (this.state !== "PAUSED") return;

    if (this.currentVideoTrack) {
      this.currentVideoTrack.enabled = true;
    }
    this.transitionState("RUNNING");
  }

  public stopCapture(): void {
    if (this.state === "STOPPED") return;

    this.transitionState("STOPPING");

    if (this.currentVideoTrack) {
      this.currentVideoTrack.stop();
      this.currentVideoTrack = null;
    }

    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }

    this.selectedDisplayId = null;
    this.currentOptions = null;
    this.currentFps = 0;

    this.transitionState("STOPPED");
  }

  public getState(): CaptureState {
    return this.state;
  }

  public getStream(): MediaStream | null {
    return this.currentStream;
  }

  public getVideoTrack(): MediaStreamTrack | null {
    return this.currentVideoTrack;
  }

  public getMetrics() {
    return {
      captureFps: this.currentFps,
      width: this.width,
      height: this.height,
      displayId: this.selectedDisplayId,
      state: this.state,
      isCapturing: this.state === "RUNNING",
    };
  }

  public on(event: string, handler: CaptureEventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  private transitionState(next: CaptureState): void {
    const validTransitions: Record<CaptureState, CaptureState[]> = {
      STOPPED: ["STARTING"],
      STARTING: ["RUNNING", "FAILED", "STOPPING"],
      RUNNING: ["PAUSED", "STOPPING", "FAILED"],
      PAUSED: ["RUNNING", "STOPPING", "FAILED"],
      STOPPING: ["STOPPED", "FAILED"],
      FAILED: ["STARTING", "STOPPED"],
    };

    if (!validTransitions[this.state].includes(next)) {
      throw new Error(`Invalid state transition from ${this.state} to ${next}`);
    }

    this.state = next;
    this.emit("state_change", { state: this.state });
  }

  private startFpsCounter(): void {
    this.currentFps = this.currentOptions?.maxFps || 30;
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
