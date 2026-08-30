import { z } from "zod";

export const SessionPermissionEnum = z.enum([
  "SCREEN_VIEW",
  "MOUSE_CONTROL",
  "KEYBOARD_CONTROL",
  "CLIPBOARD_READ",
  "CLIPBOARD_WRITE",
  "FILE_READ",
  "FILE_WRITE",
  "SYSTEM_INFO",
  "PROCESS_LIST",
  "LOG_READ",
  "COMMAND_REQUEST",
  "RECORDING",
  "AI_ANALYSIS",
  "AI_SCREEN_ANALYSIS",
  "AI_COMPUTER_USE",
]);

export const SessionEndReasonEnum = z.enum([
  "USER_ENDED",
  "REMOTE_REJECTED",
  "TIMEOUT",
  "DEVICE_OFFLINE",
  "SERVER_ERROR",
  "CANCELLED",
  "SECURITY_POLICY",
]);

export const CreateSessionSchema = z.object({
  targetDeviceId: z.string().min(1, "Target device ID is required"),
  initiatorDeviceId: z.string().optional(),
  requestedPermissions: z
    .array(SessionPermissionEnum)
    .min(1, "At least one permission is required"),
});

export const ApproveSessionSchema = z.object({
  grantedPermissions: z
    .array(SessionPermissionEnum)
    .min(1, "At least one granted permission is required"),
});

export const RejectSessionSchema = z.object({
  reason: SessionEndReasonEnum.optional().default("REMOTE_REJECTED"),
});

export const CancelSessionSchema = z.object({
  reason: SessionEndReasonEnum.optional().default("CANCELLED"),
});

export const EndSessionSchema = z.object({
  reason: SessionEndReasonEnum.optional().default("USER_ENDED"),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type ApproveSessionInput = z.infer<typeof ApproveSessionSchema>;
export type RejectSessionInput = z.infer<typeof RejectSessionSchema>;
export type CancelSessionInput = z.infer<typeof CancelSessionSchema>;
export type EndSessionInput = z.infer<typeof EndSessionSchema>;
