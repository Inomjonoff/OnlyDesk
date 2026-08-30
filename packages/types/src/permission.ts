export type SessionPermission =
  | "SCREEN_VIEW"
  | "MOUSE_CONTROL"
  | "KEYBOARD_CONTROL"
  | "CLIPBOARD_READ"
  | "CLIPBOARD_WRITE"
  | "FILE_READ"
  | "FILE_WRITE"
  | "SYSTEM_INFO"
  | "PROCESS_LIST"
  | "LOG_READ"
  | "COMMAND_REQUEST"
  | "RECORDING"
  | "AI_ANALYSIS"
  | "AI_SCREEN_ANALYSIS"
  | "AI_COMPUTER_USE";

export type PermissionState = "ALWAYS_ALLOWED" | "ASK_EVERY_TIME" | "DISABLED";

export interface SessionPermissionGrant {
  permission: SessionPermission;
  granted: boolean;
  grantedAt?: Date;
  expiresAt?: Date;
}

export type PermissionMap = Record<SessionPermission, boolean>;

export const DEFAULT_SESSION_PERMISSIONS: PermissionMap = {
  SCREEN_VIEW: true,
  MOUSE_CONTROL: false,
  KEYBOARD_CONTROL: false,
  CLIPBOARD_READ: false,
  CLIPBOARD_WRITE: false,
  FILE_READ: false,
  FILE_WRITE: false,
  SYSTEM_INFO: false,
  PROCESS_LIST: false,
  LOG_READ: false,
  COMMAND_REQUEST: false,
  RECORDING: false,
  AI_ANALYSIS: false,
  AI_SCREEN_ANALYSIS: false,
  AI_COMPUTER_USE: false,
};
