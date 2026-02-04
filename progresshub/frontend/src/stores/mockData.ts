import type { Task, ProgressLog, Project, Department, UserRole, ReleasePhase, TransferLog, TaskNote } from '@/types'

// Mock 專案資料
export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: '魔法王國 Online',
    description: '大型多人線上角色扮演遊戲',
    startDate: '2025-01-01',
    endDate: '2026-06-30',
    status: 'ACTIVE',
    createdAt: '2025-01-01',
    updatedAt: '2026-02-01',
  },
  {
    id: 'proj-2',
    name: '星際戰艦',
    description: '太空策略遊戲',
    startDate: '2025-06-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    createdAt: '2025-06-01',
    updatedAt: '2026-02-01',
  },
  {
    id: 'proj-3',
    name: '賽車狂飆',
    description: '競速賽車遊戲',
    startDate: '2025-03-01',
    endDate: '2025-12-31',
    status: 'ACTIVE',
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
  role: UserRole
  avatar?: string
}

export const mockEmployees: MockEmployee[] = [
  { id: 'emp-1', name: '王小明', email: 'wang@company.com', department: 'ART', role: 'EMPLOYEE' },
  { id: 'emp-2', name: '林小美', email: 'lin@company.com', department: 'ART', role: 'EMPLOYEE' },
  { id: 'emp-3', name: '張大華', email: 'zhang@company.com', department: 'ART', role: 'MANAGER' },
  { id: 'emp-4', name: '陳志明', email: 'chen@company.com', department: 'PROGRAMMING', role: 'EMPLOYEE' },
  { id: 'emp-5', name: '李小龍', email: 'li@company.com', department: 'PROGRAMMING', role: 'MANAGER' },
  { id: 'emp-6', name: '黃美玲', email: 'huang@company.com', department: 'PLANNING', role: 'PM' },
  { id: 'emp-7', name: '吳建國', email: 'wu@company.com', department: 'PLANNING', role: 'PRODUCER' },
  { id: 'emp-8', name: '劉小芳', email: 'liu@company.com', department: 'QA', role: 'EMPLOYEE' },
]

// 擴展的任務介面（包含新欄位）
export interface PoolTask extends Omit<Task, 'assignedToId'> {
  sourceType: 'ASSIGNED' | 'POOL' | 'SELF_CREATED'
  assignedToId?: string
  assignedTo?: { id: string; name: string; role?: string }
  createdBy: { id: string; name: string; role?: UserRole }
  department?: Department
  canEdit: boolean
  canDelete: boolean
  collaboratorNames?: string[]
  // Phase 1.1: 進度備註可見性
  latestNote?: string
  latestNoteAt?: string
  pauseReason?: string
  // Phase 2: 釋出節點與轉交
  releasePhase?: ReleasePhase
  releaseDate?: string
}

