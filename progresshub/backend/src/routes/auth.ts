import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { WebClient } from '@slack/web-api';
import { HttpError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Slack OAuth 登入
router.post('/slack', async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new HttpError('缺少 OAuth code', 400);
    }

    // Exchange code for access token
    const slackClient = new WebClient();
    const result = await slackClient.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
    });

    if (!result.ok || !result.authed_user) {
      throw new HttpError('Slack 認證失敗', 401);
    }

    const slackUserId = result.authed_user.id!;
    const accessToken = result.authed_user.access_token!;

    // Get user info from Slack
    const userClient = new WebClient(accessToken);
    const userInfo = await userClient.users.info({ user: slackUserId });

    if (!userInfo.ok || !userInfo.user) {
      throw new HttpError('無法取得 Slack 用戶資訊', 401);
    }

    const slackUser = userInfo.user;
    const email = slackUser.profile?.email;
    const name = slackUser.real_name || slackUser.name || 'Unknown';

    if (!email) {
      throw new HttpError('無法取得用戶 Email', 400);
    }

    // Find or create employee
    let employee = await prisma.employee.findUnique({
      where: { slackUserId },
    });

    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          slackUserId,
          email,
          name,
        },
      });
    } else {
      // Update name/email if changed
      employee = await prisma.employee.update({
        where: { id: employee.id },
        data: { name, email },
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: employee.id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        permissionLevel: employee.permissionLevel,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 取得當前用戶資訊
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await prisma.employee.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        role: true,
        permissionLevel: true,
        managedProjects: true,
      },
    });

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// 刷新 Token
router.post('/refresh', authenticate, async (req: AuthRequest, res: Response) => {
  const token = jwt.sign(
    { userId: req.user!.id },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({ success: true, token });
});

// 登出 (前端處理)
router.post('/logout', authenticate, (req, res) => {
  res.json({ success: true, message: '已登出' });
});

export default router;
