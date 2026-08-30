export interface SafeDiagnosticBundle {
  clientVersion: string;
  platform: string;
  webrtcState: string;
  iceState: string;
  roundTripTimeMs?: number;
  packetLossPercent?: number;
  captureEngine: string;
  recentErrorCodes: string[];
  timestamp: string;
}

export class DesktopDiagnosticBundleGenerator {
  public static generateBundle(
    webrtcState = "CONNECTED",
    iceState = "COMPLETED",
    rttMs = 24,
    recentErrors: string[] = [],
  ): SafeDiagnosticBundle {
    return {
      clientVersion: "1.0.0-beta.1",
      platform: "Windows x64",
      webrtcState,
      iceState,
      roundTripTimeMs: rttMs,
      packetLossPercent: 0.0,
      captureEngine: "DXGI_DESKTOP_DUPLICATION",
      recentErrorCodes: recentErrors,
      timestamp: new Date().toISOString(),
    };
  }

  public static toFormattedJson(bundle: SafeDiagnosticBundle): string {
    return JSON.stringify(bundle, null, 2);
  }
}
