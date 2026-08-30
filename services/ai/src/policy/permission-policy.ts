import { AiSourceType } from "@nexusdesk/types";

export class PermissionPolicyValidator {
  public static canAccessSource(sourceType: AiSourceType, grantedPermissions: string[]): boolean {
    switch (sourceType) {
      case "PUBLIC_SESSION_DATA":
        return true;

      case "AUTHORIZED_DIAGNOSTIC":
        return (
          grantedPermissions.includes("SYSTEM_INFO") || grantedPermissions.includes("PROCESS_LIST")
        );

      case "PRIVATE_SCREEN":
        return grantedPermissions.includes("AI_SCREEN_ANALYSIS");

      case "PRIVATE_LOG":
        return grantedPermissions.includes("LOG_READ");

      case "SENSITIVE_DATA":
        return false; // Sensitive data like credential stores is never accessible to AI

      default:
        return false;
    }
  }

  public static isComputerUsePermitted(grantedPermissions: string[]): boolean {
    return grantedPermissions.includes("AI_COMPUTER_USE");
  }
}
