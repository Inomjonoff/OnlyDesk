import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  twoFactorCode: z.string().length(6, "2FA code must be 6 digits").optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const TwoFactorSetupSchema = z.object({
  userId: z.string().optional(),
});

export const TwoFactorVerifySchema = z.object({
  secret: z.string().min(16, "Secret is required"),
  code: z.string().length(6, "Verification code must be 6 digits"),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type TwoFactorVerifyInput = z.infer<typeof TwoFactorVerifySchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
