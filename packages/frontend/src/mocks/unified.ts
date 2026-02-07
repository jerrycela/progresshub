import type {
  User,
  Project,
  Task,
  ProgressLog,
  DashboardStats,
  FunctionWorkload,
  Department,
  FunctionType,
  PoolTask,
  TaskNote,
  MilestoneData,
  MockEmployee,
} from 'shared/types'

// ============================================
// 統一 Mock 資料
// 合併 data.ts 與 taskPool.ts，使用一致的 ID 格式
// emp-* / proj-* / task-*
// ============================================

// ============================================
// 員工資料（主要人員列表）
// emp-1~8 來自 taskPool，emp-9~12 來自 data.ts 獨有人員
// ============================================
export const mockEmployees: MockEmployee[] = [
  {
    id: 'emp-1',
    name: '王小明',
    email: 'wang@company.com',
    department: 'ART',
    userRole: 'EMPLOYEE',
  },
  {
    id: 'emp-2',
    name: '林小美',
    email: 'lin@company.com',
    department: 'ART',
    userRole: 'EMPLOYEE',
  },
  {
    id: 'emp-3',
    name: '張大華',
    email: 'zhang@company.com',
    department: 'ART',
    userRole: 'MANAGER',
  },
  {
    id: 'emp-4',
    name: '陳志明',
    email: 'chen@company.com',
    department: 'PROGRAMMING',
    userRole: 'EMPLOYEE',
  },
  {
    id: 'emp-5',
    name: '李小龍',
    email: 'li@company.com',
    department: 'PROGRAMMING',
    userRole: 'MANAGER',
  },
  {
    id: 'emp-6',
    name: '黃美玲',
    email: 'huang@company.com',
    department: 'PLANNING',
    userRole: 'PM',
  },
  {
    id: 'emp-7',
    name: '吳建國',
    email: 'wu@company.com',
    department: 'PLANNING',
    userRole: 'PRODUCER',
  },
  { id: 'emp-8', name: '劉小芳', email: 'liu@company.com', department: 'QA', userRole: 'EMPLOYEE' },
  {
    id: 'emp-9',
    name: '李美玲',
    email: 'meiling@company.com',
    department: 'ART',
    userRole: 'EMPLOYEE',
  },
  {
    id: 'emp-10',
    name: '張大偉',
    email: 'dawei@company.com',
    department: 'PLANNING',
    userRole: 'PM',
  },
  {
    id: 'emp-11',
    name: '陳志豪',
    email: 'zhihao@company.com',
    department: 'ART',
    userRole: 'EMPLOYEE',
  },
  {
    id: 'emp-12',
    name: '林雅婷',
    email: 'yating@company.com',
    department: 'MANAGEMENT',
    userRole: 'MANAGER',
  },
]

// ============================================
// 部門 → Role 對照
// ============================================
const userRoleToRole = (userRole: string): 'MEMBER' | 'PM' | 'ADMIN' => {
  const map: Record<string, 'MEMBER' | 'PM' | 'ADMIN'> = {
    EMPLOYEE: 'MEMBER',
    PM: 'PM',
    PRODUCER: 'MEMBER',
    MANAGER: 'ADMIN',
  }
  return map[userRole] || 'MEMBER'
}

const departmentToFunctionType = (dept: Department): FunctionType => {
  const map: Record<Department, FunctionType> = {
    ART: 'ART',
    PROGRAMMING: 'PROGRAMMING',
    PLANNING: 'PLANNING',
    QA: 'PLANNING',
    SOUND: 'SOUND',
    MANAGEMENT: 'PLANNING',
  }
  return map[dept]
}

// 特殊覆蓋：某些員工的 functionType 不同於部門預設
const functionTypeOverrides: Record<string, FunctionType> = {
  'emp-1': 'PROGRAMMING', // 王小明原為 PROGRAMMING
  'emp-11': 'ANIMATION', // 陳志豪原為 ANIMATION
}