// Mock 任務池資料
export const mockPoolTasks: PoolTask[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    name: '設計主角立繪',
    description: '設計魔法王國主角的全身立繪，包含三套服裝',
    sourceType: 'POOL',
    plannedStartDate: '2026-02-01',
    plannedEndDate: '2026-02-15',
    progressPercentage: 0,
    status: 'NOT_STARTED',
    dependencies: [],
    collaborators: [],
    createdAt: '2026-01-28',
    updatedAt: '2026-01-28',
    project: { id: 'proj-1', name: '魔法王國 Online' },
    createdBy: { id: 'emp-6', name: '黃美玲', role: 'PM' },
    department: 'ART',
    canEdit: true,
    canDelete: true,
    releasePhase: 'ALPHA',
    releaseDate: '2026-03-15',
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    name: 'UI 介面設計',
    description: '設計遊戲主選單和背包介面',
    sourceType: 'POOL',
    plannedStartDate: '2026-02-05',
    plannedEndDate: '2026-02-20',
    progressPercentage: 0,
    status: 'NOT_STARTED',
    dependencies: [],
    collaborators: [],
    createdAt: '2026-01-29',
    updatedAt: '2026-01-29',
    project: { id: 'proj-1', name: '魔法王國 Online' },
    createdBy: { id: 'emp-7', name: '吳建國', role: 'PRODUCER' },
    department: 'ART',
    canEdit: true,
    canDelete: true,
  },
  {
    id: 'task-3',
    projectId: 'proj-2',
    name: '戰鬥系統開發',
    description: '開發太空戰鬥的核心邏輯',
    sourceType: 'POOL',
    assignedToId: 'emp-4',
    assignedTo: { id: 'emp-4', name: '陳志明' },
    plannedStartDate: '2026-02-01',
    plannedEndDate: '2026-03-15',
    progressPercentage: 25,
    status: 'IN_PROGRESS',
    dependencies: [],
    collaborators: ['emp-5'],
    collaboratorNames: ['李小龍'],
    createdAt: '2026-01-20',
    updatedAt: '2026-02-03',
    project: { id: 'proj-2', name: '星際戰艦' },
    createdBy: { id: 'emp-5', name: '李小龍', role: 'MANAGER' },
    department: 'PROGRAMMING',
    canEdit: true,
    canDelete: true,
    latestNote: '核心戰鬥邏輯框架完成，開始實作細節',
    latestNoteAt: '2026-02-03T16:45:00Z',
    releasePhase: 'BETA',
    releaseDate: '2026-04-01',
  },
  {
    id: 'task-4',
    projectId: 'proj-1',
    name: '音效製作 - 戰鬥場景',
    description: '製作戰鬥場景的背景音樂和音效',
    sourceType: 'ASSIGNED',
    assignedToId: 'emp-1',
    assignedTo: { id: 'emp-1', name: '王小明' },
    plannedStartDate: '2026-02-10',
    plannedEndDate: '2026-02-28',
    progressPercentage: 60,
    status: 'IN_PROGRESS',
    dependencies: [],
    collaborators: [],
    createdAt: '2026-02-01',
    updatedAt: '2026-02-04',
    project: { id: 'proj-1', name: '魔法王國 Online' },
    createdBy: { id: 'emp-3', name: '張大華', role: 'MANAGER' },
    department: 'ART',
    canEdit: false,
    canDelete: false,
    latestNote: '完成戰鬥場景的背景音樂初版，等待審核',
    latestNoteAt: '2026-02-04T14:30:00Z',
  },
  {
    id: 'task-5',
    projectId: 'proj-3',
    name: '賽車模型建模',
    description: '建立 10 款賽車的 3D 模型',
    sourceType: 'SELF_CREATED',
    assignedToId: 'emp-2',
    assignedTo: { id: 'emp-2', name: '林小美' },
    plannedStartDate: '2026-01-15',
    plannedEndDate: '2026-02-15',
    progressPercentage: 80,
    status: 'IN_PROGRESS',
    dependencies: [],
    collaborators: [],
    createdAt: '2026-01-15',
    updatedAt: '2026-02-03',
    project: { id: 'proj-3', name: '賽車狂飆' },
    createdBy: { id: 'emp-2', name: '林小美', role: 'EMPLOYEE' },
    department: 'ART',
    canEdit: true,
    canDelete: true,
    latestNote: '已完成 8 款賽車模型，剩餘 2 款進行中',
    latestNoteAt: '2026-02-03T17:30:00Z',
    releasePhase: 'RC',
    releaseDate: '2026-02-28',
  },
  {
    id: 'task-6',
    projectId: 'proj-1',
    name: '測試關卡一',
    description: '測試第一關卡的所有功能',
    sourceType: 'POOL',
    plannedStartDate: '2026-02-15',
    plannedEndDate: '2026-02-25',
    progressPercentage: 0,
    status: 'NOT_STARTED',
    dependencies: ['task-3'],
    collaborators: [],
    createdAt: '2026-02-01',
    updatedAt: '2026-02-01',
    project: { id: 'proj-1', name: '魔法王國 Online' },
    createdBy: { id: 'emp-6', name: '黃美玲', role: 'PM' },
    department: 'QA',
    canEdit: true,
    canDelete: true,
  },
  {
    id: 'task-7',
    projectId: 'proj-2',
    name: 'API 串接 - 登入系統',
    description: '與後端串接登入驗證 API',
    sourceType: 'ASSIGNED',
    assignedToId: 'emp-4',
    assignedTo: { id: 'emp-4', name: '陳志明' },
    plannedStartDate: '2026-01-20',
    plannedEndDate: '2026-02-01',
    progressPercentage: 40,
    status: 'ON_HOLD',
    dependencies: [],
    collaborators: [],
    createdAt: '2026-01-18',
    updatedAt: '2026-01-28',
    project: { id: 'proj-2', name: '星際戰艦' },
    createdBy: { id: 'emp-5', name: '李小龍', role: 'MANAGER' },
    department: 'PROGRAMMING',
    canEdit: false,
    canDelete: false,
    latestNote: '等待後端 API 完成',
    latestNoteAt: '2026-01-28T10:00:00Z',
    pauseReason: '等待 S 端 API 串接完成',
  },
  {
    id: 'task-8',
    projectId: 'proj-1',
    name: '角色動畫製作',
    description: '製作主角的待機、行走、攻擊動畫',
    sourceType: 'ASSIGNED',
    assignedToId: 'emp-2',
    assignedTo: { id: 'emp-2', name: '林小美' },
    plannedStartDate: '2026-01-10',
    plannedEndDate: '2026-01-31',
    progressPercentage: 70,
    status: 'IN_PROGRESS',
    dependencies: [],
    collaborators: ['emp-1'],
    collaboratorNames: ['王小明'],
    createdAt: '2026-01-08',
    updatedAt: '2026-02-02',
    project: { id: 'proj-1', name: '魔法王國 Online' },
    createdBy: { id: 'emp-3', name: '張大華', role: 'MANAGER' },
    department: 'ART',
    canEdit: false,
    canDelete: false,
    latestNote: '待機和行走動畫完成，攻擊動畫進行中',
    latestNoteAt: '2026-02-02T11:30:00Z',
    releasePhase: 'ALPHA',
    releaseDate: '2026-03-15',
  },
]

