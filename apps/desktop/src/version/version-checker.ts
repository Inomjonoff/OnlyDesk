export interface VersionCheckResult {
  compatible: boolean;
  updateRequired: boolean;
  updateAvailable: boolean;
  latestVersion: string;
  message: string;
}

export class DesktopVersionChecker {
  private static readonly CURRENT_VERSION = "1.0.0-beta.1";
  private static readonly CURRENT_PROTOCOL = 1;

  public static getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }

  public static async checkCompatibility(apiUrl: string): Promise<VersionCheckResult> {
    try {
      const res = await fetch(`${apiUrl}/api/v1/version/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientVersion: this.CURRENT_VERSION,
          protocolVersion: this.CURRENT_PROTOCOL,
          platform: "WINDOWS",
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      return (await res.json()) as VersionCheckResult;
    } catch {
      // Offline fallback: allow local execution
      return {
        compatible: true,
        updateRequired: false,
        updateAvailable: false,
        latestVersion: this.CURRENT_VERSION,
        message: "Offline mode. Running current client.",
      };
    }
  }
}
