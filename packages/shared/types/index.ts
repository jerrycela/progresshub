export * from './api'

// ============================================
// ProgressHub 共用類型定義
// ============================================

// 角色與權限
export type Role = 'MEMBER' | 'PM' | 'ADMIN'

// 新增：四種使用者角色（任務分配用）
export type UserRole = 'EMPLOYEE' | 'PM' | 'PRODUCER' | 'MANAGER'

export const UserRoleLabels: Record<UserRole, string> = {
  EMPLOYEE: '一般同仁',
  PM: 'PM',
  PRODUCER: '製作人',
  MANAGER: '部門主管',
}

// 任務來源類型
export type TaskSourceType = 'ASSIGNED' | 'POOL' | 'SELF_CREATED'

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
  | 'PAUSED'      // 暫停（被插件中斷）
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
  isActive?: boolean              // Ralph Loop 迭代 2 新增
  lastActiveAt?: string           // Ralph Loop 迭代 2 新增
  department?: string             // Ralph Loop 迭代 2 新增
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
  priority?: TaskPriority         // Ralph Loop 迭代 2 新增
  progress: number // 0-100
  projectId: string
  project?: Project
  creatorId?: string              // Ralph Loop 迭代 2 新增
  creator?: User                  // Ralph Loop 迭代 2 新增
  assigneeId?: string
  assignee?: User
  functionTags: FunctionType[]
  gitlabIssueId?: string
  gitlabIssueUrl?: string
  startDate?: string
  dueDate?: string
  estimatedHours?: number         // Ralph Loop 迭代 2 新增
  actualHours?: number            // Ralph Loop 迭代 2 新增
  blockerReason?: string          // Ralph Loop 迭代 2 新增
  pauseReason?: string            // 暫停原因
  pauseNote?: string              // 暫停說明
  pausedAt?: string               // 暫停時間
  dependsOnTaskIds?: string[]     // Ralph Loop 迭代 2 新增
  createdAt: string
  updatedAt: string
  closedAt?: string               // Ralph Loop 迭代 2 新增
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
// 錯誤代碼（Ralph Loop 迭代 2 新增）
// ============================================
export type ErrorCode =
  // 認證相關
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT_FAILED'
  | 'AUTH_UNAUTHORIZED'
  // 任務相關
  | 'TASK_NOT_FOUND'
  | 'TASK_NOT_UNCLAIMED'
  | 'TASK_ALREADY_CLAIMED'
  | 'TASK_UPDATE_FAILED'
  | 'TASK_CREATE_FAILED'
  // 專案相關
  | 'PROJECT_NOT_FOUND'
  // 驗證相關
  | 'VALIDATION_ERROR'
  // 通用
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

// ============================================
// 統一操作結果類型（Ralph Loop 迭代 2 新增）
// ============================================
export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: {
    code: ErrorCode
    message: string
    details?: Record<string, unknown>
  }
}

// ============================================
// 任務優先級（Ralph Loop 迭代 2 新增）
// ============================================
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

// ============================================
// 任務狀態轉換規則（Ralph Loop 迭代 2 新增）
// ============================================
export const TaskStatusTransitions: Record<TaskStatus, TaskStatus[]> = {
  UNCLAIMED: ['CLAIMED'],
  CLAIMED: ['UNCLAIMED', 'IN_PROGRESS'],
  IN_PROGRESS: ['CLAIMED', 'PAUSED', 'BLOCKED', 'DONE'],
  PAUSED: ['IN_PROGRESS'],  // 暫停後可繼續進行
  BLOCKED: ['IN_PROGRESS'],
  DONE: [],
}

// ============================================
// 建立任務輸入類型（Ralph Loop 迭代 2 新增）
// ============================================
export interface CreateTaskInput {
  title: string
  description?: string
  priority?: TaskPriority
  projectId: string
  functionTags?: FunctionType[]
  startDate?: string
  dueDate?: string
  estimatedHours?: number
}

// ============================================
// 更新任務輸入類型（Ralph Loop 迭代 2 新增）
// ============================================
export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  progress?: number
  assigneeId?: string
  estimatedHours?: number
  actualHours?: number
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
// GitLab Issue
// ============================================
export interface GitLabIssue {
  id: number
  title: string
  url: string
  state: 'opened' | 'closed'
}

// ============================================
// Pool Task（任務池擴展任務）
// ============================================
export interface PoolTask extends Task {
  sourceType: TaskSourceType
  createdBy: { id: string; name: string; userRole?: UserRole }
  department?: Department
  canEdit: boolean
  canDelete: boolean
  collaboratorNames?: string[]
  gitlabIssue?: GitLabIssue
}

// ============================================
// 任務註記
// ============================================
export interface TaskNote {
  id: string
  taskId: string
  content: string
  authorId: string
  authorName: string
  authorRole: UserRole
  createdAt: string
}

// ============================================
// 里程碑資料（前端擴展）
// ============================================
export interface MilestoneData {
  id: string
  projectId: string
  name: string
  description?: string
  date: string
  color?: string
  createdById: string
  createdByName: string
  createdAt: string
}

// ============================================
// Mock 員工（前端 mock 用）
// ============================================
export interface MockEmployee {
  id: string
  name: string
  email: string
  department: Department
  userRole: UserRole
  avatar?: string
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
