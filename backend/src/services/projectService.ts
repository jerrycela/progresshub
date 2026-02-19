import prisma from "../config/database";
import { Project, ProjectStatus, Prisma } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";

export interface CreateProjectDto {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: ProjectStatus;
}

export interface ProjectListParams {
  page?: number;
  limit?: number;
  status?: ProjectStatus;
  search?: string;
}

export class ProjectService {
  /**
   * 取得專案列表（分頁）
   */
  async getProjects(
    params: ProjectListParams,
  ): Promise<{ data: Project[]; total: number }> {
    const { page = 1, limit = 20, status, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {};

    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: "desc" },
        include: {
          _count: {
            select: { tasks: true, milestones: true },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * 取得單一專案（含任務和里程碑）
   */
  async getProjectById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { plannedStartDate: "asc" },
        },
        milestones: {
          orderBy: { targetDate: "asc" },
        },
      },
    });
  }

  /**
   * 建立專案
   */
  async createProject(data: CreateProjectDto): Promise<Project> {
    return prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
  }

  /**
   * 更新專案
   */
  async updateProject(id: string, data: UpdateProjectDto): Promise<Project> {
    const updateData: Prisma.ProjectUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.startDate !== undefined)
      updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.status !== undefined) updateData.status = data.status;

    return prisma.project.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * 刪除專案（檢查是否有進行中的任務）
   */
  async deleteProject(id: string): Promise<void> {
    const activeTasks = await prisma.task.count({
      where: {
        projectId: id,
        status: { in: ["IN_PROGRESS", "CLAIMED", "BLOCKED", "PAUSED"] },
      },
    });

    if (activeTasks > 0) {
      throw new AppError(
        409,
        `無法刪除專案：仍有 ${activeTasks} 個進行中的任務。請先完成或取消這些任務。`,
      );
    }

    await prisma.project.delete({
      where: { id },
    });
  }

  /**
   * 取得專案統計資訊
   */
  async getProjectStats(id: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    averageProgress: number;
  }> {
    const tasks = await prisma.task.findMany({
      where: { projectId: id },
      select: { status: true, progressPercentage: true },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "DONE").length;
    const inProgressTasks = tasks.filter(
      (t) => t.status === "IN_PROGRESS",
    ).length;
    const averageProgress =
      totalTasks > 0
        ? Math.round(
            tasks.reduce((sum, t) => sum + t.progressPercentage, 0) /
              totalTasks,
          )
        : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      averageProgress,
    };
  }

  /**
   * 取得甘特圖資料
   */
  async getGanttData(id: string): Promise<{
    project: Project;
    tasks: Array<{
      id: string;
      name: string;
      start: Date;
      end: Date;
      progress: number;
      dependencies: string[];
      assignee: string;
    }>;
  }> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignedTo: {
              select: { name: true },
            },
          },
          orderBy: { plannedStartDate: "asc" },
        },
      },
    });

    if (!project) {
      throw new AppError(404, "Project not found");
    }

    const tasks = project.tasks.map((task) => ({
      id: task.id,
      name: task.name,
      start: task.actualStartDate || task.plannedStartDate || new Date(),
      end: task.actualEndDate || task.plannedEndDate || new Date(),
      progress: task.progressPercentage,
      dependencies: task.dependencies,
      assignee: task.assignedTo?.name ?? "",
    }));

    return { project, tasks };
  }
}

export const projectService = new ProjectService();
