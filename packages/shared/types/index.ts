// ============================================
// ProgressHub 共用類型定義
// ============================================

// 角色與權限
export type Role = 'MEMBER' | 'PM' | 'ADMIN'

// 職能類型
export type FunctionType =
  | 'PLANNING'    // 企劃
  | 'PROGRAMMING' // 程式
  | 'ART'         // 美術
  | 'ANIMATION'   // 動態
  | 'SOUND'       // 音效
  | 'VFX'         // 特效
  | 'COMBAT'      // 戰鬥

// 任務狀態
export type TaskStatus =
  | 'UNCLAIMED'   // 待認領
  | 'CLAIMED'     // 已認領
  | 'IN_PROGRESS' // 進行中
  | 'DONE'        // 完成
  | 'BLOCKED'     // 阻塞

// 專案狀態
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD'

// ============================================
// 使用者
// ============================================
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  slackId?: string
  gitlabId?: string
  role: Role
  functionType: FunctionType
  createdAt: string
  updatedAt: string
}

// ============================================
// 專案
// ============================================
export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  startDate: string
  endDate?: string
  createdById: string
  createdBy?: User
  createdAt: string
  updatedAt: string
}

// ============================================
// 任務
// ============================================
export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  progress: number // 0-100
  projectId: string
  project?: Project
  assigneeId?: string
  assignee?: User
  functionTags: FunctionType[]
  gitlabIssueId?: string
  gitlabIssueUrl?: string
  startDate?: string
  dueDate?: string
  createdAt: string
  updatedAt: string
}

// ============================================
// 任務認領記錄
// ============================================
export interface TaskClaim {
  id: string
  taskId: string
  task?: Task
  userId: string
  user?: User
  claimedAt: string
  isActive: boolean
}

// ============================================
// 進度回報記錄
// ============================================
export interface ProgressLog {
  id: string
  taskId: string
  task?: Task
  userId: string
  user?: User
  progress: number
  notes?: string
  reportedAt: string
}

// ============================================
// 里程碑
// ============================================
export interface Milestone {
  id: string
  name: string
  projectId: string
  project?: Project
  targetDate: string
  status: 'PENDING' | 'ACHIEVED'
  createdAt: string
}

// ============================================
// API 回應格式
// ============================================
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ============================================
// Dashboard 統計
// ============================================
export interface DashboardStats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  unclaimedTasks: number
  overdueTasksCount: number
}

// ============================================
// 職能負載統計
// ============================================
export interface FunctionWorkload {
  functionType: FunctionType
  totalTasks: number
  unclaimedTasks: number
  inProgressTasks: number
  memberCount: number
}
