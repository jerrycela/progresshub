/**
 * GitLab 同步服務
 * 負責將 GitLab 的 Commits 和 Issues 同步到 ProgressHub
 */

import { PrismaClient, GitLabActivityType } from '@prisma/client';
import { GitLabClient, ProjectCommitsResponse, ProjectIssuesResponse } from './GitLabClient';

interface SyncResult {
  success: boolean;
  commitsCount: number;
  issuesCount: number;
  errors: string[];
}

export class GitLabSyncService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 同步用戶的 GitLab 活動（Commits + Issues）
   * @param employeeId ProgressHub 員工 ID
   * @param daysSince 同步最近幾天的資料（預設 7 天）
   */
  async syncUserActivities(
    employeeId: string,
    daysSince: number = 7
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      commitsCount: 0,
      issuesCount: 0,
      errors: [],
    };

    try {
      // 取得員工的 GitLab access token
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          gitlabAccessToken: true,
          gitlabId: true,
        },
      });

      if (!employee?.gitlabAccessToken) {
        result.errors.push('GitLab 帳號未連結或 Token 無效');
        return result;
      }

      const client = new GitLabClient(employee.gitlabAccessToken);

      // 計算時間範圍
      const since = new Date();
      since.setDate(since.getDate() - daysSince);
      const sinceISO = since.toISOString();

      // 並行同步 Commits 和 Issues
      const [commitsResult, issuesResult] = await Promise.allSettled([
        this.syncCommits(client, employeeId, sinceISO),
        this.syncIssues(client, employeeId, sinceISO),
      ]);

      // 處理 Commits 結果
      if (commitsResult.status === 'fulfilled') {
        result.commitsCount = commitsResult.value;
      } else {
        result.errors.push(`Commits 同步失敗: ${commitsResult.reason}`);
      }

      // 處理 Issues 結果
      if (issuesResult.status === 'fulfilled') {
        result.issuesCount = issuesResult.value;
      } else {
        result.errors.push(`Issues 同步失敗: ${issuesResult.reason}`);
      }

      // 更新最後同步時間
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: { gitlabLastSyncAt: new Date() },
      });

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(`同步失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      return result;
    }
  }

  /**
   * 同步 Commits
   */
  private async syncCommits(
    client: GitLabClient,
    employeeId: string,
    since: string
  ): Promise<number> {
    const projectCommits = await client.getUserCommits(since);
    let totalCount = 0;

    for (const { project, commits } of projectCommits) {
      for (const commit of commits) {
        await this.upsertActivity({
          employeeId,
          type: GitLabActivityType.COMMIT,
          gitlabId: commit.id,
          title: commit.title,
          description: commit.message,
          url: commit.web_url,
          projectId: project.id,
          projectName: project.name_with_namespace,
          projectUrl: project.web_url,
          gitlabCreatedAt: new Date(commit.committed_date),
        });
        totalCount++;
      }
    }

    return totalCount;
  }

  /**
   * 同步 Issues
   */
  private async syncIssues(
    client: GitLabClient,
    employeeId: string,
    since: string
  ): Promise<number> {
    // 同步指派給我的 Issues
    const assignedIssues = await client.getUserIssues({
      scope: 'assigned_to_me',
      state: 'all',
      created_after: since,
      per_page: 100,
    });

    // 同步我建立的 Issues
    const createdIssues = await client.getUserIssues({
      scope: 'created_by_me',
      state: 'all',
      created_after: since,
      per_page: 100,
    });

    // 合併並去重
    const allIssues = this.mergeIssueResults(assignedIssues, createdIssues);
    let totalCount = 0;

    for (const { project, issues } of allIssues) {
      for (const issue of issues) {
        await this.upsertActivity({
          employeeId,
          type: GitLabActivityType.ISSUE,
          gitlabId: String(issue.iid),
          title: `#${issue.iid} ${issue.title}`,
          description: issue.description,
          url: issue.web_url,
          projectId: project.id,
          projectName: project.name_with_namespace,
          projectUrl: project.web_url,
          state: issue.state,
          gitlabCreatedAt: new Date(issue.created_at),
        });
        totalCount++;
      }
    }

    return totalCount;
  }

  /**
   * 合併 Issue 結果並去重
   */
  private mergeIssueResults(
    ...results: ProjectIssuesResponse[][]
  ): ProjectIssuesResponse[] {
    const projectMap = new Map<number, ProjectIssuesResponse>();
    const seenIssues = new Set<string>();

    for (const resultSet of results) {
      for (const result of resultSet) {
        const existingProject = projectMap.get(result.project.id);

        if (existingProject) {
          // 合併 Issues，避免重複
          for (const issue of result.issues) {
            const key = `${result.project.id}-${issue.iid}`;
            if (!seenIssues.has(key)) {
              seenIssues.add(key);
              existingProject.issues.push(issue);
            }
          }
        } else {
          // 新增專案
          const uniqueIssues = [];
          for (const issue of result.issues) {
            const key = `${result.project.id}-${issue.iid}`;
            if (!seenIssues.has(key)) {
              seenIssues.add(key);
              uniqueIssues.push(issue);
            }
          }
          projectMap.set(result.project.id, {
            project: result.project,
            issues: uniqueIssues,
          });
        }
      }
    }

    return Array.from(projectMap.values());
  }

  /**
   * 新增或更新 GitLab 活動
   */
  private async upsertActivity(data: {
    employeeId: string;
    type: GitLabActivityType;
    gitlabId: string;
    title: string;
    description?: string;
    url: string;
    projectId: number;
    projectName: string;
    projectUrl?: string;
    state?: string;
    gitlabCreatedAt: Date;
  }): Promise<void> {
    await this.prisma.gitLabActivity.upsert({
      where: {
        employeeId_type_gitlabId: {
          employeeId: data.employeeId,
          type: data.type,
          gitlabId: data.gitlabId,
        },
      },
      create: {
        employeeId: data.employeeId,
        type: data.type,
        gitlabId: data.gitlabId,
        title: data.title,
        description: data.description || null,
        url: data.url,
        projectId: data.projectId,
        projectName: data.projectName,
        projectUrl: data.projectUrl || null,
        state: data.state || null,
        gitlabCreatedAt: data.gitlabCreatedAt,
      },
      update: {
        title: data.title,
        description: data.description || null,
        url: data.url,
        projectName: data.projectName,
        projectUrl: data.projectUrl || null,
        state: data.state || null,
        syncedAt: new Date(),
      },
    });
  }

  /**
   * 取得用戶的 GitLab 活動列表
   */
  async getUserActivities(
    employeeId: string,
    options?: {
      type?: GitLabActivityType;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: { employeeId: string; type?: GitLabActivityType } = { employeeId };
    if (options?.type) {
      where.type = options.type;
    }

    const [activities, total] = await Promise.all([
      this.prisma.gitLabActivity.findMany({
        where,
        orderBy: { gitlabCreatedAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          task: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.gitLabActivity.count({ where }),
    ]);

    return { activities, total };
  }

  /**
   * 關聯 GitLab 活動到 Task
   */
  async linkActivityToTask(activityId: string, taskId: string): Promise<void> {
    await this.prisma.gitLabActivity.update({
      where: { id: activityId },
      data: { taskId },
    });
  }

  /**
   * 取消關聯 GitLab 活動
   */
  async unlinkActivityFromTask(activityId: string): Promise<void> {
    await this.prisma.gitLabActivity.update({
      where: { id: activityId },
      data: { taskId: null },
    });
  }
}
