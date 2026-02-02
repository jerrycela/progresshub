import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/authService';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/slack
 * Slack OAuth 登入
 */
router.post(
  '/slack',
  [
    body('slackUserId').isString().trim().notEmpty().withMessage('Slack User ID is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { slackUserId, email, name } = req.body;
      const result = await authService.loginWithSlack(slackUserId, email, name);
      res.json(result);
    } catch (error) {
      console.error('Slack login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

/**
 * GET /api/auth/me
 * 取得當前使用者資訊
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await authService.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      permissionLevel: user.permissionLevel,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * POST /api/auth/verify
 * 驗證 Token 是否有效
 */
router.post('/verify', authenticate, (req: AuthRequest, res: Response): void => {
  res.json({ valid: true, user: req.user });
});

export default router;
