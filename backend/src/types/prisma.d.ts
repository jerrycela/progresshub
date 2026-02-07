// 臨時類型定義（當 Prisma Client 無法生成時使用）
// 正常情況下應由 prisma generate 自動生成
// 與 Prisma schema 和 shared types 保持一致

export enum PermissionLevel {
  EMPLOYEE = "EMPLOYEE",
  PM = "PM",
  PRODUCER = "PRODUCER",
  MANAGER = "MANAGER",
  ADMIN = "ADMIN",
}

export enum ProjectStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  PAUSED = "PAUSED",
}

export enum TaskStatus {
  UNCLAIMED = "UNCLAIMED",
  CLAIMED = "CLAIMED",
  IN_PROGRESS = "IN_PROGRESS",
  PAUSED = "PAUSED",
  DONE = "DONE",
  BLOCKED = "BLOCKED",
}

export enum MilestoneStatus {
  PENDING = "PENDING",
  ACHIEVED = "ACHIEVED",
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  slackUserId: string;
  department: string | null;
  permissionLevel: PermissionLevel;
  managedProjects: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  assignedToId: string;
  collaborators: string[];
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  progressPercentage: number;
  status: TaskStatus;
  dependencies: string[];
  milestoneId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  targetDate: Date;
  status: MilestoneStatus;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgressLog {
  id: string;
  taskId: string;
  employeeId: string;
  progressPercentage: number;
  notes: string | null;
  reportedAt: Date;
}