// Mock 進度歷程資料
export const mockProgressLogs: ProgressLog[] = [
  {
    id: 'log-1',
    taskId: 'task-4',
    employeeId: 'emp-1',
    progressPercentage: 60,
    notes: '完成戰鬥場景的背景音樂初版，等待審核',
    reportedAt: '2026-02-04T14:30:00Z',
    employee: { id: 'emp-1', name: '王小明' },
  },
  {
    id: 'log-2',
    taskId: 'task-4',
    employeeId: 'emp-1',
    progressPercentage: 40,
    notes: '音效素材收集完成，開始編曲',
    reportedAt: '2026-02-02T10:15:00Z',
    employee: { id: 'emp-1', name: '王小明' },
  },
  {
    id: 'log-3',
    taskId: 'task-4',
    employeeId: 'emp-1',
    progressPercentage: 20,
    notes: '開始收集音效素材',
    reportedAt: '2026-02-01T09:00:00Z',
    employee: { id: 'emp-1', name: '王小明' },
  },
  {
    id: 'log-4',
    taskId: 'task-3',
    employeeId: 'emp-4',
    progressPercentage: 25,
    notes: '核心戰鬥邏輯框架完成，開始實作細節',
    reportedAt: '2026-02-03T16:45:00Z',
    employee: { id: 'emp-4', name: '陳志明' },
  },
  {
    id: 'log-5',
    taskId: 'task-3',
    employeeId: 'emp-4',
    progressPercentage: 10,
    notes: '開始設計戰鬥系統架構',
    reportedAt: '2026-02-01T11:00:00Z',
    employee: { id: 'emp-4', name: '陳志明' },
  },
  {
    id: 'log-6',
    taskId: 'task-5',
    employeeId: 'emp-2',
    progressPercentage: 80,
    notes: '已完成 8 款賽車模型，剩餘 2 款進行中',
    reportedAt: '2026-02-03T17:30:00Z',
    employee: { id: 'emp-2', name: '林小美' },
  },
  {
    id: 'log-7',
    taskId: 'task-5',
    employeeId: 'emp-2',
    progressPercentage: 50,
    notes: '完成 5 款賽車模型',
    reportedAt: '2026-01-28T15:00:00Z',
    employee: { id: 'emp-2', name: '林小美' },
  },
  {
    id: 'log-8',
    taskId: 'task-5',
    employeeId: 'emp-2',
    progressPercentage: 20,
    notes: '完成 2 款賽車的基礎模型',
    reportedAt: '2026-01-20T14:00:00Z',
    employee: { id: 'emp-2', name: '林小美' },
  },
]

