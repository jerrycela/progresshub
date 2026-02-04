import type { Task, Project, ProgressLog, Department, UserRole } from 'shared/types'

// ============================================
// 任務池 Mock 資料
// ============================================

// Mock 專案資料
export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: '魔法王國 Online',
    description: '大型多人線上角色扮演遊戲',
    status: 'ACTIVE',
    startDate: '2025-01-01',
    endDate: '2026-06-30',
    createdById: 'user-1',
    createdAt: '2025-01-01',
    updatedAt: '2026-02-01',
  },
  {
    id: 'proj-2',
    name: '星際戰艦',
    description: '太空策略遊戲',
    status: 'ACTIVE',
    startDate: '2025-06-01',
    endDate: '2026-12-31',
    createdById: 'user-1',
    createdAt: '2025-06-01',
    updatedAt: '2026-02-01',
  },
  {
    id: 'proj-3',
    name: '賽車狂飆',
    description: '競速賽車遊戲',
    status: 'ACTIVE',
    startDate: '2025-03-01',
    endDate: '2025-12-31',
    createdById: 'user-1',
    createdAt: '2025-03-01',
    updatedAt: '2026-01-15',
  },
]

// Mock 部門資料
export const mockDepartments: { id: Department; name: string; memberCount: number }[] = [
  { id: 'ART', name: '美術部', memberCount: 12 },
  { id: 'PROGRAMMING', name: '程式部', memberCount: 8 },
  { id: 'PLANNING', name: '企劃部', memberCount: 5 },
  { id: 'QA', name: '品管部', memberCount: 4 },
  { id: 'SOUND', name: '音效部', memberCount: 3 },
  { id: 'MANAGEMENT', name: '管理部', memberCount: 2 },
]

// Mock 員工資料
export interface MockEmployee {
  id: string
  name: string
  email: string
  department: Department
  userRole: UserRole
  avatar?: string
}

export const mockEmployees: MockEmployee[] = [
  { id: 'emp-1', name: '王小明', email: 'wang@company.com', department: 'ART', userRole: 'EMPLOYEE' },
  { id: 'emp-2', name: '林小美', email: 'lin@company.com', department: 'ART', userRole: 'EMPLOYEE' },
  { id: 'emp-3', name: '張大華', email: 'zhang@company.com', department: 'ART', userRole: 'MANAGER' },
  { id: 'emp-4', name: '陳志明', email: 'chen@company.com', department: 'PROGRAMMING', userRole: 'EMPLOYEE' },
  { id: 'emp-5', name: '李小龍', email: 'li@company.com', department: 'PROGRAMMING', userRole: 'MANAGER' },
  { id: 'emp-6', name: '黃美玲', email: 'huang@company.com', department: 'PLANNING', userRole: 'PM' },
  { id: 'emp-7', name: '吳建國', email: 'wu@company.com', department: 'PLANNING', userRole: 'PRODUCER' },
  { id: 'emp-8', name: '劉小芳', email: 'liu@company.com', department: 'QA', userRole: 'EMPLOYEE' },
]

// 擴展的任務介面（包含任務池欄位）
export interface PoolTask extends Task {
  sourceType: 'ASSIGNED' | 'POOL' | 'SELF_CREATED'
  createdBy: { id: string; name: string; userRole?: UserRole }
  department?: Department
  canEdit: boolean
  canDelete: boolean
  collaboratorNames?: string[]
}

