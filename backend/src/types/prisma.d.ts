// 臨時類型定義（當 Prisma Client 無法生成時使用）
// 正常情況下應由 prisma generate 自動生成

export enum PermissionLevel {
  EMPLOYEE = 'EMPLOYEE',
  PM = 'PM',
  ADMIN = 'ADMIN',
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
}

export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  ACHIEVED = 'ACHIEVED',
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
