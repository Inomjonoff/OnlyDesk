export const APP_NAME = "NexusDesk AI";
export const APP_VERSION = "0.1.0";

export const DEFAULT_PORTS = {
  API: 4000,
  SIGNALING: 4001,
  AI: 4002,
  WORKER: 4003,
  WEB: 3000,
  ADMIN: 3001,
} as const;

export const TIMEOUTS = {
  SESSION_REQUEST_EXPIRY_MS: 30_000, // 30 seconds to approve
  HEARTBEAT_INTERVAL_MS: 5_000,
  HEARTBEAT_TIMEOUT_MS: 15_000,
  AI_REQUEST_TIMEOUT_MS: 25_000,
  WEBRTC_CONNECT_TIMEOUT_MS: 20_000,
  TRANSFER_REQUEST_EXPIRY_MS: 60_000, // 60 seconds to approve file
  TRANSFER_IDLE_TIMEOUT_MS: 300_000, // 5 minutes no progress timeout
  RECORDING_REQUEST_EXPIRY_MS: 30_000, // 30 seconds to approve recording
} as const;

export const RATE_LIMITS = {
  AUTH_MAX_ATTEMPTS: 5,
  AUTH_WINDOW_SEC: 60,
  API_DEFAULT_MAX_RPS: 100,
  AI_MAX_REQUESTS_PER_MIN: 20,
  MAX_CLIPBOARD_EVENTS_PER_SECOND: 10,
  MAX_TRANSFER_REQUESTS_PER_MIN: 30,
  MAX_CHAT_MESSAGES_PER_SECOND: 10,
} as const;

export const FILE_TRANSFER_CONFIG = {
  DEFAULT_CHUNK_SIZE_BYTES: 1024 * 1024, // 1 MiB chunk
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024 * 1024, // 10 GB limit
  MAX_CONCURRENT_TRANSFERS: 2,
  BUFFER_HIGH_WATER_MARK_BYTES: 4 * 1024 * 1024, // 4 MiB pause producer
  BUFFER_LOW_WATER_MARK_BYTES: 1024 * 1024, // 1 MiB resume producer
  DEFAULT_DOWNLOAD_DIR_NAME: "NexusDesk Downloads",
} as const;

export const CLIPBOARD_CONFIG = {
  MAX_TEXT_BYTES: 1024 * 1024, // 1 MiB
  MAX_IMAGE_BYTES: 10 * 1024 * 1024, // 10 MiB
  MAX_IMAGE_WIDTH: 8192,
  MAX_IMAGE_HEIGHT: 8192,
  DEBOUNCE_MS: 250,
} as const;

export const CHAT_CONFIG = {
  MAX_MESSAGE_BYTES: 16 * 1024, // 16 KiB
  MAX_MESSAGES_PER_PAGE: 50,
  RETENTION_DAYS: 30,
} as const;

export const RECORDING_CONFIG = {
  SEGMENT_DURATION_MS: 300_000, // 5 minutes segment
  MAX_DURATION_MS: 4 * 3600 * 1000, // 4 hours max recording
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024 * 1024, // 20 GB limit
  RETENTION_DAYS: 30,
  SIGNED_URL_TTL_SEC: 900, // 15 minutes
  DEFAULT_TEMP_DIR_NAME: ".nexusdesk-recordings-temp",
} as const;

export const AI_CONFIG = {
  REQUEST_TIMEOUT_MS: 30_000,
  MAX_TOOL_STEPS: 8,
  MAX_ACTIONS_PER_REQUEST: 3,
  ACTION_TIMEOUT_MS: 30_000,
  ACTION_EXPIRY_SEC: 60,
  CONTEXT_MAX_TOKENS: 8192,
  MAX_CHAT_MESSAGE_BYTES: 16_384,
  MAX_VISION_REQUESTS_PER_MIN: 10,
  MAX_REQUESTS_PER_MIN: 20,
  MAX_COMPUTER_USE_STEPS: 5,
  COMPUTER_USE_MAX_DURATION_SEC: 30,
  AUTOMATION_SESSION_LIMIT_SEC: 300,
  SCREEN_FRESHNESS_THRESHOLD_MS: 5_000,
  RETENTION_DAYS: 30,
  VISION_RETENTION_DAYS: 7,
  DEFAULT_AUTOMATION_MODE: "ASK_BEFORE_ACTION" as const,
  DEFAULT_AI_CONTEXT_MODE: "MINIMAL" as const,
} as const;

export const PRODUCTION_CONFIG = {
  DOMAIN: "nexusdesk.uz",
  APP_URL: "https://app.nexusdesk.uz",
  API_URL: "https://api.nexusdesk.uz",
  SIGNAL_URL: "wss://signal.nexusdesk.uz",
  TURN_URL: "turn:turn.nexusdesk.uz:3478",
  STATUS_URL: "https://status.nexusdesk.uz",
  ALLOWED_ORIGINS: [
    "https://nexusdesk.uz",
    "https://app.nexusdesk.uz",
    "https://admin.nexusdesk.uz",
    "http://localhost:3000",
    "http://localhost:5173",
    "tauri://localhost",
  ],
  SESSION_RATE_LIMIT_PER_MIN: 10,
  AUTH_RATE_LIMIT_PER_MIN: 5,
  TURN_BANDWIDTH_LIMIT_KBPS: 2500,
  PROMETHEUS_METRICS_PATH: "/metrics",
  HEALTH_CHECK_PATH: "/health",
  READY_CHECK_PATH: "/ready",
  LIVE_CHECK_PATH: "/live",
} as const;

export const DEMO_QUOTAS = {
  MAX_REGISTERED_USERS: 100,
  MAX_CONCURRENT_SESSIONS: 10,
  MAX_SESSION_DURATION_SEC: 1800, // 30 minutes max per free session
  MAX_TRANSFER_FILE_SIZE_BYTES: 100 * 1024 * 1024, // 100 MB max file transfer
  MAX_RECORDING_DURATION_SEC: 900, // 15 minutes max per free recording
  DAILY_AI_REQUESTS_PER_USER: 50,
  BANDWIDTH_LIMIT_MBPS_PER_SESSION: 5.0,
} as const;

export const CHUNK_SIZE_BYTES = FILE_TRANSFER_CONFIG.DEFAULT_CHUNK_SIZE_BYTES;
