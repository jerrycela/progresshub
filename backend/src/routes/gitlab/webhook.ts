import { Router, Request, Response } from 'express';
import prisma from '../../config/database';
import { gitLabInstanceService } from '../../services/gitlab';
import { verifyWebhookSignature } from '../../utils/gitlab/webhookVerifier';
import { GitLabPushEvent, GitLabMergeRequestEvent, GitLabIssueEvent } from '../../types/gitlab';
import { GitLabActivityType } from '@prisma/client';

const router = Router();

/**
 * POST /api/gitlab/webhook/:instanceId
 * 接收 GitLab Webhook 事件
 */
router.post('/:instanceId', async (req: Request, res: Response): Promise<void> => {
  const { instanceId } = req.params;
  const token = req.headers['x-gitlab-token'] as string;
  const eventType = req.headers['x-gitlab-event'] as string;

  // 快速回應，避免 timeout
  res.status(200).json({ received: true });

  // 異步處理事件
  processWebhookEvent(instanceId, token, eventType, req.body).catch((error) => {
    console.error('Webhook processing error:', error);
  });
});

/**
 * 處理 Webhook 事件
 */
async function processWebhookEvent(
  instanceId: string,
  token: string,
  _eventType: string,
  body: unknown
): Promise<void> {
  // 取得實例並驗證 webhook secret
  const instance = await gitLabInstanceService.getInstanceWithSecrets(instanceId);
  if (!instance) {
    console.error(`Webhook: Instance ${instanceId} not found`);
    return;
  }

  if (instance.webhookSecret) {
    if (!verifyWebhookSignature(token, instance.webhookSecret)) {
      console.error(`Webhook: Invalid signature for instance ${instanceId}`);
      return;
    }
  }

  const event = body as Record<string, unknown>;
  const objectKind = event.objectKind as string;
  const project = event.project as { pathWithNamespace: string } | undefined;
  const user = event.user as { id: number; username: string } | undefined;

  if (!project || !user) {
    console.log('Webhook: Missing project or user info');
    return;
  }

  // 找到對應的連結
  const connection = await prisma.gitLabConnection.findFirst({
    where: {
      instanceId,
      gitlabUserId: user.id,
      isActive: true,
    },
  });

  if (!connection) {
    console.log(`Webhook: No active connection for user ${user.username} on instance ${instanceId}`);
    return;
  }

  console.log(`Webhook: Processing ${objectKind} event for ${user.username}`);

  try {
    switch (objectKind) {
      case 'push':
        await handlePushEvent(connection.id, project.pathWithNamespace, body as GitLabPushEvent);
        break;
      case 'merge_request':
        await handleMergeRequestEvent(connection.id, project.pathWithNamespace, body as GitLabMergeRequestEvent);
        break;
      case 'issue':
        await handleIssueEvent(connection.id, project.pathWithNamespace, body as GitLabIssueEvent);
        break;
      default:
        console.log(`Webhook: Unhandled event type: ${objectKind}`);
    }
  } catch (error) {
    console.error(`Webhook: Error processing ${objectKind} event:`, error);
  }
}

/**
 * 處理 Push 事件
 */
async function handlePushEvent(
  connectionId: string,
  projectPath: string,
  event: GitLabPushEvent
): Promise<void> {
  const connection = await prisma.gitLabConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection?.syncCommits) {
    return;
  }

  for (const commit of event.commits) {
    const eventId = `commit_${projectPath}_${commit.id}`;

    // 檢查是否已存在
    const existing = await prisma.gitLabActivity.findUnique({
      where: { gitlabEventId: eventId },
    });

    if (!existing) {
      // 計算行數變更
      const additions = commit.added.length + commit.modified.length;
      const deletions = commit.removed.length;
      const suggestedHours = Math.min(0.25 + (additions + deletions) / 100, 2.0);

      await prisma.gitLabActivity.create({
        data: {
          connectionId,
          activityType: 'COMMIT',
          gitlabEventId: eventId,
          projectPath,
          commitSha: commit.id,
          commitMessage: commit.message,
          additions,
          deletions,
          activityAt: new Date(commit.timestamp),
          suggestedHours,
        },
      });
    }
  }

  // 更新最後同步時間
  await prisma.gitLabConnection.update({
    where: { id: connectionId },
    data: { lastSyncAt: new Date() },
  });
}

