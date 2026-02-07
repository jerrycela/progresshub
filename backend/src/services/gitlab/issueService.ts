import prisma from "../../config/database";
import { SyncDirection, TaskStatus } from "@prisma/client";
import { createGitLabClient } from "../../utils/gitlab/apiClient";
import { gitLabOAuthService } from "./oauthService";
import { CreateIssueMappingDto } from "../../types/gitlab";

export class GitLabIssueService {
  /**
   * 取得 Issue 對應列表
   */
  async getIssueMappings(employeeId: string) {
    return prisma.gitLabIssueMapping.findMany({
      where: {
        connection: { employeeId },
      },
      include: {
        connection: {
          select: {
            id: true,
            gitlabUsername: true,
            instance: { select: { id: true, name: true, baseUrl: true } },
          },
        },
        task: {
          select: {
            id: true,
            name: true,
            status: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 建立 Issue 與任務的對應
   */
  async createIssueMapping(
    employeeId: string,
    data: CreateIssueMappingDto,
  ): Promise<string> {
    // 驗證連結所有權
    const connection = await prisma.gitLabConnection.findUnique({
      where: { id: data.connectionId },
      include: { instance: true },
    });

    if (!connection || connection.employeeId !== employeeId) {
      throw new Error("Connection not found or access denied");
    }

    // 驗證任務存在
    const task = await prisma.task.findUnique({ where: { id: data.taskId } });
    if (!task) {
      throw new Error("Task not found");
    }

    // 檢查是否已存在對應
    const existingByIssue = await prisma.gitLabIssueMapping.findUnique({
      where: {
        connectionId_gitlabIssueId: {
          connectionId: data.connectionId,
          gitlabIssueId: data.gitlabIssueId,
        },
      },
    });

    if (existingByIssue) {
      throw new Error("This GitLab issue is already mapped to a task");
    }

    const existingByTask = await prisma.gitLabIssueMapping.findUnique({
      where: { taskId: data.taskId },
    });

    if (existingByTask) {
      throw new Error("This task is already mapped to a GitLab issue");
    }

    // 取得 Issue 資訊
    const accessToken = await gitLabOAuthService.getValidAccessToken(
      data.connectionId,
    );
    const client = createGitLabClient(connection.instance.baseUrl, accessToken);
    const issue = await client.getIssue(data.projectPath, data.gitlabIssueIid);

    // 建立對應
    const mapping = await prisma.gitLabIssueMapping.create({
      data: {
        connectionId: data.connectionId,
        gitlabIssueId: data.gitlabIssueId,
        gitlabIssueIid: data.gitlabIssueIid,
        projectPath: data.projectPath,
        issueUrl: issue.webUrl,
        taskId: data.taskId,
        syncDirection: (data.syncDirection as SyncDirection) || "BIDIRECTIONAL",
      },
    });

    return mapping.id;
  }

  /**
   * 刪除 Issue 對應
   */
  async deleteIssueMapping(
    mappingId: string,
    employeeId: string,
  ): Promise<void> {
    const mapping = await prisma.gitLabIssueMapping.findUnique({
      where: { id: mappingId },
      include: { connection: true },
    });

    if (!mapping || mapping.connection.employeeId !== employeeId) {
      throw new Error("Mapping not found or access denied");
    }

    await prisma.gitLabIssueMapping.delete({ where: { id: mappingId } });
  }

  /**
   * 從 GitLab Issue 同步到任務
   */
  async syncFromGitLab(mappingId: string, employeeId: string): Promise<void> {
    const mapping = await prisma.gitLabIssueMapping.findUnique({
      where: { id: mappingId },
      include: {
        connection: { include: { instance: true } },
        task: true,
      },
    });

    if (!mapping || mapping.connection.employeeId !== employeeId) {
      throw new Error("Mapping not found or access denied");
    }

    if (mapping.syncDirection === "TASK_TO_GITLAB") {
      throw new Error("Sync direction does not allow GitLab to Task sync");
    }

    const accessToken = await gitLabOAuthService.getValidAccessToken(
      mapping.connectionId,
    );
    const client = createGitLabClient(
      mapping.connection.instance.baseUrl,
      accessToken,
    );
    const issue = await client.getIssue(
      mapping.projectPath,
      mapping.gitlabIssueIid,
    );

    // 更新任務狀態
    const newStatus = this.mapGitLabStateToTaskStatus(issue.state);

    await prisma.task.update({
      where: { id: mapping.taskId },
      data: {
        name: issue.title,
        status: newStatus,
      },
    });

    // 更新同步時間
    await prisma.gitLabIssueMapping.update({
      where: { id: mappingId },
      data: { lastSyncAt: new Date() },
    });
  }

  /**
   * 從任務同步到 GitLab Issue
   */
  async syncToGitLab(mappingId: string, employeeId: string): Promise<void> {
    const mapping = await prisma.gitLabIssueMapping.findUnique({
      where: { id: mappingId },
      include: {
        connection: { include: { instance: true } },
        task: true,
      },
    });

    if (!mapping || mapping.connection.employeeId !== employeeId) {
      throw new Error("Mapping not found or access denied");
    }

    if (mapping.syncDirection === "GITLAB_TO_TASK") {
      throw new Error("Sync direction does not allow Task to GitLab sync");
    }

    const accessToken = await gitLabOAuthService.getValidAccessToken(
      mapping.connectionId,
    );
    const client = createGitLabClient(
      mapping.connection.instance.baseUrl,
      accessToken,
    );

    // 更新 GitLab Issue
    const stateEvent = this.mapTaskStatusToGitLabState(mapping.task.status);

    await client.updateIssue(mapping.projectPath, mapping.gitlabIssueIid, {
      title: mapping.task.name,
      state_event: stateEvent,
    });

    // 更新同步時間
    await prisma.gitLabIssueMapping.update({
      where: { id: mappingId },
      data: { lastSyncAt: new Date() },
    });
  }

  /**
   * 從任務建立 GitLab Issue
   */
  async createIssueFromTask(
    connectionId: string,
    projectPath: string,
    taskId: string,
    employeeId: string,
  ): Promise<string> {
    const connection = await prisma.gitLabConnection.findUnique({
      where: { id: connectionId },
      include: { instance: true },
    });

    if (!connection || connection.employeeId !== employeeId) {
      throw new Error("Connection not found or access denied");
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    // 檢查任務是否已有對應
    const existing = await prisma.gitLabIssueMapping.findUnique({
      where: { taskId },
    });

    if (existing) {
      throw new Error("Task is already mapped to a GitLab issue");
    }

    const accessToken =
      await gitLabOAuthService.getValidAccessToken(connectionId);
    const client = createGitLabClient(connection.instance.baseUrl, accessToken);

    // 建立 GitLab Issue
    const description = `Linked from ProgressHub task.\n\nProject: ${task.project.name}\nTask: ${task.name}`;
    const issue = await client.createIssue(projectPath, task.name, description);

    // 建立對應
    const mapping = await prisma.gitLabIssueMapping.create({
      data: {
        connectionId,
        gitlabIssueId: issue.id,
        gitlabIssueIid: issue.iid,
        projectPath,
        issueUrl: issue.webUrl,
        taskId,
        syncDirection: "BIDIRECTIONAL",
      },
    });

    return mapping.id;
  }

  /**
   * 搜尋 GitLab Issues
   */
  async searchIssues(
    connectionId: string,
    projectPath: string,
    query: string,
    employeeId: string,
  ) {
    const connection = await prisma.gitLabConnection.findUnique({
      where: { id: connectionId },
      include: { instance: true },
    });

    if (!connection || connection.employeeId !== employeeId) {
      throw new Error("Connection not found or access denied");
    }

    const accessToken =
      await gitLabOAuthService.getValidAccessToken(connectionId);
    const client = createGitLabClient(connection.instance.baseUrl, accessToken);

    return client.searchIssues(projectPath, query);
  }

  /**
   * 狀態對應：GitLab -> Task
   */
  mapGitLabStateToTaskStatus(gitlabState: string): TaskStatus {
    switch (gitlabState) {
      case "opened":
        return "IN_PROGRESS";
      case "closed":
        return "DONE";
      default:
        return "UNCLAIMED";
    }
  }

  /**
   * 狀態對應：Task -> GitLab
   */
  mapTaskStatusToGitLabState(taskStatus: TaskStatus): "close" | "reopen" {
    switch (taskStatus) {
      case "DONE":
        return "close";
      default:
        return "reopen";
    }
  }
}

export const gitLabIssueService = new GitLabIssueService();
