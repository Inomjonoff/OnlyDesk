import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(Number(process.env.API_PORT || process.env.PORT) || 4000),
  SIGNALING_PORT: z.coerce.number().default(Number(process.env.SIGNALING_PORT || process.env.PORT) || 4001),
  AI_PORT: z.coerce.number().default(Number(process.env.AI_PORT || process.env.PORT) || 4002),
  WORKER_PORT: z.coerce.number().default(Number(process.env.WORKER_PORT || process.env.PORT) || 4003),
  DATABASE_URL: z
    .string()
    .default("postgresql://nexus:nexuspassword@localhost:5432/nexusdesk?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16).default("dev-jwt-secret-min-16-characters-long"),
  JWT_REFRESH_SECRET: z.string().min(16).default("dev-jwt-refresh-secret-min-16-characters-long"),
  STUN_SERVER_URL: z.string().default("stun:stun.l.google.com:19302"),
  TURN_HOST: z.string().optional(),
  TURN_PORT: z.coerce.number().optional(),
  TURN_USERNAME: z.string().optional(),
  TURN_PASSWORD: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  AI_ENABLED: z.coerce.boolean().default(true),
  AI_DEFAULT_PROVIDER: z
    .enum(["openai", "anthropic", "google", "openrouter", "ollama"])
    .default("google"),
  AI_DEFAULT_MODEL: z.string().default("gemini-2.0-flash"),
  AI_VISION_ENABLED: z.coerce.boolean().default(true),
  AI_COMPUTER_USE_ENABLED: z.coerce.boolean().default(false),
  AI_AUTOMATION_MODE: z
    .enum(["OBSERVE_ONLY", "RECOMMEND", "ASK_BEFORE_ACTION", "LIMITED_AUTO"])
    .default("ASK_BEFORE_ACTION"),
  AI_PROVIDER_FALLBACK_ENABLED: z.coerce.boolean().default(true),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DEMO_MODE: z.coerce.boolean().default(false),
  PRODUCTION_DOMAIN: z.string().default("nexusdesk.uz"),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

let parsedEnv: EnvConfig | null = null;

export function validateProductionEnvironment(env: EnvConfig): void {
  if (env.NODE_ENV === "production") {
    if (env.JWT_SECRET === "dev-jwt-secret-min-16-characters-long") {
      throw new Error("CRITICAL SECURITY ERROR: Production deployment cannot use default development JWT_SECRET");
    }
    if (env.JWT_REFRESH_SECRET === "dev-jwt-refresh-secret-min-16-characters-long") {
      throw new Error("CRITICAL SECURITY ERROR: Production deployment cannot use default development JWT_REFRESH_SECRET");
    }
    if (env.DATABASE_URL.includes("nexuspassword@localhost")) {
      throw new Error("CRITICAL SECURITY ERROR: Production deployment cannot point to local development database with default password");
    }
  }
}

export function getEnv(): EnvConfig {
  if (!parsedEnv) {
    const result = EnvSchema.safeParse(process.env);
    if (!result.success) {
      // Provide actionable error
      throw new Error(
        `Environment validation failed: ${JSON.stringify(result.error.format(), null, 2)}`,
      );
    }
    validateProductionEnvironment(result.data);
    parsedEnv = result.data;
  }
  return parsedEnv;
}
