const SECRET_PATTERNS = [
  /(?:password|passwd|pwd|secret|apiKey|api_key|token|auth|bearer)\s*[:=]\s*["']?([A-Za-z0-9_\-\.]{8,})["']?/gi,
  /-----BEGIN [A-Z ]+KEY-----[\s\S]*?-----END [A-Z ]+KEY-----/g,
  /Bearer\s+[A-Za-z0-9_\-\.]+/gi,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWTs
  /AKIA[0-9A-Z]{16}/g, // AWS Access Key ID
  /(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@[^\s/]+/gi, // DB Connection Strings with passwords
  /(?:AIza[0-9A-Za-z-_]{35})/g, // Google API Key
  /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}/g, // GitHub Personal Access Tokens
  /(?:sk-[a-zA-Z0-9]{48})/g, // OpenAI legacy API keys
  /(?:sk-ant-[a-zA-Z0-9_\-]{40,})/g, // Anthropic API keys
];

export function redactSecretsFromText(text: string): string {
  if (!text) return "";
  let sanitized = text;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED_SECRET]");
  }
  return sanitized;
}

export function redactSecretsFromObject(obj: unknown): unknown {
  if (typeof obj === "string") {
    return redactSecretsFromText(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSecretsFromObject(item));
  }
  if (obj !== null && typeof obj === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("password") ||
        lowerKey.includes("passwd") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("token") ||
        lowerKey.includes("auth") ||
        lowerKey.includes("cookie") ||
        lowerKey.includes("private") ||
        lowerKey.includes("credential") ||
        lowerKey.includes("apikey") ||
        lowerKey.includes("api_key")
      ) {
        clean[key] = "[REDACTED]";
      } else {
        clean[key] = redactSecretsFromObject(value);
      }
    }
    return clean;
  }
  return obj;
}

export function redactProcessCommandLine(commandLine: string): string {
  if (!commandLine) return "";
  // 1. Redact flags like --password=XYZ or -p XYZ or --api-key=XYZ
  let sanitized = commandLine.replace(
    /(?:--password|--passwd|--token|--key|--api-key|--secret|-p)\s*[=\s]\s*([^\s]+)/gi,
    "--credential=[REDACTED]",
  );
  // 2. Redact general secret patterns
  sanitized = redactSecretsFromText(sanitized);
  return sanitized;
}
