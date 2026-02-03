import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  SLACK_CLIENT_ID: string;
  SLACK_CLIENT_SECRET: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  ALLOWED_ORIGINS: string[];
}

// Issue #1 修復：JWT Secret 安全性檢查
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  return secret || 'dev-only-secret-key';
};

export const env: EnvConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: getJwtSecret(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || '',
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || '',
  SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || '',
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || '',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || [],
};

// Issue #4 修復：完整的環境變數驗證
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SLACK_BOT_TOKEN',
  'SLACK_CLIENT_ID',
  'SLACK_CLIENT_SECRET',
  'SLACK_SIGNING_SECRET',
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

if (missingVars.length > 0) {
  console.warn(`⚠️ Missing environment variables (dev mode): ${missingVars.join(', ')}`);
}

export default env;
