import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { authService } from "../services/authService";
import { authenticate, AuthRequest } from "../middleware/auth";
import { sendSuccess, sendError } from "../utils/response";
import { toUserDTO } from "../mappers";
import { env } from "../config/env";

const router = Router();

/**
 * GET /api/auth/slack/authorize
 * 取得 Slack OAuth URL（包含 CSRF state）
 */
router.get("/slack/authorize", (_req: AuthRequest, res: Response): void => {
  try {
    const state = authService.generateOAuthState();
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
    const message =
      error instanceof Error ? error.message : "Failed to generate OAuth URL";
    sendError(res, "AUTH_OAUTH_URL_FAILED", message, 500);
  }
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
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const { code, state } = req.body;

      if (!authService.verifyOAuthState(state)) {
        sendError(
          res,
          "AUTH_INVALID_STATE",
          "Invalid or expired OAuth state",
          400,
        );
        return;
      }

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
 * Dev login (bypasses Slack OAuth). Controlled by ENABLE_DEV_LOGIN env var.
 */
if (
  env.NODE_ENV === "development" ||
  (process.env.ENABLE_DEV_LOGIN === "true" && env.NODE_ENV !== "production")
) {
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
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendError(res, "VALIDATION_ERROR", "Invalid credentials", 400);
        return;
      }

      const { email, employeeId } = req.body;
      if (!email && !employeeId) {
        sendError(
          res,
          "VALIDATION_ERROR",
          "Either email or employeeId is required",
          400,
        );
        return;
      }

      try {
        const result = employeeId
          ? await authService.devLoginById(employeeId)
          : await authService.devLogin(email);
        sendSuccess(res, result);
      } catch (error) {
        sendError(res, "AUTH_LOGIN_FAILED", "Invalid credentials", 401);
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
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshAccessToken(refreshToken);
      sendSuccess(res, result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Token refresh failed";
      sendError(res, "AUTH_REFRESH_FAILED", message, 401);
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
  (req: AuthRequest, res: Response): void => {
    const { refreshToken } = req.body;
    if (typeof refreshToken === "string" && refreshToken.length > 0) {
      authService.revokeRefreshToken(refreshToken);
    }
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
