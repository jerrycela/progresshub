import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import logger from "../config/logger";

/**
 * Audit Log Middleware Factory
 * Logs sensitive operations (DELETE, PUT, PATCH) for security auditing.
 *
 * @param action - Descriptive action name, e.g., "DELETE_TASK", "UPDATE_EMPLOYEE"
 * @returns Express middleware that logs the operation details
 */
export const auditLog = (action: string) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const entry = {
      timestamp: new Date().toISOString(),
      userId: req.user?.userId ?? "unknown",
      action,
      resourceId: req.params.id ?? "unknown",
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
    };

    logger.info("AUDIT", entry);

    next();
  };
};
