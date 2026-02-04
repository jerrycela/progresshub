export type PermissionLevel = 'EMPLOYEE' | 'PM' | 'ADMIN'

// 新增：四種角色類型
export type UserRole = 'EMPLOYEE' | 'PM' | 'PRODUCER' | 'MANAGER'

// 角色顯示名稱
export const UserRoleLabels: Record<UserRole, string> = {
  EMPLOYEE: '一般同仁',
  PM: 'PM',
  PRODUCER: '製作人',
  MANAGER: '部門主管',
}

// 任務來源類型
export type TaskSourceType = 'ASSIGNED' | 'POOL' | 'SELF_CREATED'

// 回報類型
export type ReportType = 'PROGRESS' | 'CONTINUE' | 'BLOCKED' | 'COMPLETE'

// 部門類型
export type Department = 'ART' | 'PROGRAMMING' | 'PLANNING' | 'QA' | 'SOUND' | 'MANAGEMENT'

export const DepartmentLabels: Record<Department, string> = {
  ART: '美術部',
  PROGRAMMING: '程式部',
  PLANNING: '企劃部',
  QA: '品管部',
  SOUND: '音效部',
  MANAGEMENT: '管理部',
}
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED'
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type MilestoneStatus = 'PENDING' | 'ACHIEVED'

export interface User {
  id: string
  name: string
  email: string
  department?: string
  role?: string
  permissionLevel: PermissionLevel
  managedProjects?: string[]
}

export interface Employee {
  id: string
  name: string
  email: string
  slackUserId: string
  department?: string
  role?: string
  permissionLevel: PermissionLevel
  isActive: boolean
  _count?: {
    assignedTasks: number
  }
}

export interface Project {
  id: string
  name: string
  description?: string
  startDate: string
  endDate?: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  tasks?: Task[]
  milestones?: Milestone[]
  _count?: {
    tasks: number
    milestones: number
  }
}

export interface Task {
  id: string
  projectId: string
  name: string
  description?: string
  assignedToId: string
  collaborators: string[]
  plannedStartDate: string
  plannedEndDate: string
  actualStartDate?: string
  actualEndDate?: string
  progressPercentage: number
  status: TaskStatus
  dependencies: string[]
  milestoneId?: string
  createdAt: string
  updatedAt: string
  project?: { id: string; name: string }
  assignedTo?: { id: string; name: string; role?: string }
  milestone?: { id: string; name: string }
  progressLogs?: ProgressLog[]
}

export interface Milestone {
  id: string
  projectId: string
  name: string
  description?: string
  targetDate: string
  status: MilestoneStatus
  createdAt: string
  updatedAt: string
  project?: { id: string; name: string }
  _count?: {
    tasks: number
  }
}

export interface ProgressLog {
  id: string
  taskId: string
  employeeId: string
  progressPercentage: number
  notes?: string
  reportedAt: string
  task?: { id: string; name: string; project?: { id: string; name: string } }
  employee?: { id: string; name: string }
}

export interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  progress: number
  dependencies: string
  custom_class: string
  projectId: string
  projectName: string
  assigneeId: string
  assigneeName: string
  assigneeRole?: string
  status: TaskStatus
  actualStart?: string
  actualEnd?: string
  milestoneId?: string
  milestoneName?: string
  isMilestone?: boolean
}

export interface GanttStats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  notStartedTasks: number
  averageProgress: number
  completionRate: number
}

// ===================================
// GitLab 整合類型
// ===================================

export type GitLabActivityType = 'COMMIT' | 'ISSUE'

export interface GitLabConnection {
  gitlabId: number | null
  gitlabUsername: string | null
  gitlabConnectedAt: string | null
  gitlabLastSyncAt: string | null
}

export interface GitLabActivity {
  id: string
  employeeId: string
  type: GitLabActivityType
  gitlabId: string
  title: string
  description?: string
  url: string
  projectId: number
  projectName: string
  projectUrl?: string
  state?: string
  gitlabCreatedAt: string
  syncedAt: string
  taskId?: string
  task?: { id: string; name: string }
}

export interface GitLabSyncResult {
  success: boolean
  commitsCount: number
  issuesCount: number
  message?: string
}

export interface GitLabUser {
  id: number
  username: string
  name: string
  avatar_url?: string
  web_url: string
}