/**
 * 處理 Merge Request 事件
 */
async function handleMergeRequestEvent(
  connectionId: string,
  projectPath: string,
  event: GitLabMergeRequestEvent
): Promise<void> {
  const connection = await prisma.gitLabConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection?.syncMRs) {
    return;
  }

  const mr = event.objectAttributes;
  let activityType: GitLabActivityType;
  let suggestedHours: number;

  switch (mr.action) {
    case 'open':
      activityType = 'MR_OPENED';
      suggestedHours = 0.5;
      break;
    case 'merge':
      activityType = 'MR_MERGED';
      suggestedHours = 0.25;
      break;
    case 'close':
      activityType = 'MR_CLOSED';
      suggestedHours = 0.25;
      break;
    case 'approved':
      activityType = 'MR_APPROVED';
      suggestedHours = 0.25;
      break;
    default:
      // 不處理其他 action
      return;
  }

  const eventId = `mr_${projectPath}_${mr.iid}_${mr.action}`;

  const existing = await prisma.gitLabActivity.findUnique({
    where: { gitlabEventId: eventId },
  });

  if (!existing) {
    await prisma.gitLabActivity.create({
      data: {
        connectionId,
        activityType,
        gitlabEventId: eventId,
        projectPath,
        mrIid: mr.iid,
        mrTitle: mr.title,
        mrState: mr.state,
        activityAt: new Date(),
        suggestedHours,
      },
    });
  }

  await prisma.gitLabConnection.update({
    where: { id: connectionId },
    data: { lastSyncAt: new Date() },
  });
}

/**
 * 處理 Issue 事件
 */
async function handleIssueEvent(
  connectionId: string,
  projectPath: string,
  event: GitLabIssueEvent
): Promise<void> {
  const connection = await prisma.gitLabConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection?.syncIssues) {
    return;
  }

  const issue = event.objectAttributes;

  // 記錄活動
  let activityType: GitLabActivityType;
  switch (issue.action) {
    case 'open':
      activityType = 'ISSUE_CREATED';
      break;
    case 'close':
      activityType = 'ISSUE_CLOSED';
      break;
    case 'update':
    case 'reopen':
      activityType = 'ISSUE_UPDATED';
      break;
    default:
      return;
  }

  const eventId = `issue_${projectPath}_${issue.iid}_${issue.action}_${Date.now()}`;

  await prisma.gitLabActivity.create({
    data: {
      connectionId,
      activityType,
      gitlabEventId: eventId,
      projectPath,
      issueIid: issue.iid,
      issueTitle: issue.title,
      activityAt: new Date(),
      suggestedHours: 0.25,
    },
  });

  // 如果有對應的任務，同步狀態
  const mapping = await prisma.gitLabIssueMapping.findFirst({
    where: {
      connectionId,
      gitlabIssueIid: issue.iid,
      projectPath,
    },
  });

  if (mapping && mapping.syncDirection !== 'TASK_TO_GITLAB') {
    const taskStatus = issue.state === 'closed' ? 'COMPLETED' : 'IN_PROGRESS';
    await prisma.task.update({
      where: { id: mapping.taskId },
      data: { status: taskStatus },
    });

    await prisma.gitLabIssueMapping.update({
      where: { id: mapping.id },
      data: { lastSyncAt: new Date() },
    });
  }

  await prisma.gitLabConnection.update({
    where: { id: connectionId },
    data: { lastSyncAt: new Date() },
  });
}

export default router;
