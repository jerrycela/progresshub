import { Request, Response, NextFunction } from "express";
import { sanitizeHtml } from "../utils/sanitize";

/**
 * List of request body field names that should be sanitized.
 * These are free-text fields that could contain user-supplied HTML.
 */
const FIELDS_TO_SANITIZE: ReadonlyArray<string> = [
  "name",
  "title",
  "description",
  "notes",
  "content",
  "pauseReason",
  "pauseNote",
  "blockerReason",
];

/**
 * List of request body field names that contain URLs.
 * Only http:// and https:// protocols are permitted.
 * Any other protocol (javascript:, data:, vbscript:, etc.) is stripped.
 */
const URL_FIELDS: ReadonlyArray<string> = [
  "url",
  "avatarUrl",
  "redirectUrl",
  "callbackUrl",
  "webhookUrl",
  "imageUrl",
  "iconUrl",
];

const ALLOWED_URL_PROTOCOLS = /^https?:\/\//i;

/**
 * Strip any URL value whose protocol is not http or https.
 * Returns an empty string for dangerous protocols (e.g., javascript:, data:).
 */
function sanitizeUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return trimmed;
  // Block protocol-relative URLs (//evil.com/...) which bypass protocol checks
  if (trimmed.startsWith("//")) return "";
  // Only a value that contains ":" before any "/" could be a protocol scheme
  const colonIndex = trimmed.indexOf(":");
  const slashIndex = trimmed.indexOf("/");
  const hasProtocol =
    colonIndex !== -1 && (slashIndex === -1 || colonIndex < slashIndex);
  if (!hasProtocol) return trimmed; // relative URL or plain text — leave as-is
  if (!ALLOWED_URL_PROTOCOLS.test(trimmed)) return "";
  return trimmed;
}

/**
 * 遞迴清洗物件中所有符合 FIELDS_TO_SANITIZE 的字串欄位。
 * 支援巢狀物件和陣列（例如批次建立工時記錄的 entries[].description）。
 */
const sanitizeDeep = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeDeep);
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (FIELDS_TO_SANITIZE.includes(key) && typeof value === "string") {
        result[key] = sanitizeHtml(value);
      } else if (URL_FIELDS.includes(key) && typeof value === "string") {
        result[key] = sanitizeUrl(value);
      } else if (typeof value === "object" && value !== null) {
        result[key] = sanitizeDeep(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return obj;
};

/**
 * Express middleware that sanitizes string fields in the request body
 * to prevent stored XSS attacks.
 *
 * Recursively processes fields whose names are in FIELDS_TO_SANITIZE,
 * including nested objects and arrays.
 * The original request body is not mutated; a new object is assigned to req.body.
 */
export const sanitizeBody = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (!req.body || typeof req.body !== "object") {
    next();
    return;
  }

  req.body = sanitizeDeep(req.body);
  next();
};
