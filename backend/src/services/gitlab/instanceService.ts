import prisma from '../../config/database';
import { encrypt, decrypt } from '../../utils/gitlab/encryption';
import { generateWebhookSecret } from '../../utils/gitlab/webhookVerifier';
import { CreateInstanceDto, UpdateInstanceDto } from '../../types/gitlab';

export class GitLabInstanceService {
  /**
   * 取得所有 GitLab 實例
   */
  async getAllInstances(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    const instances = await prisma.gitLabInstance.findMany({
      where,
      select: {
        id: true,
        name: true,
        baseUrl: true,
        clientId: true,
        // 不回傳 clientSecret
        webhookSecret: false,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { connections: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return instances;
  }

  /**
   * 取得單一實例
   */
  async getInstanceById(id: string) {
    return prisma.gitLabInstance.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        clientId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { connections: true },
        },
      },
    });
  }

  /**
   * 取得實例（含解密的 secrets，內部使用）
   */
  async getInstanceWithSecrets(id: string) {
    const instance = await prisma.gitLabInstance.findUnique({
      where: { id },
    });

    if (!instance) return null;

    return {
      ...instance,
      clientSecret: decrypt(instance.clientSecret),
      webhookSecret: instance.webhookSecret ? decrypt(instance.webhookSecret) : undefined,
    };
  }

  /**
   * 建立 GitLab 實例
   */
  async createInstance(data: CreateInstanceDto) {
    // 檢查 baseUrl 是否已存在
    const existing = await prisma.gitLabInstance.findUnique({
      where: { baseUrl: data.baseUrl },
    });

    if (existing) {
      throw new Error('GitLab instance with this URL already exists');
    }

    // 加密敏感資料
    const encryptedClientSecret = encrypt(data.clientSecret);
    const webhookSecret = data.webhookSecret || generateWebhookSecret();
    const encryptedWebhookSecret = encrypt(webhookSecret);

    const instance = await prisma.gitLabInstance.create({
      data: {
        name: data.name,
        baseUrl: data.baseUrl.replace(/\/$/, ''), // 移除尾部斜線
        clientId: data.clientId,
        clientSecret: encryptedClientSecret,
        webhookSecret: encryptedWebhookSecret,
      },
    });

    return {
      ...instance,
      clientSecret: undefined,
      webhookSecret: webhookSecret, // 首次建立時回傳明文 webhook secret
    };
  }

  /**
   * 更新 GitLab 實例
   */
  async updateInstance(id: string, data: UpdateInstanceDto) {
    const existing = await prisma.gitLabInstance.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('GitLab instance not found');
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // 加密敏感資料
    if (data.clientSecret !== undefined) {
      updateData.clientSecret = encrypt(data.clientSecret);
    }
    if (data.webhookSecret !== undefined) {
      updateData.webhookSecret = encrypt(data.webhookSecret);
    }

    const instance = await prisma.gitLabInstance.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        baseUrl: true,
        clientId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return instance;
  }

  /**
   * 刪除 GitLab 實例
   */
  async deleteInstance(id: string) {
    const existing = await prisma.gitLabInstance.findUnique({
      where: { id },
      include: { _count: { select: { connections: true } } },
    });

    if (!existing) {
      throw new Error('GitLab instance not found');
    }

    if (existing._count.connections > 0) {
      throw new Error(
        `Cannot delete instance with ${existing._count.connections} active connections. ` +
          'Please disconnect all users first.'
      );
    }

    await prisma.gitLabInstance.delete({ where: { id } });
  }

  /**
   * 重新生成 Webhook Secret
   */
  async regenerateWebhookSecret(id: string): Promise<string> {
    const newSecret = generateWebhookSecret();
    const encryptedSecret = encrypt(newSecret);

    await prisma.gitLabInstance.update({
      where: { id },
      data: { webhookSecret: encryptedSecret },
    });

    return newSecret;
  }

  /**
   * 驗證實例連線
   */
  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const instance = await this.getInstanceWithSecrets(id);
    if (!instance) {
      return { success: false, message: 'Instance not found' };
    }

    try {
      // 嘗試存取 GitLab API（無需認證的端點）
      const response = await fetch(`${instance.baseUrl}/api/v4/version`);
      if (response.ok) {
        const data = await response.json() as { version: string };
        return {
          success: true,
          message: `Connected to GitLab ${data.version}`,
        };
      }
      return { success: false, message: 'Failed to connect to GitLab API' };
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export const gitLabInstanceService = new GitLabInstanceService();
