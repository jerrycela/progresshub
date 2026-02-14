import prisma from "../config/database";
import { Employee } from "@prisma/client";

export interface UserSettingsDTO {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  functionType?: string;
  isActive?: boolean;
  lastActiveAt?: string;
  department?: string;
  slackId?: string;
  slackUsername?: string;
  gitlabId?: string;
  gitlabUsername?: string;
  createdAt: string;
  updatedAt: string;
}

function toUserSettingsDTO(
  emp: Employee,
  gitlab?: { gitlabUsername: string; gitlabUserId: number } | null,
): UserSettingsDTO {
  return {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    avatar: emp.avatarUrl ?? undefined,
    role: emp.permissionLevel,
    functionType: emp.functionType ?? undefined,
    isActive: emp.isActive,
    lastActiveAt: emp.lastActiveAt?.toISOString(),
    department: emp.department ?? undefined,
    slackId: emp.slackUserId ?? undefined,
    slackUsername: emp.slackUserId
      ? `@${emp.name.toLowerCase().replace(/\s+/g, ".")}`
      : undefined,
    gitlabId: gitlab ? String(gitlab.gitlabUserId) : undefined,
    gitlabUsername: gitlab?.gitlabUsername,
    createdAt: emp.createdAt.toISOString(),
    updatedAt: emp.updatedAt.toISOString(),
  };
}

export class UserSettingsService {
  /**
   * 取得使用者設定（含 GitLab 連結資訊）
   */
  async getSettings(userId: string): Promise<UserSettingsDTO | null> {
    const emp = await prisma.employee.findUnique({
      where: { id: userId },
    });

    if (!emp) return null;

    const gitlabConn = await prisma.gitLabConnection.findFirst({
      where: { employeeId: userId, isActive: true },
      select: { gitlabUsername: true, gitlabUserId: true },
    });

    return toUserSettingsDTO(emp, gitlabConn);
  }

  /**
   * 更新使用者基本設定
   */
  async updateSettings(
    userId: string,
    data: { name?: string; email?: string; avatar?: string },
  ): Promise<UserSettingsDTO | null> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.avatar !== undefined) updateData.avatarUrl = data.avatar;

    const emp = await prisma.employee.update({
      where: { id: userId },
      data: updateData,
    });

    const gitlabConn = await prisma.gitLabConnection.findFirst({
      where: { employeeId: userId, isActive: true },
      select: { gitlabUsername: true, gitlabUserId: true },
    });

    return toUserSettingsDTO(emp, gitlabConn);
  }

  /**
   * 連結 GitLab 帳號（簡化版：只記錄 username）
   */
  async linkGitLab(
    userId: string,
    username: string,
  ): Promise<UserSettingsDTO | null> {
    // 先檢查是否已有連結
    const existing = await prisma.gitLabConnection.findFirst({
      where: { employeeId: userId, isActive: true },
    });

    if (existing) {
      // 更新既有連結
      await prisma.gitLabConnection.update({
        where: { id: existing.id },
        data: { gitlabUsername: username },
      });
    } else {
      // 取得或建立預設 instance
      let instance = await prisma.gitLabInstance.findFirst();
      if (!instance) {
        instance = await prisma.gitLabInstance.create({
          data: {
            name: "Default GitLab",
            baseUrl: "https://gitlab.com",
            clientId: "default",
            clientSecret: "default",
          },
        });
      }

      await prisma.gitLabConnection.create({
        data: {
          employeeId: userId,
          instanceId: instance.id,
          gitlabUserId: Date.now(),
          gitlabUsername: username,
          accessToken: "manual-link",
        },
      });
    }

    return this.getSettings(userId);
  }

  /**
   * 解除 GitLab 連結
   */
  async unlinkGitLab(userId: string): Promise<UserSettingsDTO | null> {
    await prisma.gitLabConnection.updateMany({
      where: { employeeId: userId, isActive: true },
      data: { isActive: false },
    });

    return this.getSettings(userId);
  }

  /**
   * 連結 Slack 帳號
   */
  async linkSlack(
    userId: string,
    _username: string,
  ): Promise<UserSettingsDTO | null> {
    const slackUserId = `U${Date.now()}`;

    await prisma.employee.update({
      where: { id: userId },
      data: { slackUserId },
    });

    return this.getSettings(userId);
  }

  /**
   * 解除 Slack 連結
   */
  async unlinkSlack(userId: string): Promise<UserSettingsDTO | null> {
    await prisma.employee.update({
      where: { id: userId },
      data: { slackUserId: null },
    });

    return this.getSettings(userId);
  }
}

export const userSettingsService = new UserSettingsService();
