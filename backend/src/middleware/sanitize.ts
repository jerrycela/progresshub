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
 * Express middleware that sanitizes string fields in the request body
 * to prevent stored XSS attacks.
 *
 * Only processes top-level string fields whose names are in FIELDS_TO_SANITIZE.
 * Non-string values and fields not in the list are left untouched.
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

  const sanitized: Record<string, unknown> = { ...req.body };

  for (const field of FIELDS_TO_SANITIZE) {
    const value = sanitized[field];
    if (typeof value === "string") {
      sanitized[field] = sanitizeHtml(value);
    }
  }

  req.body = sanitized;
  next();
};
