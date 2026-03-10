import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { authService } from "../services/authService";
import { authenticate, AuthRequest } from "../middleware/auth";
import { sendSuccess, sendError, getSafeErrorMessage } from "../utils/response";
import { toUserDTO } from "../mappers";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";

import { ErrorCodes } from "../types/shared-api";
const router = Router();

/**
 * GET /api/auth/slack/authorize
 * 取得 Slack OAuth URL（包含 CSRF state）
 */
router.get(
  "/slack/authorize",
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const state = await authService.generateOAuthState();
      const redirectUri = `${env.API_BASE_URL}/api/auth/slack/callback`;
      const authUrl =
        `https://slack.com/oauth/v2/authorize` +
        `?client_id=${env.SLACK_CLIENT_ID}` +
        `&scope=` +
        `&user_scope=identity.basic,identity.email` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}`;
      sendSuccess(res, { authUrl, state });
    } catch (error) {
      sendError(
        res,
        ErrorCodes.AUTH_OAUTH_URL_FAILED,
        getSafeErrorMessage(error, "Failed to generate OAuth URL"),
        500,
      );
    }
  },
);

/**
 * GET /api/auth/slack/callback
 * Slack OAuth callback — receives code+state from Slack, redirects to frontend
 */
router.get("/slack/callback", (req: AuthRequest, res: Response): void => {
  const { code, state } = req.query;
  const frontendUrl = env.FRONTEND_URL;

  if (!code || !state) {
    res.redirect(
      `${frontendUrl}/login?error=${encodeURIComponent("Slack 授權失敗：缺少必要參數")}`,
    );
    return;
  }

  // Redirect to frontend with code and state for the frontend to complete the exchange
  res.redirect(
    `${frontendUrl}/login?code=${encodeURIComponent(code as string)}&state=${encodeURIComponent(state as string)}`,
  );
});

/**
 * POST /api/auth/slack
 * Slack OAuth 登入（需要有效的 CSRF state）
 */
router.post(
  "/slack",
  [
    body("code")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("OAuth code is required"),
    body("state")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("OAuth state is required"),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_FAILED,
        "Invalid input",
        400,
        errors.array(),
      );
      return;
    }

    try {
      const { code, state } = req.body;

      if (!(await authService.verifyOAuthState(state))) {
        sendError(
          res,
          ErrorCodes.AUTH_INVALID_STATE,
          "Invalid or expired OAuth state",
          400,
        );
        return;
      }

      const result = await authService.loginWithSlackCode(code);
      sendSuccess(res, result);
    } catch (error) {
      if (error instanceof AppError) {
        sendError(res, error.errorCode, error.message, error.statusCode);
        return;
      }
      sendError(
        res,
        ErrorCodes.AUTH_LOGIN_FAILED,
        getSafeErrorMessage(error, "Login failed"),
        500,
      );
    }
  },
);

/**
 * POST /api/auth/dev-login
 * Dev login (bypasses Slack OAuth). Controlled by ENABLE_DEV_LOGIN env var.
 */
if (
  env.NODE_ENV !== "production" &&
  (env.NODE_ENV === "development" || env.ENABLE_DEV_LOGIN)
) {
  if (env.NODE_ENV !== "development") {
    console.warn(
      "[SECURITY] Dev login enabled in non-development environment. " +
        "This should only be used for staging/testing purposes.",
    );
  }
  router.post(
    "/dev-login",
    [
      body("email")
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage("Valid email is required"),
      body("employeeId")
        .optional()
        .isString()
        .trim()
        .notEmpty()
        .withMessage("Valid employee ID is required"),
      body("name")
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage("Name is required for demo login (max 50 chars)"),
      body("permissionLevel")
        .optional()
        .isIn(["EMPLOYEE", "MANAGER", "PM", "PRODUCER", "ADMIN"])
        .withMessage("Valid permission level is required"),
      body("projectIds").optional().isArray(),
      body("projectIds.*").optional().isString().trim().notEmpty(),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendError(
          res,
          ErrorCodes.VALIDATION_FAILED,
          "Invalid credentials",
          400,
        );
        return;
      }

      const { email, employeeId, name, permissionLevel } = req.body;

      try {
        // Demo login mode: name + permissionLevel
        if (name && permissionLevel) {
          const result = await authService.demoLogin(
            name,
            permissionLevel,
            req.body.projectIds,
          );
          sendSuccess(res, result);
          return;
        }

        if (!email && !employeeId) {
          sendError(
            res,
            ErrorCodes.VALIDATION_FAILED,
            "Either email or employeeId is required",
            400,
          );
          return;
        }

        const result = employeeId
          ? await authService.devLoginById(employeeId)
          : await authService.devLogin(email);
        sendSuccess(res, result);
      } catch (error) {
        if (error instanceof AppError) {
          sendError(res, error.errorCode, error.message, error.statusCode);
          return;
        }
        sendError(
          res,
          ErrorCodes.AUTH_LOGIN_FAILED,
          "Invalid credentials",
          401,
        );
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
        sendError(res, ErrorCodes.AUTH_REQUIRED, "Not authenticated", 401);
        return;
      }

      const user = await authService.getUserById(req.user.userId);
      if (!user) {
        sendError(res, ErrorCodes.USER_NOT_FOUND, "User not found", 404);
        return;
      }

      sendSuccess(res, toUserDTO(user));
    } catch (error) {
      sendError(
        res,
        ErrorCodes.AUTH_GET_USER_FAILED,
        "Failed to get user info",
        500,
      );
    }
  },
);

/**
 * POST /api/auth/refresh
 * 使用 refresh token 取得新的 access token
 */
router.post(
  "/refresh",
  [
    body("refreshToken")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Refresh token is required"),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_FAILED,
        "Invalid input",
        400,
        errors.array(),
      );
      return;
    }

    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshAccessToken(refreshToken);
      sendSuccess(res, result);
    } catch (error) {
      if (error instanceof AppError) {
        sendError(res, error.errorCode, error.message, error.statusCode);
        return;
      }
      sendError(
        res,
        ErrorCodes.AUTH_REFRESH_FAILED,
        getSafeErrorMessage(error, "Token refresh failed"),
        401,
      );
    }
  },
);

/**
 * POST /api/auth/logout
 * 登出：撤銷 refresh token（如有提供），前端應清除所有 token
 */
router.post(
  "/logout",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      if (typeof refreshToken === "string" && refreshToken.length > 0) {
        await authService.revokeRefreshToken(refreshToken);
      }
      sendSuccess(res, { message: "Logged out successfully" });
    } catch (error) {
      sendError(
        res,
        ErrorCodes.AUTH_LOGOUT_FAILED,
        getSafeErrorMessage(error, "Logout failed"),
        500,
      );
    }
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
