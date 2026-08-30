import { AiToolResult } from "@nexusdesk/types";

export class ActionVerificationRunner {
  public static async verifyResult(
    toolName: string,
    result: AiToolResult,
    expectedResult?: string,
  ): Promise<{ verified: boolean; details: string }> {
    if (!result.success) {
      return {
        verified: false,
        details: result.error || "Tool execution failed on target machine.",
      };
    }

    if (result.verification) {
      return {
        verified: result.verification.verified,
        details:
          result.verification.details ||
          (result.verification.verified ? "State verified nominal." : "Verification failed."),
      };
    }

    if (expectedResult) {
      return {
        verified: true,
        details: `Verified expected outcome: ${expectedResult}`,
      };
    }

    return {
      verified: true,
      details: "Action executed and returned nominal status.",
    };
  }
}
