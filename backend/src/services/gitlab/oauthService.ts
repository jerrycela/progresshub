import axios from "axios";
import crypto from "crypto";
import prisma from "../../config/database";
import { GitLabOAuthTokens } from "../../types/gitlab";
import { gitLabInstanceService } from "./instanceService";
import { encrypt, decrypt } from "../../utils/gitlab/encryption";
import { createGitLabClient } from "../../utils/gitlab/apiClient";
import { env } from "../../config/env";
import logger from "../../config/logger";
import { AppError } from "../../middleware/errorHandler";

export class GitLabOAuthService {
  /**
   * 產生 OAuth 授權 URL
   */
  async generateAuthUrl(
    instanceId: string,
    employeeId: string,
  ): Promise<{ authUrl: string; state: string }> {
    const instance =
      await gitLabInstanceService.getInstanceWithSecrets(instanceId);
    if (!instance) {
      throw new AppError(404, "GitLab instance not found");
    }

    if (!instance.isActive) {
      throw new AppError(400, "GitLab instance is not active");
    }

    // 5% chance: clean up expired states
    if (Math.random() < 0.05) {
      await prisma.oAuthState.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
    }

    // 生成 state token（防 CSRF）
    const state = crypto.randomBytes(32).toString("hex");

    // Persist state to database for multi-node compatibility
    await prisma.oAuthState.create({
      data: {
        state,
        provider: "gitlab",
        payload: { employeeId, instanceId },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    const redirectUri = `${env.API_BASE_URL || "http://localhost:4000"}/api/gitlab/connections/oauth/callback`;

    const params = new URLSearchParams({
      client_id: instance.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
      scope: "api read_user read_api read_repository",
    });

    return {
      authUrl: `${instance.baseUrl}/oauth/authorize?${params.toString()}`,
      state,
    };
  }

  /**
   * Verify and consume a one-time OAuth state parameter.
   * Deletes the state record on use (one-time consume).
   */
  async verifyState(
    state: string,
  ): Promise<{ employeeId: string; instanceId: string } | null> {
    try {
      const record = await prisma.oAuthState.delete({
        where: { state },
      });

      // Check expiry after consuming
      if (record.expiresAt < new Date()) {
        return null;
      }

      const payload = record.payload as {
        employeeId: string;
        instanceId: string;
      };
      return { employeeId: payload.employeeId, instanceId: payload.instanceId };
    } catch {
      // Record not found — invalid or already consumed state
      return null;
    }
  }

  /**
   * 用授權碼換取 Access Token
   */
  async exchangeCodeForTokens(
    instanceId: string,
    code: string,
  ): Promise<GitLabOAuthTokens> {
    const instance =
      await gitLabInstanceService.getInstanceWithSecrets(instanceId);
    if (!instance) {
      throw new AppError(404, "GitLab instance not found");
    }

    const redirectUri = `${env.API_BASE_URL || "http://localhost:4000"}/api/gitlab/connections/oauth/callback`;

    try {
      const response = await axios.post(`${instance.baseUrl}/oauth/token`, {
        client_id: instance.clientId,
        client_secret: instance.clientSecret,
        code,
        grant_type: "authorization_code",
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
        throw new AppError(
          502,
          `Failed to exchange code for tokens: ${error.response?.data?.error_description || error.message}`,
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
      throw new AppError(404, "Connection not found");
    }

    if (!connection.refreshToken) {
      throw new AppError(400, "No refresh token available");
    }

    const instance = await gitLabInstanceService.getInstanceWithSecrets(
      connection.instanceId,
    );
    if (!instance) {
      throw new AppError(404, "GitLab instance not found");
    }

    const decryptedRefreshToken = decrypt(connection.refreshToken);

    try {
      const response = await axios.post(`${instance.baseUrl}/oauth/token`, {
        client_id: instance.clientId,
        client_secret: instance.clientSecret,
        refresh_token: decryptedRefreshToken,
        grant_type: "refresh_token",
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
        throw new AppError(
          502,
          `Failed to refresh token: ${error.response?.data?.error_description || error.message}`,
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
      throw new AppError(404, "Connection not found");
    }

    const instance = await gitLabInstanceService.getInstanceWithSecrets(
      connection.instanceId,
    );
    if (!instance) {
      throw new AppError(404, "GitLab instance not found");
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
      logger.warn("Failed to revoke token, it may have already expired");
    }
  }

  /**
   * 建立 GitLab 連結
   */
  async createConnection(
    employeeId: string,
    instanceId: string,
    tokens: GitLabOAuthTokens,
  ): Promise<string> {
    const instance =
      await gitLabInstanceService.getInstanceWithSecrets(instanceId);
    if (!instance) {
      throw new AppError(404, "GitLab instance not found");
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
          refreshToken: tokens.refreshToken
            ? encrypt(tokens.refreshToken)
            : null,
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
    tokens: GitLabOAuthTokens,
  ): Promise<void> {
    await prisma.gitLabConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken
          ? encrypt(tokens.refreshToken)
          : undefined,
        tokenExpiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : undefined,
      },
    });
  }

  /**
   * 取得有效的 access token（自動刷新）
   */
  async getValidAccessToken(connectionId: string): Promise<string> {
    const connection = await prisma.gitLabConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new AppError(404, "Connection not found");
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