// Mock 任務池資料
export const mockPoolTasks: PoolTask[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    title: '設計主角立繪',
    description: '設計魔法王國主角的全身立繪，包含三套服裝',
    sourceType: 'POOL',
    status: 'UNCLAIMED',
    progress: 0,
    functionTags: ['ART'],
    startDate: '2026-02-01',
    dueDate: '2026-02-15',
    createdAt: '2026-01-28',
    updatedAt: '2026-01-28',
    project: { id: 'proj-1', name: '魔法王國 Online', status: 'ACTIVE', startDate: '2025-01-01', createdById: 'user-1', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
    createdBy: { id: 'emp-6', name: '黃美玲', userRole: 'PM' },
    department: 'ART',
    canEdit: true,
    canDelete: true,
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    title: 'UI 介面設計',
    description: '設計遊戲主選單和背包介面',
    sourceType: 'POOL',
    status: 'UNCLAIMED',
    progress: 0,
    functionTags: ['ART'],
    startDate: '2026-02-05',
    dueDate: '2026-02-20',
    createdAt: '2026-01-29',
    updatedAt: '2026-01-29',
    project: { id: 'proj-1', name: '魔法王國 Online', status: 'ACTIVE', startDate: '2025-01-01', createdById: 'user-1', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
    createdBy: { id: 'emp-7', name: '吳建國', userRole: 'PRODUCER' },
    department: 'ART',
    canEdit: true,
    canDelete: true,
  },
  {
    id: 'task-3',
    projectId: 'proj-2',
    title: '戰鬥系統開發',
    description: '開發太空戰鬥的核心邏輯',
    sourceType: 'POOL',
    status: 'IN_PROGRESS',
    progress: 25,
    functionTags: ['PROGRAMMING'],
    assigneeId: 'emp-4',
    assignee: { id: 'emp-4', name: '陳志明', email: 'chen@company.com', role: 'MEMBER', functionType: 'PROGRAMMING', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
    startDate: '2026-02-01',
    dueDate: '2026-03-15',
    createdAt: '2026-01-20',
    updatedAt: '2026-02-03',
    project: { id: 'proj-2', name: '星際戰艦', status: 'ACTIVE', startDate: '2025-06-01', createdById: 'user-1', createdAt: '2025-06-01', updatedAt: '2026-02-01' },
    createdBy: { id: 'emp-5', name: '李小龍', userRole: 'MANAGER' },
    department: 'PROGRAMMING',
    canEdit: true,
    canDelete: true,
    collaboratorNames: ['李小龍'],
  },
  {
    id: 'task-4',
    projectId: 'proj-1',
    title: '音效製作 - 戰鬥場景',
    description: '製作戰鬥場景的背景音樂和音效',
    sourceType: 'ASSIGNED',
    status: 'IN_PROGRESS',
    progress: 60,
    functionTags: ['SOUND'],
    assigneeId: 'emp-1',
    assignee: { id: 'emp-1', name: '王小明', email: 'wang@company.com', role: 'MEMBER', functionType: 'ART', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
    startDate: '2026-02-10',
    dueDate: '2026-02-28',
    createdAt: '2026-02-01',
    updatedAt: '2026-02-04',
    project: { id: 'proj-1', name: '魔法王國 Online', status: 'ACTIVE', startDate: '2025-01-01', createdById: 'user-1', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
    createdBy: { id: 'emp-3', name: '張大華', userRole: 'MANAGER' },
    department: 'ART',
    canEdit: false,
    canDelete: false,
  },
  {
    id: 'task-5',
    projectId: 'proj-3',
    title: '賽車模型建模',
    description: '建立 10 款賽車的 3D 模型',
    sourceType: 'SELF_CREATED',
    status: 'IN_PROGRESS',
    progress: 80,
    functionTags: ['ART'],
    assigneeId: 'emp-2',
    assignee: { id: 'emp-2', name: '林小美', email: 'lin@company.com', role: 'MEMBER', functionType: 'ART', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
    startDate: '2026-01-15',
    dueDate: '2026-02-15',
    createdAt: '2026-01-15',
    updatedAt: '2026-02-03',
    project: { id: 'proj-3', name: '賽車狂飆', status: 'ACTIVE', startDate: '2025-03-01', createdById: 'user-1', createdAt: '2025-03-01', updatedAt: '2026-01-15' },
    createdBy: { id: 'emp-2', name: '林小美', userRole: 'EMPLOYEE' },
    department: 'ART',
    canEdit: true,
    canDelete: true,
  },
  {
    id: 'task-6',
    projectId: 'proj-1',
    title: '測試關卡一',
    description: '測試第一關卡的所有功能',
    sourceType: 'POOL',
    status: 'UNCLAIMED',
    progress: 0,
    functionTags: ['PLANNING'],
    startDate: '2026-02-15',
    dueDate: '2026-02-25',
    dependsOnTaskIds: ['task-3'],
    createdAt: '2026-02-01',
    updatedAt: '2026-02-01',
    project: { id: 'proj-1', name: '魔法王國 Online', status: 'ACTIVE', startDate: '2025-01-01', createdById: 'user-1', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
    createdBy: { id: 'emp-6', name: '黃美玲', userRole: 'PM' },
    department: 'QA',
    canEdit: true,
    canDelete: true,
  },
]

// Mock 進度歷程資料
export const mockProgressLogs: ProgressLog[] = [
  {
    id: 'log-1',
    taskId: 'task-4',
    userId: 'emp-1',
    reportType: 'PROGRESS',
    progress: 60,
    progressDelta: 20,
    notes: '完成戰鬥場景的背景音樂初版，等待審核',
    reportedAt: '2026-02-04T14:30:00Z',
    user: { id: 'emp-1', name: '王小明', email: 'wang@company.com', role: 'MEMBER', functionType: 'ART', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
  },
  {
    id: 'log-2',
    taskId: 'task-4',
    userId: 'emp-1',
    reportType: 'PROGRESS',
    progress: 40,
    progressDelta: 20,
    notes: '音效素材收集完成，開始編曲',
    reportedAt: '2026-02-02T10:15:00Z',
    user: { id: 'emp-1', name: '王小明', email: 'wang@company.com', role: 'MEMBER', functionType: 'ART', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
  },
  {
    id: 'log-3',
    taskId: 'task-4',
    userId: 'emp-1',
    reportType: 'PROGRESS',
    progress: 20,
    progressDelta: 20,
    notes: '開始收集音效素材',
    reportedAt: '2026-02-01T09:00:00Z',
    user: { id: 'emp-1', name: '王小明', email: 'wang@company.com', role: 'MEMBER', functionType: 'ART', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
  },
  {
    id: 'log-4',
    taskId: 'task-3',
    userId: 'emp-4',
    reportType: 'PROGRESS',
    progress: 25,
    progressDelta: 15,
    notes: '核心戰鬥邏輯框架完成，開始實作細節',
    reportedAt: '2026-02-03T16:45:00Z',
    user: { id: 'emp-4', name: '陳志明', email: 'chen@company.com', role: 'MEMBER', functionType: 'PROGRAMMING', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
  },
  {
    id: 'log-5',
    taskId: 'task-3',
    userId: 'emp-4',
    reportType: 'PROGRESS',
    progress: 10,
    progressDelta: 10,
    notes: '開始設計戰鬥系統架構',
    reportedAt: '2026-02-01T11:00:00Z',
    user: { id: 'emp-4', name: '陳志明', email: 'chen@company.com', role: 'MEMBER', functionType: 'PROGRAMMING', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
  },
  {
    id: 'log-6',
    taskId: 'task-5',
    userId: 'emp-2',
    reportType: 'PROGRESS',
    progress: 80,
    progressDelta: 30,
    notes: '已完成 8 款賽車模型，剩餘 2 款進行中',
    reportedAt: '2026-02-03T17:30:00Z',
    user: { id: 'emp-2', name: '林小美', email: 'lin@company.com', role: 'MEMBER', functionType: 'ART', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
  },
  {
    id: 'log-7',
    taskId: 'task-5',
    userId: 'emp-2',
    reportType: 'PROGRESS',
    progress: 50,
    progressDelta: 30,
    notes: '完成 5 款賽車模型',
    reportedAt: '2026-01-28T15:00:00Z',
    user: { id: 'emp-2', name: '林小美', email: 'lin@company.com', role: 'MEMBER', functionType: 'ART', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
  },
  {
    id: 'log-8',
    taskId: 'task-5',
    userId: 'emp-2',
    reportType: 'PROGRESS',
    progress: 20,
    progressDelta: 20,
    notes: '完成 2 款賽車的基礎模型',
    reportedAt: '2026-01-20T14:00:00Z',
    user: { id: 'emp-2', name: '林小美', email: 'lin@company.com', role: 'MEMBER', functionType: 'ART', createdAt: '2025-01-01', updatedAt: '2026-02-01' },
  },
]

// 根據任務 ID 取得進度歷程
export function getProgressLogsByTaskId(taskId: string): ProgressLog[] {
  return mockProgressLogs
    .filter((log: ProgressLog) => log.taskId === taskId)
    .sort((a: ProgressLog, b: ProgressLog) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
}

// 根據任務 ID 取得任務詳情
export function getTaskById(taskId: string): PoolTask | undefined {
  return mockPoolTasks.find((task: PoolTask) => task.id === taskId)
}

// 取得可用於篩選的專案列表
export function getProjectsForFilter(): { id: string; name: string }[] {
  return mockProjects.map((p: Project) => ({ id: p.id, name: p.name }))
}

// 取得可用於篩選的部門列表
export function getDepartmentsForFilter(): { id: Department; name: string }[] {
  return mockDepartments.map((d: { id: Department; name: string }) => ({ id: d.id, name: d.name }))
}
