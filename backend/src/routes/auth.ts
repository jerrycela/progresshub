import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { authService } from "../services/authService";
import { authenticate, AuthRequest } from "../middleware/auth";
import { sendSuccess, sendError } from "../utils/response";

const router = Router();

/**
 * POST /api/auth/slack
 * Slack OAuth 登入
 */
router.post(
  "/slack",
  [
    body("slackUserId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Slack User ID is required"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("name")
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name is required"),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const { slackUserId, email, name } = req.body;
      const result = await authService.loginWithSlack(slackUserId, email, name);
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, "AUTH_LOGIN_FAILED", "Login failed", 500);
    }
  },
);

/**
 * GET /api/auth/me
 * 取得當前使用者資訊
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

      sendSuccess(res, {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        permissionLevel: user.permissionLevel,
      });
    } catch (error) {
      sendError(res, "AUTH_GET_USER_FAILED", "Failed to get user info", 500);
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
