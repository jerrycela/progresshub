import prisma from '../../config/database';
import { GitLabActivityType, Prisma } from '@prisma/client';
import { createGitLabClient } from '../../utils/gitlab/apiClient';
import { gitLabOAuthService } from './oauthService';
import { gitLabInstanceService } from './instanceService';
import { ActivitySummary, ConvertActivityDto, BatchConvertActivitiesDto } from '../../types/gitlab';

export class GitLabActivityService {
  /**
   * 同步使用者的 GitLab 活動
   */
  async syncActivities(connectionId: string, since?: Date): Promise<number> {
    const connection = await prisma.gitLabConnection.findUnique({
      where: { id: connectionId },
      include: { instance: true },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    const accessToken = await gitLabOAuthService.getValidAccessToken(connectionId);
    const client = createGitLabClient(connection.instance.baseUrl, accessToken);

    const syncSince = since || connection.lastSyncAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let syncedCount = 0;

    // 取得使用者參與的專案
    const projects = await client.getProjects(true);

    for (const project of projects) {
      const projectPath = project.path_with_namespace;

      // 同步 Commits
      if (connection.syncCommits) {
        try {
          const commits = await client.getUserCommits(projectPath, syncSince);
          for (const commit of commits) {
            // 只同步自己的 commits
            if (commit.authorEmail === connection.gitlabUsername + '@' ||
                commit.committerEmail === connection.gitlabUsername + '@') {
              continue; // 跳過簡單匹配失敗的情況，實際應用需更精確
            }

            const eventId = `commit_${projectPath}_${commit.id}`;
            const existing = await prisma.gitLabActivity.findUnique({
              where: { gitlabEventId: eventId },
            });

            if (!existing) {
              // 取得 commit 詳情以獲取 stats
              let stats = commit.stats;
              if (!stats) {
                try {
                  const details = await client.getCommitDetails(projectPath, commit.id);
                  stats = details.stats;
                } catch {
                  // 忽略詳情取得失敗
                }
              }

              await prisma.gitLabActivity.create({
                data: {
                  connectionId,
                  activityType: 'COMMIT',
                  gitlabEventId: eventId,
                  projectPath,
                  commitSha: commit.id,
                  commitMessage: commit.message,
                  additions: stats?.additions || 0,
                  deletions: stats?.deletions || 0,
                  activityAt: new Date(commit.committedDate),
                  suggestedHours: this.calculateSuggestedHours(
                    'COMMIT',
                    stats?.additions,
                    stats?.deletions
                  ),
                },
              });
              syncedCount++;
            }
          }
        } catch (error) {
          console.error(`Failed to sync commits for ${projectPath}:`, error);
        }
      }

      // 同步 MRs
      if (connection.syncMRs) {
        try {
          const mrs = await client.getProjectMergeRequests(projectPath, 'all', syncSince);
          for (const mr of mrs) {
            // 檢查是否為自己的 MR
            if (mr.author.id !== connection.gitlabUserId) {
              continue;
            }

            const eventId = `mr_${projectPath}_${mr.iid}_${mr.state}`;
            const existing = await prisma.gitLabActivity.findUnique({
              where: { gitlabEventId: eventId },
            });

            if (!existing) {
              let activityType: GitLabActivityType;
              switch (mr.state) {
                case 'opened':
                  activityType = 'MR_OPENED';
                  break;
                case 'merged':
                  activityType = 'MR_MERGED';
                  break;
                case 'closed':
                  activityType = 'MR_CLOSED';
                  break;
                default:
                  continue;
              }

              await prisma.gitLabActivity.create({
                data: {
                  connectionId,
                  activityType,
                  gitlabEventId: eventId,
                  projectPath,
                  mrIid: mr.iid,
                  mrTitle: mr.title,
                  mrState: mr.state,
                  activityAt: new Date(mr.updatedAt),
                  suggestedHours: this.calculateSuggestedHours(activityType),
                },
              });
              syncedCount++;
            }
          }
        } catch (error) {
          console.error(`Failed to sync MRs for ${projectPath}:`, error);
        }
      }
    }

    // 更新最後同步時間
    await prisma.gitLabConnection.update({
      where: { id: connectionId },
      data: { lastSyncAt: new Date() },
    });

    return syncedCount;
  }

  /**
   * 計算活動的建議工時
   */
  calculateSuggestedHours(
    activityType: GitLabActivityType,
    additions?: number,
    deletions?: number
  ): number {
    switch (activityType) {
      case 'COMMIT': {
        const linesChanged = (additions || 0) + (deletions || 0);
        return Math.min(0.25 + linesChanged / 100, 2.0);
      }
      case 'MR_OPENED':
        return 0.5;
      case 'MR_MERGED':
      case 'MR_COMMENT':
      case 'MR_APPROVED':
        return 0.25;
      case 'MR_CLOSED':
        return 0.25;
      case 'ISSUE_CREATED':
        return 0.25;
      case 'ISSUE_CLOSED':
      case 'ISSUE_UPDATED':
        return 0.25;
      default:
        return 0;
    }
  }

  /**
   * 取得活動列表
   */
  async getActivities(
    employeeId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      type?: GitLabActivityType;
      projectPath?: string;
      converted?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { startDate, endDate, type, projectPath, converted, page = 1, limit = 50 } = options;

    const where: Prisma.GitLabActivityWhereInput = {
      connection: { employeeId },
    };

    if (startDate || endDate) {
      where.activityAt = {};
      if (startDate) where.activityAt.gte = startDate;
      if (endDate) where.activityAt.lte = endDate;
    }

    if (type) where.activityType = type;
    if (projectPath) where.projectPath = { contains: projectPath };
    if (converted !== undefined) {
      where.timeEntryId = converted ? { not: null } : null;
    }

    const [activities, total] = await Promise.all([
      prisma.gitLabActivity.findMany({
        where,
        include: {
          task: { select: { id: true, name: true } },
          timeEntry: { select: { id: true, hours: true } },
        },
        orderBy: { activityAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.gitLabActivity.count({ where }),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 取得活動統計摘要
   */
  async getActivitySummary(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ActivitySummary> {
    const activities = await prisma.gitLabActivity.findMany({
      where: {
        connection: { employeeId },
        activityAt: { gte: startDate, lte: endDate },
      },
      include: {
        timeEntry: { select: { hours: true } },
      },
    });

    let totalCommits = 0;
    let totalMRs = 0;
    let totalIssues = 0;
    let suggestedHours = 0;
    let convertedHours = 0;

    for (const activity of activities) {
      suggestedHours += Number(activity.suggestedHours || 0);

      if (activity.timeEntry) {
        convertedHours += Number(activity.timeEntry.hours);
      }

      switch (activity.activityType) {
        case 'COMMIT':
          totalCommits++;
          break;
        case 'MR_OPENED':
        case 'MR_MERGED':
        case 'MR_CLOSED':
        case 'MR_COMMENT':
        case 'MR_APPROVED':
          totalMRs++;
          break;
        case 'ISSUE_CREATED':
        case 'ISSUE_CLOSED':
        case 'ISSUE_UPDATED':
          totalIssues++;
          break;
      }
    }

    return {
      totalCommits,
      totalMRs,
      totalIssues,
      suggestedHours,
      convertedHours,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  /**
   * 將活動轉換為工時記錄
   */
  async convertToTimeEntry(
    activityId: string,
    employeeId: string,
    data: ConvertActivityDto
  ): Promise<string> {
    const activity = await prisma.gitLabActivity.findUnique({
      where: { id: activityId },
      include: { connection: true },
    });

    if (!activity) {
      throw new Error('Activity not found');
    }

    if (activity.connection.employeeId !== employeeId) {
      throw new Error('Access denied');
    }

    if (activity.timeEntryId) {
      throw new Error('Activity already converted');
    }

    // 需要一個專案來建立工時記錄
    // 如果有關聯的 task，使用 task 的專案；否則需要指定
    let projectId: string;
    if (data.taskId) {
      const task = await prisma.task.findUnique({ where: { id: data.taskId } });
      if (!task) {
        throw new Error('Task not found');
      }
      projectId = task.projectId;
    } else {
      throw new Error('taskId is required to convert activity to time entry');
    }

    // 建立工時記錄
    const timeEntry = await prisma.timeEntry.create({
      data: {
        employeeId,
        projectId,
        taskId: data.taskId,
        categoryId: data.categoryId,
        date: activity.activityAt,
        hours: data.hours,
        description: data.description || this.generateDescription(activity),
        status: 'PENDING',
      },
    });

    // 更新活動
    await prisma.gitLabActivity.update({
      where: { id: activityId },
      data: {
        timeEntryId: timeEntry.id,
        taskId: data.taskId,
      },
    });

    return timeEntry.id;
  }

  /**
   * 批次轉換活動為工時記錄
   */
  async batchConvertToTimeEntries(
    employeeId: string,
    data: BatchConvertActivitiesDto
  ): Promise<{ converted: number; failed: number }> {
    let converted = 0;
    let failed = 0;

    for (const activityId of data.activityIds) {
      try {
        const activity = await prisma.gitLabActivity.findUnique({
          where: { id: activityId },
        });

        if (!activity || activity.timeEntryId) {
          failed++;
          continue;
        }

        const hours = data.useSuggestedHours
          ? Number(activity.suggestedHours || 0.25)
          : 0.25;

        await this.convertToTimeEntry(activityId, employeeId, {
          hours,
          categoryId: data.categoryId,
          taskId: activity.taskId || undefined,
        });
        converted++;
      } catch {
        failed++;
      }
    }

    return { converted, failed };
  }

  /**
   * 將活動關聯到任務
   */
  async linkActivityToTask(
    activityId: string,
    employeeId: string,
    taskId: string
  ): Promise<void> {
    const activity = await prisma.gitLabActivity.findUnique({
      where: { id: activityId },
      include: { connection: true },
    });

    if (!activity) {
      throw new Error('Activity not found');
    }

    if (activity.connection.employeeId !== employeeId) {
      throw new Error('Access denied');
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new Error('Task not found');
    }

    await prisma.gitLabActivity.update({
      where: { id: activityId },
      data: { taskId },
    });
  }

  /**
   * 生成活動描述
   */
  private generateDescription(activity: {
    activityType: GitLabActivityType;
    projectPath: string;
    commitMessage?: string | null;
    mrTitle?: string | null;
    issueTitle?: string | null;
  }): string {
    switch (activity.activityType) {
      case 'COMMIT':
        return `[GitLab] Commit: ${activity.commitMessage?.split('\n')[0] || 'No message'}`;
      case 'MR_OPENED':
        return `[GitLab] Opened MR: ${activity.mrTitle}`;
      case 'MR_MERGED':
        return `[GitLab] Merged MR: ${activity.mrTitle}`;
      case 'MR_CLOSED':
        return `[GitLab] Closed MR: ${activity.mrTitle}`;
      case 'MR_COMMENT':
        return `[GitLab] Commented on MR: ${activity.mrTitle}`;
      case 'MR_APPROVED':
        return `[GitLab] Approved MR: ${activity.mrTitle}`;
      case 'ISSUE_CREATED':
        return `[GitLab] Created Issue: ${activity.issueTitle}`;
      case 'ISSUE_CLOSED':
        return `[GitLab] Closed Issue: ${activity.issueTitle}`;
      case 'ISSUE_UPDATED':
        return `[GitLab] Updated Issue: ${activity.issueTitle}`;
      default:
        return `[GitLab] Activity in ${activity.projectPath}`;
    }
  }
}

export const gitLabActivityService = new GitLabActivityService();