// 根據任務 ID 取得進度歷程
export function getProgressLogsByTaskId(taskId: string): ProgressLog[] {
  return mockProgressLogs
    .filter((log) => log.taskId === taskId)
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
}

// 根據任務 ID 取得任務詳情
export function getTaskById(taskId: string): PoolTask | undefined {
  return mockPoolTasks.find((task) => task.id === taskId)
}

// 取得可用於篩選的專案列表
export function getProjectsForFilter(): { id: string; name: string }[] {
  return mockProjects.map((p) => ({ id: p.id, name: p.name }))
}

// 取得可用於篩選的部門列表
export function getDepartmentsForFilter(): { id: Department; name: string }[] {
  return mockDepartments.map((d) => ({ id: d.id, name: d.name }))
}

// ===================================
// Phase 2: 轉交記錄與備註
// ===================================

// Mock 轉交記錄資料
export const mockTransferLogs: TransferLog[] = [
  {
    id: 'transfer-1',
    taskId: 'task-8',
    fromEmployeeId: 'emp-1',
    toEmployeeId: 'emp-2',
    reason: '原負責人工作量已滿',
    notes: '王小明已完成待機動畫的基礎框架，林小美接手繼續製作',
    transferredAt: '2026-01-20T14:00:00Z',
    fromEmployee: { id: 'emp-1', name: '王小明' },
    toEmployee: { id: 'emp-2', name: '林小美' },
  },
  {
    id: 'transfer-2',
    taskId: 'task-4',
    fromEmployeeId: 'emp-2',
    toEmployeeId: 'emp-1',
    reason: 'C 端完成轉 S 端',
    notes: '美術素材已完成，轉交給音效部門進行音效製作',
    transferredAt: '2026-02-01T09:00:00Z',
    fromEmployee: { id: 'emp-2', name: '林小美' },
    toEmployee: { id: 'emp-1', name: '王小明' },
  },
]

// Mock 任務備註資料
export const mockTaskNotes: TaskNote[] = [
  {
    id: 'note-1',
    taskId: 'task-3',
    employeeId: 'emp-5',
    content: '請注意戰鬥系統需要支援多人同時對戰',
    createdAt: '2026-02-01T10:00:00Z',
    employee: { id: 'emp-5', name: '李小龍' },
  },
  {
    id: 'note-2',
    taskId: 'task-3',
    employeeId: 'emp-4',
    content: '已確認，目前架構支援最多 8 人同時對戰',
    createdAt: '2026-02-02T15:30:00Z',
    employee: { id: 'emp-4', name: '陳志明' },
  },
  {
    id: 'note-3',
    taskId: 'task-8',
    employeeId: 'emp-3',
    content: '攻擊動畫需要配合技能系統，請先確認技能數量',
    createdAt: '2026-01-25T11:00:00Z',
    employee: { id: 'emp-3', name: '張大華' },
  },
  {
    id: 'note-4',
    taskId: 'task-5',
    employeeId: 'emp-7',
    content: '賽車模型需要考慮 LOD 層級，手機端要能流暢運行',
    createdAt: '2026-01-18T09:00:00Z',
    employee: { id: 'emp-7', name: '吳建國' },
  },
]

// 根據任務 ID 取得轉交記錄
export function getTransferLogsByTaskId(taskId: string): TransferLog[] {
  return mockTransferLogs
    .filter((log) => log.taskId === taskId)
    .sort((a, b) => new Date(b.transferredAt).getTime() - new Date(a.transferredAt).getTime())
}

// 根據任務 ID 取得備註
export function getTaskNotesByTaskId(taskId: string): TaskNote[] {
  return mockTaskNotes
    .filter((note) => note.taskId === taskId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
