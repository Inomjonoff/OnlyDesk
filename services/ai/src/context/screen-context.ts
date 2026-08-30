export interface ScreenVisionContext {
  sessionId: string;
  screenshotBase64: string;
  mimeType: string;
  capturedAt: number;
  width?: number;
  height?: number;
  privacyWarningAcknowledged: boolean;
}

export class ScreenContextBuilder {
  private static readonly MAX_FRESHNESS_MS = 5000;

  public static buildVisionContext(params: {
    sessionId: string;
    screenshotBase64: string;
    mimeType?: string;
    capturedAt?: number;
    width?: number;
    height?: number;
  }): ScreenVisionContext {
    return {
      sessionId: params.sessionId,
      screenshotBase64: params.screenshotBase64,
      mimeType: params.mimeType || "image/jpeg",
      capturedAt: params.capturedAt || Date.now(),
      width: params.width,
      height: params.height,
      privacyWarningAcknowledged: true,
    };
  }

  public static isScreenFresh(context: ScreenVisionContext): boolean {
    return Date.now() - context.capturedAt <= this.MAX_FRESHNESS_MS;
  }
}
