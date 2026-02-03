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
export type ReportType =
  | 'PROGRESS'  // 進度更新（有實際進展）
  | 'CONTINUE'  // 繼續進行（無明顯進展變化）
  | 'BLOCKED'   // 卡關回報
  | 'COMPLETE'  // 完成回報

export interface ProgressLog {
  id: string
  taskId: string
  task?: Task
  userId: string
  user?: User
  reportType: ReportType      // 回報類型
  progress: number            // 進度百分比
  progressDelta?: number      // 進度變化量（本次增加多少）
  notes?: string              // 備註
  blockerReason?: string      // 卡關原因（當 reportType 為 BLOCKED 時）
  reportedAt: string
}

// ============================================
// 回報週期設定
// ============================================
export type ReportCycle =
  | 'DAILY'     // 每日回報（預設）
  | 'WEEKLY'    // 每週回報
  | 'CUSTOM'    // 自訂週期

export interface TaskReportSetting {
  taskId: string
  reportCycle: ReportCycle
  customDays?: number         // 當 reportCycle 為 CUSTOM 時，幾天回報一次
  nextReportDue?: string      // 下次應回報日期
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
