import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  DIRECT_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  SLACK_CLIENT_ID: string;
  SLACK_CLIENT_SECRET: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  SLACK_TEAM_ID: string;
  ALLOWED_ORIGINS: string[];
  API_BASE_URL: string;
  FRONTEND_URL: string;
  ENABLE_DEV_LOGIN: boolean;
}

// Issue #1 修復：JWT Secret 安全性檢查
// 生產環境必須設定環境變數，否則拋出錯誤；開發環境允許預設值但記錄警告。
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET 環境變數未設定。生產環境中必須設定此變數，禁止使用預設值。",
    );
  }

  // Using console.warn here to avoid circular dependency with logger (logger imports env)
  console.warn(
    "[安全警告] JWT_SECRET 未設定，使用開發環境預設值。請勿在生產環境中使用。",
  );
  return "dev-only-secret-key";
};

const getJwtRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_REFRESH_SECRET 環境變數未設定。生產環境中必須設定此變數，禁止使用預設值。",
    );
  }

  console.warn(
    "[安全警告] JWT_REFRESH_SECRET 未設定，使用開發環境預設值。請勿在生產環境中使用。",
  );
  return "dev-only-refresh-secret-key";
};

export const env: EnvConfig = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "",
  DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  JWT_SECRET: getJwtSecret(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "2h",
  JWT_REFRESH_SECRET: getJwtRefreshSecret(),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || "",
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || "",
  SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || "",
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || "",
  SLACK_TEAM_ID: process.env.SLACK_TEAM_ID || "",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(",") || [],
  API_BASE_URL: process.env.API_BASE_URL || "http://localhost:3000",
  FRONTEND_URL:
    process.env.FRONTEND_URL ||
    process.env.ALLOWED_ORIGINS?.split(",")[0] ||
    "http://localhost:5173",
  ENABLE_DEV_LOGIN: process.env.ENABLE_DEV_LOGIN === "true",
};

// Issue #4 修復：完整的環境變數驗證
const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];

const optionalSlackVars = [
  "SLACK_BOT_TOKEN",
  "SLACK_CLIENT_ID",
  "SLACK_CLIENT_SECRET",
  "SLACK_SIGNING_SECRET",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingVars.length > 0 && process.env.NODE_ENV === "production") {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(", ")}`,
  );
}

if (missingVars.length > 0) {
  // Using console.warn here to avoid circular dependency with logger (logger imports env)
  console.warn(
    `Missing environment variables (dev mode): ${missingVars.join(", ")}`,
  );
}

const missingSlackVars = optionalSlackVars.filter((v) => !process.env[v]);
if (missingSlackVars.length > 0) {
  console.warn(
    `[Slack] Optional Slack variables not set: ${missingSlackVars.join(", ")}. Slack features will be disabled.`,
  );
}

// ---------------------------------------------------------------------------
// GitLab feature detection
// ---------------------------------------------------------------------------
// GitLab integration requires GITLAB_ENCRYPTION_KEY to store OAuth tokens.
// If any GitLab-related instance vars are partially set, warn at startup so the
// server doesn't silently start and then crash with 500 on the first GitLab API
// call.

const gitlabInstanceVars = ["GITLAB_ENCRYPTION_KEY", "GITLAB_ENCRYPTION_SALT"];

const missingGitlabVars = gitlabInstanceVars.filter((v) => !process.env[v]);

/**
 * True when all required GitLab environment variables are present.
 * Use this flag to guard GitLab-dependent code paths instead of letting them
 * crash with an obscure 500 at runtime.
 */
export const gitlabEnabled = missingGitlabVars.length === 0;

if (!gitlabEnabled) {
  console.warn(
    `[GitLab] Required GitLab variables not set: ${missingGitlabVars.join(", ")}. ` +
      "GitLab features will return errors when accessed. " +
      "Set GITLAB_ENCRYPTION_KEY and GITLAB_ENCRYPTION_SALT to enable GitLab integration.",
  );
}

export default env;
