import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  GitLabUser,
  GitLabCommit,
  GitLabMergeRequest,
  GitLabIssue,
} from '../../types/gitlab';

export class GitLabApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v4`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // 錯誤處理攔截器
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          throw new Error('GitLab authentication failed. Token may be expired.');
        }
        if (error.response?.status === 403) {
          throw new Error('GitLab access denied. Insufficient permissions.');
        }
        if (error.response?.status === 404) {
          throw new Error('GitLab resource not found.');
        }
        throw error;
      }
    );
  }

  // 取得當前使用者資訊
  async getCurrentUser(): Promise<GitLabUser> {
    const response = await this.client.get('/user');
    return this.transformUser(response.data);
  }

  // 取得使用者的 Commits
  async getUserCommits(projectPath: string, since?: Date): Promise<GitLabCommit[]> {
    const params: Record<string, unknown> = { all: true, per_page: 100 };
    if (since) {
      params.since = since.toISOString();
    }

    const encodedPath = encodeURIComponent(projectPath);
    const response = await this.client.get(
      `/projects/${encodedPath}/repository/commits`,
      { params }
    );
    return response.data.map((commit: unknown) => this.transformCommit(commit as Record<string, unknown>));
  }

  // 取得 Commit 詳情（包含 stats）
  async getCommitDetails(projectPath: string, sha: string): Promise<GitLabCommit> {
    const encodedPath = encodeURIComponent(projectPath);
    const response = await this.client.get(
      `/projects/${encodedPath}/repository/commits/${sha}`
    );
    return this.transformCommit(response.data);
  }

  // 取得使用者的 MRs
  async getUserMergeRequests(
    state?: 'opened' | 'merged' | 'closed' | 'all'
  ): Promise<GitLabMergeRequest[]> {
    const response = await this.client.get('/merge_requests', {
      params: { state: state || 'all', scope: 'all', per_page: 100 },
    });
    return response.data.map((mr: unknown) => this.transformMergeRequest(mr as Record<string, unknown>));
  }

  // 取得專案的 MRs
  async getProjectMergeRequests(
    projectPath: string,
    state?: 'opened' | 'merged' | 'closed' | 'all',
    since?: Date
  ): Promise<GitLabMergeRequest[]> {
    const encodedPath = encodeURIComponent(projectPath);
    const params: Record<string, unknown> = {
      state: state || 'all',
      per_page: 100,
    };
    if (since) {
      params.updated_after = since.toISOString();
    }

    const response = await this.client.get(`/projects/${encodedPath}/merge_requests`, {
      params,
    });
    return response.data.map((mr: unknown) => this.transformMergeRequest(mr as Record<string, unknown>));
  }

  // 取得使用者的 Issues
  async getUserIssues(state?: 'opened' | 'closed' | 'all'): Promise<GitLabIssue[]> {
    const response = await this.client.get('/issues', {
      params: { state: state || 'all', scope: 'all', per_page: 100 },
    });
    return response.data.map((issue: unknown) => this.transformIssue(issue as Record<string, unknown>));
  }

  // 取得專案的 Issues
  async getProjectIssues(
    projectPath: string,
    state?: 'opened' | 'closed' | 'all',
    since?: Date
  ): Promise<GitLabIssue[]> {
    const encodedPath = encodeURIComponent(projectPath);
    const params: Record<string, unknown> = {
      state: state || 'all',
      per_page: 100,
    };
    if (since) {
      params.updated_after = since.toISOString();
    }

    const response = await this.client.get(`/projects/${encodedPath}/issues`, {
      params,
    });
    return response.data.map((issue: unknown) => this.transformIssue(issue as Record<string, unknown>));
  }

  // 取得單一 Issue
  async getIssue(projectPath: string, issueIid: number): Promise<GitLabIssue> {
    const encodedPath = encodeURIComponent(projectPath);
    const response = await this.client.get(
      `/projects/${encodedPath}/issues/${issueIid}`
    );
    return this.transformIssue(response.data);
  }

  // 取得專案列表
  async getProjects(membership = true): Promise<unknown[]> {
    const response = await this.client.get('/projects', {
      params: { membership, per_page: 100, order_by: 'last_activity_at' },
    });
    return response.data;
  }

  // 搜尋 Issues
  async searchIssues(projectPath: string, query: string): Promise<GitLabIssue[]> {
    const encodedPath = encodeURIComponent(projectPath);
    const response = await this.client.get(`/projects/${encodedPath}/issues`, {
      params: { search: query, per_page: 20 },
    });
    return response.data.map((issue: unknown) => this.transformIssue(issue as Record<string, unknown>));
  }

  // 建立 Issue
  async createIssue(
    projectPath: string,
    title: string,
    description?: string,
    labels?: string[]
  ): Promise<GitLabIssue> {
    const encodedPath = encodeURIComponent(projectPath);
    const response = await this.client.post(`/projects/${encodedPath}/issues`, {
      title,
      description,
      labels: labels?.join(','),
    });
    return this.transformIssue(response.data);
  }

  // 更新 Issue
  async updateIssue(
    projectPath: string,
    issueIid: number,
    updates: {
      title?: string;
      description?: string;
      state_event?: 'close' | 'reopen';
      labels?: string[];
    }
  ): Promise<GitLabIssue> {
    const encodedPath = encodeURIComponent(projectPath);
    const body: Record<string, unknown> = { ...updates };
    if (updates.labels) {
      body.labels = updates.labels.join(',');
    }
    const response = await this.client.put(
      `/projects/${encodedPath}/issues/${issueIid}`,
      body
    );
    return this.transformIssue(response.data);
  }

  // Transform helpers
  private transformUser(data: Record<string, unknown>): GitLabUser {
    return {
      id: data.id as number,
      username: data.username as string,
      name: data.name as string,
      email: (data.email as string) || '',
      avatarUrl: data.avatar_url as string,
      webUrl: data.web_url as string,
    };
  }

  private transformCommit(data: Record<string, unknown>): GitLabCommit {
    const stats = data.stats as Record<string, number> | undefined;
    return {
      id: data.id as string,
      shortId: data.short_id as string,
      title: data.title as string,
      message: data.message as string,
      authorName: data.author_name as string,
      authorEmail: data.author_email as string,
      authoredDate: data.authored_date as string,
      committerName: data.committer_name as string,
      committerEmail: data.committer_email as string,
      committedDate: data.committed_date as string,
      webUrl: data.web_url as string,
      stats: stats
        ? {
            additions: stats.additions,
            deletions: stats.deletions,
            total: stats.total,
          }
        : undefined,
    };
  }

  private transformMergeRequest(data: Record<string, unknown>): GitLabMergeRequest {
    const author = data.author as Record<string, unknown>;
    return {
      id: data.id as number,
      iid: data.iid as number,
      title: data.title as string,
      description: (data.description as string) || '',
      state: data.state as 'opened' | 'closed' | 'merged',
      sourceBranch: data.source_branch as string,
      targetBranch: data.target_branch as string,
      author: {
        id: author.id as number,
        username: author.username as string,
        name: author.name as string,
        email: (author.email as string) || '',
        avatarUrl: author.avatar_url as string,
        webUrl: author.web_url as string,
      },
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      mergedAt: data.merged_at as string | undefined,
      closedAt: data.closed_at as string | undefined,
      webUrl: data.web_url as string,
    };
  }

  private transformIssue(data: Record<string, unknown>): GitLabIssue {
    const author = data.author as Record<string, unknown>;
    const assignees = (data.assignees as Record<string, unknown>[]) || [];
    const timeStats = data.time_stats as Record<string, number> | undefined;

    return {
      id: data.id as number,
      iid: data.iid as number,
      title: data.title as string,
      description: (data.description as string) || '',
      state: data.state as 'opened' | 'closed',
      labels: (data.labels as string[]) || [],
      assignees: assignees.map((a) => this.transformUser(a)),
      author: this.transformUser(author),
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      closedAt: data.closed_at as string | undefined,
      webUrl: data.web_url as string,
      timeStats: timeStats
        ? {
            timeEstimate: timeStats.time_estimate,
            totalTimeSpent: timeStats.total_time_spent,
          }
        : undefined,
    };
  }
}

// Factory function
export function createGitLabClient(baseUrl: string, accessToken: string): GitLabApiClient {
  return new GitLabApiClient(baseUrl, accessToken);
}