// ============================================
// 使用者資料（從員工衍生，符合 User 介面）
// ============================================
export const mockUsers: User[] = mockEmployees.map(emp => ({
  id: emp.id,
  name: emp.name,
  email: emp.email,
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`,
  role: userRoleToRole(emp.userRole),
  functionType: functionTypeOverrides[emp.id] || departmentToFunctionType(emp.department),
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}))

// 當前登入使用者
export const mockCurrentUser: User = mockUsers[0]

// ============================================
// 部門資料
// ============================================
export const mockDepartments: { id: Department; name: string; memberCount: number }[] = [
  { id: 'ART', name: '美術部', memberCount: 12 },
  { id: 'PROGRAMMING', name: '程式部', memberCount: 8 },
  { id: 'PLANNING', name: '企劃部', memberCount: 5 },
  { id: 'QA', name: '品管部', memberCount: 4 },
  { id: 'SOUND', name: '音效部', memberCount: 3 },
  { id: 'MANAGEMENT', name: '管理部', memberCount: 2 },
]

// ============================================
// 專案資料（6 個專案，統一 proj-* ID）
// proj-1~3 來自 taskPool，proj-4~6 來自 data.ts
// ============================================
export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: '魔法王國 Online',
    description: '大型多人線上角色扮演遊戲',
    status: 'ACTIVE',
    startDate: '2025-01-01',
    endDate: '2026-06-30',
    createdById: 'emp-6',
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
    createdById: 'emp-6',
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
    createdById: 'emp-6',
    createdAt: '2025-03-01',
    updatedAt: '2026-01-15',
  },
  {
    id: 'proj-4',
    name: '新手教學系統',
    description: '開發新手引導與教學關卡',
    status: 'ACTIVE',
    startDate: '2026-02-01',
    endDate: '2026-04-30',
    createdById: 'emp-10',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'proj-5',
    name: 'PVP 對戰系統',
    description: '玩家對戰系統開發',
    status: 'ACTIVE',
    startDate: '2026-01-15',
    endDate: '2026-05-15',
    createdById: 'emp-10',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'proj-6',
    name: 'UI 改版計畫',
    description: '全面更新遊戲 UI 設計',
    status: 'ACTIVE',
    startDate: '2026-02-15',
    endDate: '2026-03-31',
    createdById: 'emp-10',
    createdAt: '2026-02-15T00:00:00Z',
    updatedAt: '2026-02-15T00:00:00Z',
  },
]

// 專案快速查找
const projectMap = new Map(mockProjects.map(p => [p.id, p]))
const getProjectRef = (id: string) => {
  const p = projectMap.get(id)
  if (!p) return undefined
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    startDate: p.startDate,
    createdById: p.createdById,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

// 員工 → User 快速查找
const userMap = new Map(mockUsers.map(u => [u.id, u]))
const getUserRef = (id: string) => userMap.get(id)

// ============================================
// 任務池任務（15 個任務，統一 task-* ID）
// task-1~6 來自 taskPool，task-7~15 來自 data.ts
// ============================================
export const mockPoolTasks: PoolTask[] = [
  // === taskPool 原有任務 ===
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
    project: getProjectRef('proj-1'),
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
    project: getProjectRef('proj-1'),
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
    assignee: getUserRef('emp-4'),
    startDate: '2026-02-01',
    dueDate: '2026-03-15',
    createdAt: '2026-01-20',
    updatedAt: '2026-02-03',
    project: getProjectRef('proj-2'),
    createdBy: { id: 'emp-5', name: '李小龍', userRole: 'MANAGER' },
    department: 'PROGRAMMING',
    canEdit: true,
    canDelete: true,
    collaboratorNames: ['李小龍'],
    gitlabIssue: {
      id: 123,
      title: '實作戰鬥系統核心邏輯',
      url: 'https://gitlab.com/star-battleship/game/issues/123',
      state: 'opened',
    },
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
    assignee: getUserRef('emp-1'),
    startDate: '2026-02-10',
    dueDate: '2026-02-28',
    createdAt: '2026-02-01',
    updatedAt: '2026-02-04',
    project: getProjectRef('proj-1'),
    createdBy: { id: 'emp-3', name: '張大華', userRole: 'MANAGER' },
    department: 'ART',
    canEdit: false,
    canDelete: false,
    gitlabIssue: {
      id: 456,
      title: '戰鬥場景音效與背景音樂',
      url: 'https://gitlab.com/magic-kingdom/game/issues/456',
      state: 'opened',
    },
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
    assignee: getUserRef('emp-2'),
    startDate: '2026-01-15',
    dueDate: '2026-02-15',
    createdAt: '2026-01-15',
    updatedAt: '2026-02-03',
    project: getProjectRef('proj-3'),
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
    project: getProjectRef('proj-1'),
    createdBy: { id: 'emp-6', name: '黃美玲', userRole: 'PM' },
    department: 'QA',
    canEdit: true,
    canDelete: true,
  },
  // === data.ts 轉換的任務（ID 映射：'1'→task-7 ... '9'→task-15）===
  {
    id: 'task-7',
    projectId: 'proj-4',
    title: '實作新手教學流程邏輯',
    description: '根據企劃文件實作新手教學的程式邏輯',
    sourceType: 'ASSIGNED',
    status: 'IN_PROGRESS',
    progress: 65,
    functionTags: ['PROGRAMMING'],
    assigneeId: 'emp-1',
    assignee: getUserRef('emp-1'),
    startDate: '2026-02-05',
    dueDate: '2026-02-20',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
    project: getProjectRef('proj-4'),
    createdBy: { id: 'emp-10', name: '張大偉', userRole: 'PM' },
    department: 'PROGRAMMING',
    canEdit: true,
    canDelete: true,
  },
  {
    id: 'task-8',
    projectId: 'proj-4',
    title: '新手教學 UI 設計',
    description: '設計新手教學介面與圖示',
    sourceType: 'ASSIGNED',
    status: 'CLAIMED',
    progress: 30,
    functionTags: ['ART'],
    assigneeId: 'emp-9',
    assignee: getUserRef('emp-9'),
    startDate: '2026-02-10',
    dueDate: '2026-02-25',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
    project: getProjectRef('proj-4'),
    createdBy: { id: 'emp-10', name: '張大偉', userRole: 'PM' },
    department: 'ART',
    canEdit: true,
    canDelete: true,
  },
  {
    id: 'task-9',
    projectId: 'proj-5',
    title: 'PVP 匹配系統開發',
    description: '開發玩家配對演算法與後端 API',
    sourceType: 'POOL',
    status: 'UNCLAIMED',
    progress: 0,
    functionTags: ['PROGRAMMING'],
    startDate: '2026-02-15',
    dueDate: '2026-03-15',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
    project: getProjectRef('proj-5'),
    createdBy: { id: 'emp-10', name: '張大偉', userRole: 'PM' },
    department: 'PROGRAMMING',
    canEdit: true,
    canDelete: true,
  },
  {
    id: 'task-10',
    projectId: 'proj-5',
    title: 'PVP 戰鬥特效製作',
    description: '製作 PVP 模式專屬技能特效',
    sourceType: 'POOL',
    status: 'UNCLAIMED',
    progress: 0,
    functionTags: ['VFX', 'ART'],
    startDate: '2026-02-20',
    dueDate: '2026-03-20',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
    project: getProjectRef('proj-5'),
    createdBy: { id: 'emp-10', name: '張大偉', userRole: 'PM' },
    department: 'ART',
    canEdit: true,
    canDelete: true,
  },
  {
    id: 'task-11',
    projectId: 'proj-6',
    title: '主選單 UI 重新設計',
    description: '重新設計主選單介面',
    sourceType: 'ASSIGNED',
    status: 'DONE',
    progress: 100,
    functionTags: ['ART'],
    assigneeId: 'emp-9',
    assignee: getUserRef('emp-9'),
    startDate: '2026-02-15',
    dueDate: '2026-02-28',
    createdAt: '2026-02-15T00:00:00Z',
    updatedAt: '2026-02-25T00:00:00Z',
    project: getProjectRef('proj-6'),
    createdBy: { id: 'emp-10', name: '張大偉', userRole: 'PM' },
    department: 'ART',
    canEdit: true,
    canDelete: true,
  },
  {
    id: 'task-12',
    projectId: 'proj-6',
    title: '角色動畫優化',
    description: '優化角色移動與攻擊動畫',
    sourceType: 'ASSIGNED',
    status: 'IN_PROGRESS',
    progress: 45,
    functionTags: ['ANIMATION'],
    assigneeId: 'emp-11',
    assignee: getUserRef('emp-11'),
    startDate: '2026-02-20',
    dueDate: '2026-03-10',
    createdAt: '2026-02-20T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    project: getProjectRef('proj-6'),
    createdBy: { id: 'emp-10', name: '張大偉', userRole: 'PM' },
    department: 'ART',
    canEdit: true,
    canDelete: true,
  },
  {
    id: 'task-13',
    projectId: 'proj-5',
    title: '背景音樂製作',
    description: '製作 PVP 戰鬥場景背景音樂',
    sourceType: 'POOL',
    status: 'UNCLAIMED',
    progress: 0,
    functionTags: ['SOUND'],
    startDate: '2026-03-01',
    dueDate: '2026-03-25',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
    project: getProjectRef('proj-5'),
    createdBy: { id: 'emp-10', name: '張大偉', userRole: 'PM' },
    department: 'SOUND',
    canEdit: true,
    canDelete: true,
  },
  {
    id: 'task-14',
    projectId: 'proj-4',
    title: '新手教學企劃文件',
    description: '撰寫新手教學流程與文案',
    sourceType: 'ASSIGNED',
    status: 'DONE',
    progress: 100,
    functionTags: ['PLANNING'],
    assigneeId: 'emp-10',
    assignee: getUserRef('emp-10'),
    startDate: '2026-02-01',
    dueDate: '2026-02-10',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-08T00:00:00Z',
    project: getProjectRef('proj-4'),
    createdBy: { id: 'emp-10', name: '張大偉', userRole: 'PM' },
    department: 'PLANNING',
    canEdit: true,
    canDelete: true,
  },
  {
    id: 'task-15',
    projectId: 'proj-4',
    title: 'API 串接 - 用戶系統',
    description: '串接後端用戶登入與註冊 API',
    sourceType: 'ASSIGNED',
    status: 'PAUSED',
    progress: 40,
    functionTags: ['PROGRAMMING'],
    assigneeId: 'emp-1',
    assignee: getUserRef('emp-1'),
    startDate: '2026-02-15',
    dueDate: '2026-03-05',
    pauseReason: 'WAITING_TASK',
    pauseNote: '等待後端 API 完成，預計下週可繼續',
    pausedAt: '2026-02-28T10:00:00Z',
    createdAt: '2026-02-15T00:00:00Z',
    updatedAt: '2026-02-28T10:00:00Z',
    project: getProjectRef('proj-4'),
    createdBy: { id: 'emp-10', name: '張大偉', userRole: 'PM' },
    department: 'PROGRAMMING',
    canEdit: true,
    canDelete: true,
  },
]

// ============================================
// 純 Task 檢視（供 stores/tasks.ts 使用）
// ============================================
export const mockTasks: Task[] = mockPoolTasks.map(
  ({
    sourceType: _s,
    createdBy: _cb,
    department: _d,
    canEdit: _ce,
    canDelete: _cd,
    collaboratorNames: _cn,
    gitlabIssue: _gi,
    ...task
  }) => task as Task,
)

// ============================================
// 進度回報記錄（合併兩套資料）
// ============================================
export const mockProgressLogs: ProgressLog[] = [
  // taskPool 原有
  {
    id: 'log-1',
    taskId: 'task-4',
    userId: 'emp-1',
    reportType: 'PROGRESS',
    progress: 60,
    progressDelta: 20,
    notes: '完成戰鬥場景的背景音樂初版，等待審核',
    reportedAt: '2026-02-04T14:30:00Z',
    user: getUserRef('emp-1'),
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
    user: getUserRef('emp-1'),
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
    user: getUserRef('emp-1'),
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
    user: getUserRef('emp-4'),
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
    user: getUserRef('emp-4'),
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
    user: getUserRef('emp-2'),
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
    user: getUserRef('emp-2'),
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
    user: getUserRef('emp-2'),
  },
  // data.ts 轉換的記錄
  {
    id: 'log-9',
    taskId: 'task-7',
    userId: 'emp-1',
    reportType: 'PROGRESS',
    progress: 65,
    progressDelta: 15,
    notes: '完成新手教學前三關的程式邏輯',
    reportedAt: '2026-02-10T17:30:00Z',
  },
  {
    id: 'log-10',
    taskId: 'task-8',
    userId: 'emp-9',
    reportType: 'PROGRESS',
    progress: 30,
    progressDelta: 10,
    notes: '完成主要 UI 元件設計稿',
    reportedAt: '2026-02-10T16:00:00Z',
  },
  {
    id: 'log-11',
    taskId: 'task-12',
    userId: 'emp-11',
    reportType: 'CONTINUE',
    progress: 45,
    progressDelta: 0,
    notes: '繼續處理攻擊動畫',
    reportedAt: '2026-03-01T18:00:00Z',
  },
  {
    id: 'log-12',
    taskId: 'task-7',
    userId: 'emp-1',
    reportType: 'CONTINUE',
    progress: 65,
    progressDelta: 0,
    notes: '繼續進行中',
    reportedAt: '2026-02-11T17:00:00Z',
  },
]

// ============================================
// 任務註記
// ============================================
export const mockTaskNotes: TaskNote[] = [
  {
    id: 'note-1',
    taskId: 'task-3',
    content: '請注意這個功能需要和後端 API 同步，建議先確認 API 規格',
    authorId: 'emp-5',
    authorName: '李小龍',
    authorRole: 'MANAGER',
    createdAt: '2026-02-03T10:00:00Z',
  },
  {
    id: 'note-2',
    taskId: 'task-3',
    content: '已與後端確認 API 規格，可以開始實作',
    authorId: 'emp-6',
    authorName: '黃美玲',
    authorRole: 'PM',
    createdAt: '2026-02-03T14:30:00Z',
  },
  {
    id: 'note-3',
    taskId: 'task-4',
    content: '音效風格請參考魔法王國世界觀設定文件',
    authorId: 'emp-7',
    authorName: '吳建國',
    authorRole: 'PRODUCER',
    createdAt: '2026-02-01T09:00:00Z',
  },
]

// ============================================
// 里程碑資料
// ============================================
export const mockMilestones: MilestoneData[] = [
  {
    id: 'ms-1',
    projectId: 'proj-1',
    name: 'Alpha 測試',
    description: '內部功能測試版本',
    date: '2026-02-15',
    color: '#F59E0B',
    createdById: 'emp-7',
    createdByName: '吳建國',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'ms-2',
    projectId: 'proj-1',
    name: 'Beta 測試',
    description: '外部測試版本',
    date: '2026-03-01',
    color: '#3B82F6',
    createdById: 'emp-7',
    createdByName: '吳建國',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'ms-3',
    projectId: 'proj-1',
    name: '正式上線',
    description: '遊戲正式發布',
    date: '2026-03-15',
    color: '#10B981',
    createdById: 'emp-3',
    createdByName: '張大華',
    createdAt: '2026-01-20T14:00:00Z',
  },
  {
    id: 'ms-4',
    projectId: 'proj-2',
    name: '戰鬥系統完成',
    description: '核心戰鬥機制開發完成',
    date: '2026-02-20',
    color: '#EF4444',
    createdById: 'emp-5',
    createdByName: '李小龍',
    createdAt: '2026-01-25T09:00:00Z',
  },
]

// ============================================
// Dashboard 統計（反映合併後的資料）
// ============================================
export const mockDashboardStats: DashboardStats = {
  totalTasks: mockPoolTasks.length,
  completedTasks: mockPoolTasks.filter(t => t.status === 'DONE').length,
  inProgressTasks: mockPoolTasks.filter(t => ['IN_PROGRESS', 'CLAIMED'].includes(t.status)).length,
  unclaimedTasks: mockPoolTasks.filter(t => t.status === 'UNCLAIMED').length,
  overdueTasksCount: mockPoolTasks.filter(t => {
    if (!t.dueDate || t.status === 'DONE') return false
    return new Date(t.dueDate) < new Date()
  }).length,
}

// ============================================
// 職能負載統計（反映合併後的資料）
// ============================================
export const mockFunctionWorkloads: FunctionWorkload[] = (() => {
  const functionTypes: FunctionType[] = [
    'PROGRAMMING',
    'ART',
    'ANIMATION',
    'VFX',
    'SOUND',
    'PLANNING',
    'COMBAT',
  ]
  return functionTypes
    .map(ft => {
      const tasks = mockPoolTasks.filter(t => t.functionTags.includes(ft))
      const members = mockEmployees.filter(e => departmentToFunctionType(e.department) === ft)
      return {
        functionType: ft,
        totalTasks: tasks.length,
        unclaimedTasks: tasks.filter(t => t.status === 'UNCLAIMED').length,
        inProgressTasks: tasks.filter(t => ['IN_PROGRESS', 'CLAIMED'].includes(t.status)).length,
        memberCount: members.length,
      }
    })
    .filter(w => w.totalTasks > 0 || w.memberCount > 0)
})()

// ============================================
// 查詢函數
// ============================================

export function getNotesByTaskId(taskId: string): TaskNote[] {
  return mockTaskNotes
    .filter(note => note.taskId === taskId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getMilestonesByProjectId(projectId: string): MilestoneData[] {
  return mockMilestones
    .filter(ms => ms.projectId === projectId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function getAllMilestones(): MilestoneData[] {
  return [...mockMilestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function getProgressLogsByTaskId(taskId: string): ProgressLog[] {
  return mockProgressLogs
    .filter(log => log.taskId === taskId)
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
}

export function getTaskById(taskId: string): PoolTask | undefined {
  return mockPoolTasks.find(task => task.id === taskId)
}

export function getProjectsForFilter(): { id: string; name: string }[] {
  return mockProjects.map(p => ({ id: p.id, name: p.name }))
}

export function getDepartmentsForFilter(): { id: Department; name: string }[] {
  return mockDepartments.map(d => ({ id: d.id, name: d.name }))
}
