/**
 * GitLab API v4 客戶端
 * 處理與 GitLab API 的所有互動
 */

interface GitLabProject {
  id: number;
  name: string;
  name_with_namespace: string;
  path_with_namespace: string;
  web_url: string;
}

interface GitLabCommit {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  committed_date: string;
  web_url: string;
}

interface GitLabIssue {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: 'opened' | 'closed';
  web_url: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  author: {
    id: number;
    username: string;
    name: string;
  };
  assignees: Array<{
    id: number;
    username: string;
    name: string;
  }>;
}

interface GitLabUser {
  id: number;
  username: string;
  name: string;
  email: string;
  avatar_url: string;
  web_url: string;
}

interface ProjectCommitsResponse {
  project: GitLabProject;
  commits: GitLabCommit[];
}

interface ProjectIssuesResponse {
  project: GitLabProject;
  issues: GitLabIssue[];
}

export class GitLabClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(accessToken: string) {
    this.baseUrl = process.env.GITLAB_URL || 'https://gitlab.com';
    this.accessToken = accessToken;
  }

  /**
   * 發送 API 請求
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v4${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitLab API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * 取得當前用戶資訊
   */
  async getCurrentUser(): Promise<GitLabUser> {
    return this.request<GitLabUser>('/user');
  }

  /**
   * 取得用戶參與的專案列表
   */
  async getProjects(params?: {
    membership?: boolean;
    per_page?: number;
    page?: number;
    order_by?: 'created_at' | 'updated_at' | 'name';
    sort?: 'asc' | 'desc';
  }): Promise<GitLabProject[]> {
    const queryParams = new URLSearchParams();

    if (params?.membership !== undefined) {
      queryParams.set('membership', String(params.membership));
    }
    if (params?.per_page) {
      queryParams.set('per_page', String(params.per_page));
    }
    if (params?.page) {
      queryParams.set('page', String(params.page));
    }
    if (params?.order_by) {
      queryParams.set('order_by', params.order_by);
    }
    if (params?.sort) {
      queryParams.set('sort', params.sort);
    }

    const query = queryParams.toString();
    return this.request<GitLabProject[]>(`/projects${query ? `?${query}` : ''}`);
  }

  /**
   * 取得用戶在所有專案的 Commits
   * @param since 起始時間（ISO 8601 格式）
   * @param until 結束時間（ISO 8601 格式）
   */
  async getUserCommits(since?: string, until?: string): Promise<ProjectCommitsResponse[]> {
    // 先取得用戶參與的專案
    const projects = await this.getProjects({
      membership: true,
      per_page: 100,
      order_by: 'updated_at',
      sort: 'desc',
    });

    const user = await this.getCurrentUser();
    const results: ProjectCommitsResponse[] = [];

    // 對每個專案取得該用戶的 commits
    for (const project of projects) {
      try {
        const commits = await this.getProjectCommits(project.id, {
          author: user.email,
          since,
          until,
          per_page: 50,
        });

        if (commits.length > 0) {
          results.push({
            project,
            commits,
          });
        }
      } catch (error) {
        // 某些專案可能沒有 repository 權限，跳過
        console.warn(`Failed to get commits for project ${project.name}:`, error);
      }
    }

    return results;
  }

  /**
   * 取得專案的 Commits
   */
  async getProjectCommits(
    projectId: number,
    params?: {
      author?: string;
      since?: string;
      until?: string;
      per_page?: number;
      page?: number;
    }
  ): Promise<GitLabCommit[]> {
    const queryParams = new URLSearchParams();

    if (params?.author) {
      queryParams.set('author', params.author);
    }
    if (params?.since) {
      queryParams.set('since', params.since);
    }
    if (params?.until) {
      queryParams.set('until', params.until);
    }
    if (params?.per_page) {
      queryParams.set('per_page', String(params.per_page));
    }
    if (params?.page) {
      queryParams.set('page', String(params.page));
    }

    const query = queryParams.toString();
    return this.request<GitLabCommit[]>(
      `/projects/${projectId}/repository/commits${query ? `?${query}` : ''}`
    );
  }

  /**
   * 取得用戶被指派或建立的 Issues
   * @param scope 範圍：assigned_to_me, created_by_me, all
   * @param state 狀態：opened, closed, all
   */
  async getUserIssues(params?: {
    scope?: 'assigned_to_me' | 'created_by_me' | 'all';
    state?: 'opened' | 'closed' | 'all';
    created_after?: string;
    created_before?: string;
    per_page?: number;
    page?: number;
  }): Promise<ProjectIssuesResponse[]> {
    const queryParams = new URLSearchParams();

    if (params?.scope) {
      queryParams.set('scope', params.scope);
    }
    if (params?.state) {
      queryParams.set('state', params.state);
    }
    if (params?.created_after) {
      queryParams.set('created_after', params.created_after);
    }
    if (params?.created_before) {
      queryParams.set('created_before', params.created_before);
    }
    if (params?.per_page) {
      queryParams.set('per_page', String(params.per_page));
    }
    if (params?.page) {
      queryParams.set('page', String(params.page));
    }

    const query = queryParams.toString();
    const issues = await this.request<Array<GitLabIssue & { project_id: number }>>(
      `/issues${query ? `?${query}` : ''}`
    );

    // 取得專案資訊並按專案分組
    const projectMap = new Map<number, GitLabProject>();
    const issuesByProject = new Map<number, GitLabIssue[]>();

    for (const issue of issues) {
      const projectId = issue.project_id;

      if (!projectMap.has(projectId)) {
        try {
          const project = await this.getProject(projectId);
          projectMap.set(projectId, project);
        } catch {
          // 跳過無法存取的專案
          continue;
        }
      }

      if (!issuesByProject.has(projectId)) {
        issuesByProject.set(projectId, []);
      }
      issuesByProject.get(projectId)!.push(issue);
    }

    const results: ProjectIssuesResponse[] = [];
    for (const [projectId, projectIssues] of issuesByProject) {
      const project = projectMap.get(projectId);
      if (project) {
        results.push({
          project,
          issues: projectIssues,
        });
      }
    }

    return results;
  }

  /**
   * 取得單一專案資訊
   */
  async getProject(projectId: number): Promise<GitLabProject> {
    return this.request<GitLabProject>(`/projects/${projectId}`);
  }

  /**
   * 取得專案的 Issues
   */
  async getProjectIssues(
    projectId: number,
    params?: {
      state?: 'opened' | 'closed' | 'all';
      assignee_id?: number;
      author_id?: number;
      per_page?: number;
      page?: number;
    }
  ): Promise<GitLabIssue[]> {
    const queryParams = new URLSearchParams();

    if (params?.state) {
      queryParams.set('state', params.state);
    }
    if (params?.assignee_id) {
      queryParams.set('assignee_id', String(params.assignee_id));
    }
    if (params?.author_id) {
      queryParams.set('author_id', String(params.author_id));
    }
    if (params?.per_page) {
      queryParams.set('per_page', String(params.per_page));
    }
    if (params?.page) {
      queryParams.set('page', String(params.page));
    }

    const query = queryParams.toString();
    return this.request<GitLabIssue[]>(
      `/projects/${projectId}/issues${query ? `?${query}` : ''}`
    );
  }
}

export type {
  GitLabProject,
  GitLabCommit,
  GitLabIssue,
  GitLabUser,
  ProjectCommitsResponse,
  ProjectIssuesResponse,
};
