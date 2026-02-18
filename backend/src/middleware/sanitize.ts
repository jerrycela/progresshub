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
