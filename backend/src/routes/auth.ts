import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { authService } from "../services/authService";
import { authenticate, AuthRequest } from "../middleware/auth";
import { sendSuccess, sendError } from "../utils/response";
import { toUserDTO } from "../mappers";
import { env } from "../config/env";

const router = Router();

/**
 * POST /api/auth/slack
 * Slack OAuth 登入
 */
router.post(
  "/slack",
  [
    body("code")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("OAuth code is required"),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const { code } = req.body;
      const result = await authService.loginWithSlackCode(code);
      sendSuccess(res, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      sendError(res, "AUTH_LOGIN_FAILED", message, 500);
    }
  },
);

/**
 * POST /api/auth/dev-login
 * Development-only login (bypasses Slack OAuth)
 */
if (env.NODE_ENV === "development") {
  router.post(
    "/dev-login",
    [
      body("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Valid email is required"),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendError(
          res,
          "VALIDATION_ERROR",
          "Invalid input",
          400,
          errors.array(),
        );
        return;
      }

      try {
        const { email } = req.body;
        const result = await authService.devLogin(email);
        sendSuccess(res, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        sendError(res, "AUTH_LOGIN_FAILED", message, 500);
      }
    },
  );
}

/**
 * GET /api/auth/me
 * 取得當前使用者資訊（回傳完整 UserDTO）
 */
router.get(
  "/me",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      const user = await authService.getUserById(req.user.userId);
      if (!user) {
        sendError(res, "USER_NOT_FOUND", "User not found", 404);
        return;
      }

      sendSuccess(res, toUserDTO(user));
    } catch (error) {
      sendError(res, "AUTH_GET_USER_FAILED", "Failed to get user info", 500);
    }
  },
);

/**
 * POST /api/auth/logout
 * 登出（前端清除 token，後端可擴展為 token 黑名單）
 */
router.post(
  "/logout",
  authenticate,
  (_req: AuthRequest, res: Response): void => {
    sendSuccess(res, { message: "Logged out successfully" });
  },
);

/**
 * POST /api/auth/verify
 * 驗證 Token 是否有效
 */
router.post(
  "/verify",
  authenticate,
  (req: AuthRequest, res: Response): void => {
    sendSuccess(res, { valid: true, user: req.user });
  },
);

export default router;
