/**
 * GitLab OAuth 服務
 * 處理 OAuth 2.0 授權流程，包括生成授權 URL、交換 Token、刷新 Token
 */

import crypto from 'crypto';

interface GitLabTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  created_at: number;
}

interface GitLabUser {
  id: number;
  username: string;
  name: string;
  email: string;
  avatar_url: string;
  web_url: string;
}

export class GitLabOAuth {
  private baseUrl: string;
  private appId: string;
  private appSecret: string;
  private redirectUri: string;

  constructor() {
    this.baseUrl = process.env.GITLAB_URL || 'https://gitlab.com';
    this.appId = process.env.GITLAB_APP_ID || '';
    this.appSecret = process.env.GITLAB_APP_SECRET || '';
    this.redirectUri = process.env.GITLAB_REDIRECT_URI || '';
  }

  /**
   * 檢查 GitLab OAuth 是否已配置
   */
  isConfigured(): boolean {
    return !!(this.appId && this.appSecret && this.redirectUri);
  }

  /**
   * 生成授權 URL，包含 CSRF 保護的 state 參數
   */
  generateAuthUrl(userId: string): { url: string; state: string } {
    const state = this.generateState(userId);

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'read_user read_api read_repository',
      state,
    });

    return {
      url: `${this.baseUrl}/oauth/authorize?${params.toString()}`,
      state,
    };
  }

  /**
   * 生成帶有用戶 ID 的 state 參數用於 CSRF 保護
   */
  private generateState(userId: string): string {
    const randomPart = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString(36);
    // 將 userId 編碼到 state 中，以便在 callback 時驗證
    const payload = Buffer.from(JSON.stringify({ userId, timestamp })).toString('base64url');
    return `${randomPart}.${payload}`;
  }

  /**
   * 從 state 參數中提取用戶 ID
   */
  extractUserIdFromState(state: string): string | null {
    try {
      const parts = state.split('.');
      if (parts.length !== 2) return null;

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return payload.userId || null;
    } catch {
      return null;
    }
  }

  /**
   * 使用授權碼交換 Access Token
   */
  async exchangeCodeForToken(code: string): Promise<GitLabTokenResponse> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.appId,
        client_secret: this.appSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitLab OAuth token exchange failed: ${error}`);
    }

    return response.json();
  }

  /**
   * 使用 Refresh Token 刷新 Access Token
   */
  async refreshAccessToken(refreshToken: string): Promise<GitLabTokenResponse> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.appId,
        client_secret: this.appSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitLab token refresh failed: ${error}`);
    }

    return response.json();
  }

  /**
   * 撤銷 Access Token
   */
  async revokeToken(accessToken: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/oauth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.appId,
        client_secret: this.appSecret,
        token: accessToken,
      }),
    });

    // GitLab 的 revoke endpoint 成功時返回空響應
    if (!response.ok && response.status !== 200) {
      const error = await response.text();
      console.warn(`GitLab token revoke warning: ${error}`);
    }
  }

  /**
   * 使用 Access Token 取得當前用戶資訊
   */
  async getCurrentUser(accessToken: string): Promise<GitLabUser> {
    const response = await fetch(`${this.baseUrl}/api/v4/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get GitLab user: ${error}`);
    }

    return response.json();
  }

  /**
   * 計算 Token 過期時間
   */
  calculateTokenExpiry(expiresIn: number, createdAt: number): Date {
    return new Date((createdAt + expiresIn) * 1000);
  }
}

export const gitlabOAuth = new GitLabOAuth();
