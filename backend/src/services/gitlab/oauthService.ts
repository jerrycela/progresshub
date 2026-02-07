import axios from 'axios';
import crypto from 'crypto';
import prisma from '../../config/database';
import { GitLabOAuthTokens } from '../../types/gitlab';
import { gitLabInstanceService } from './instanceService';
import { encrypt, decrypt } from '../../utils/gitlab/encryption';
import { createGitLabClient } from '../../utils/gitlab/apiClient';
import { env } from '../../config/env';

// TODO: 將 OAuth state 存儲遷移到 Redis，目前使用記憶體 Map 在多進程/多節點部署時會導致驗證失敗
// 當前為非生產就緒的實作，僅適用於單進程環境
const OAUTH_STATE_MAX_COUNT = 1000; // 最大 state 數量限制
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // state 過期時間：10 分鐘
const oauthStates = new Map<string, { employeeId: string; instanceId: string; expiresAt: number }>();

// 啟動時警告：此為非生產就緒的 OAuth state 存儲
console.warn(
  '[GitLab OAuth] 警告：OAuth state 目前存儲在應用程式記憶體中，' +
  '多進程或多節點部署時將無法正確驗證 state。' +
  '請儘速遷移至 Redis 等共享存儲方案。'
);

export class GitLabOAuthService {
  /**
   * 產生 OAuth 授權 URL
   */
  async generateAuthUrl(
    instanceId: string,
    employeeId: string
  ): Promise<{ authUrl: string; state: string }> {
    const instance = await gitLabInstanceService.getInstanceWithSecrets(instanceId);
    if (!instance) {
      throw new Error('GitLab instance not found');
    }

    if (!instance.isActive) {
      throw new Error('GitLab instance is not active');
    }

    // 生成 state token（防 CSRF）
    const state = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + OAUTH_STATE_TTL_MS;

    // 清理過期的 states（在新增之前先清理，確保不會超出上限）
    this.cleanupExpiredStates();

    // 檢查是否超出最大數量限制，若超出則拒絕新增
    if (oauthStates.size >= OAUTH_STATE_MAX_COUNT) {
      throw new Error('OAuth state 存儲已滿，請稍後再試');
    }

    // 儲存 state
    oauthStates.set(state, { employeeId, instanceId, expiresAt });

    const redirectUri = `${env.API_BASE_URL || 'http://localhost:4000'}/api/gitlab/connections/oauth/callback`;

    const params = new URLSearchParams({
      client_id: instance.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      scope: 'api read_user read_api read_repository',
    });

    return {
      authUrl: `${instance.baseUrl}/oauth/authorize?${params.toString()}`,
      state,
    };
  }

  /**
   * 驗證 OAuth state
   */
  verifyState(state: string): { employeeId: string; instanceId: string } | null {
    const data = oauthStates.get(state);
    if (!data) {
      return null;
    }

    if (Date.now() > data.expiresAt) {
      oauthStates.delete(state);
      return null;
    }

    oauthStates.delete(state);
    return { employeeId: data.employeeId, instanceId: data.instanceId };
  }

  /**
   * 用授權碼換取 Access Token
   */
  async exchangeCodeForTokens(
    instanceId: string,
    code: string
  ): Promise<GitLabOAuthTokens> {
    const instance = await gitLabInstanceService.getInstanceWithSecrets(instanceId);
    if (!instance) {
      throw new Error('GitLab instance not found');
    }

    const redirectUri = `${env.API_BASE_URL || 'http://localhost:4000'}/api/gitlab/connections/oauth/callback`;

    try {
      const response = await axios.post(`${instance.baseUrl}/oauth/token`, {
        client_id: instance.clientId,
        client_secret: instance.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
        createdAt: response.data.created_at,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to exchange code for tokens: ${error.response?.data?.error_description || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 刷新 Access Token
   */
  async refreshAccessToken(connectionId: string): Promise<GitLabOAuthTokens> {
    const connection = await prisma.gitLabConnection.findUnique({
      where: { id: connectionId },
      include: { instance: true },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    if (!connection.refreshToken) {
      throw new Error('No refresh token available');
    }

    const instance = await gitLabInstanceService.getInstanceWithSecrets(connection.instanceId);
    if (!instance) {
      throw new Error('GitLab instance not found');
    }

    const decryptedRefreshToken = decrypt(connection.refreshToken);

    try {
      const response = await axios.post(`${instance.baseUrl}/oauth/token`, {
        client_id: instance.clientId,
        client_secret: instance.clientSecret,
        refresh_token: decryptedRefreshToken,
        grant_type: 'refresh_token',
      });

      const tokens: GitLabOAuthTokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
        createdAt: response.data.created_at,
      };

      // 更新連結的 tokens
      await this.updateConnectionTokens(connectionId, tokens);

      return tokens;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to refresh token: ${error.response?.data?.error_description || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 撤銷 Token
   */
  async revokeToken(connectionId: string): Promise<void> {
    const connection = await prisma.gitLabConnection.findUnique({
      where: { id: connectionId },
      include: { instance: true },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    const instance = await gitLabInstanceService.getInstanceWithSecrets(connection.instanceId);
    if (!instance) {
      throw new Error('GitLab instance not found');
    }

    const decryptedToken = decrypt(connection.accessToken);

    try {
      await axios.post(`${instance.baseUrl}/oauth/revoke`, {
        client_id: instance.clientId,
        client_secret: instance.clientSecret,
        token: decryptedToken,
      });
    } catch {
      // 即使撤銷失敗也繼續（token 可能已過期）
      console.warn('Failed to revoke token, it may have already expired');
    }
  }

  /**
   * 建立 GitLab 連結
   */
  async createConnection(
    employeeId: string,
    instanceId: string,
    tokens: GitLabOAuthTokens
  ): Promise<string> {
    const instance = await gitLabInstanceService.getInstanceWithSecrets(instanceId);
    if (!instance) {
      throw new Error('GitLab instance not found');
    }

    // 取得 GitLab 使用者資訊
    const client = createGitLabClient(instance.baseUrl, tokens.accessToken);
    const gitlabUser = await client.getCurrentUser();

    // 檢查是否已有連結
    const existing = await prisma.gitLabConnection.findUnique({
      where: {
        employeeId_instanceId: { employeeId, instanceId },
      },
    });

    if (existing) {
      // 更新現有連結
      await prisma.gitLabConnection.update({
        where: { id: existing.id },
        data: {
          gitlabUserId: gitlabUser.id,
          gitlabUsername: gitlabUser.username,
          accessToken: encrypt(tokens.accessToken),
          refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
          tokenExpiresAt: tokens.expiresIn
            ? new Date(Date.now() + tokens.expiresIn * 1000)
            : null,
          isActive: true,
          connectedAt: new Date(),
        },
      });
      return existing.id;
    }

    // 建立新連結
    const connection = await prisma.gitLabConnection.create({
      data: {
        employeeId,
        instanceId,
        gitlabUserId: gitlabUser.id,
        gitlabUsername: gitlabUser.username,
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        tokenExpiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : null,
      },
    });

    return connection.id;
  }

  /**
   * 更新連結的 tokens
   */
  private async updateConnectionTokens(
    connectionId: string,
    tokens: GitLabOAuthTokens
  ): Promise<void> {
    await prisma.gitLabConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
        tokenExpiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : undefined,
      },
    });
  }

  /**
   * 清理過期的 states
   * 遍歷所有 state，移除超過 TTL（10 分鐘）的條目
   * TODO: 遷移至 Redis 後，可利用 Redis 的 TTL 機制自動過期，不需手動清理
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [key, value] of oauthStates.entries()) {
      if (now > value.expiresAt) {
        oauthStates.delete(key);
      }
    }
  }

  /**
   * 取得有效的 access token（自動刷新）
   */
  async getValidAccessToken(connectionId: string): Promise<string> {
    const connection = await prisma.gitLabConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    // 檢查 token 是否即將過期（5 分鐘內）
    const isExpiringSoon =
      connection.tokenExpiresAt &&
      connection.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000;

    if (isExpiringSoon && connection.refreshToken) {
      const tokens = await this.refreshAccessToken(connectionId);
      return tokens.accessToken;
    }

    return decrypt(connection.accessToken);
  }
}

export const gitLabOAuthService = new GitLabOAuthService();
