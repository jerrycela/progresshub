import type { User, Project, Task, ProgressLog, DashboardStats, FunctionWorkload } from 'shared/types'

// ============================================
// Mock 使用者資料
// ============================================
export const mockUsers: User[] = [
  {
    id: '1',
    name: '王小明',
    email: 'xiaoming@company.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming',
    role: 'MEMBER',
    functionType: 'PROGRAMMING',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: '李美玲',
    email: 'meiling@company.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=meiling',
    role: 'MEMBER',
    functionType: 'ART',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: '張大偉',
    email: 'dawei@company.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dawei',
    role: 'PM',
    functionType: 'PLANNING',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    name: '陳志豪',
    email: 'zhihao@company.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhihao',
    role: 'MEMBER',
    functionType: 'ANIMATION',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '5',
    name: '林雅婷',
    email: 'yating@company.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yating',
    role: 'ADMIN',
    functionType: 'PLANNING',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

// ============================================
// Mock 專案資料
// ============================================
export const mockProjects: Project[] = [
  {
    id: '1',
    name: '新手教學系統',
    description: '開發新手引導與教學關卡',
    status: 'ACTIVE',
    startDate: '2024-02-01',
    endDate: '2024-04-30',
    createdById: '3',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'PVP 對戰系統',
    description: '玩家對戰系統開發',
    status: 'ACTIVE',
    startDate: '2024-01-15',
    endDate: '2024-05-15',
    createdById: '3',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '3',
    name: 'UI 改版計畫',
    description: '全面更新遊戲 UI 設計',
    status: 'ACTIVE',
    startDate: '2024-02-15',
    endDate: '2024-03-31',
    createdById: '3',
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2024-02-15T00:00:00Z',
  },
]

// ============================================
// Mock 任務資料
// ============================================
export const mockTasks: Task[] = [
  {
    id: '1',
    title: '實作新手教學流程邏輯',
    description: '根據企劃文件實作新手教學的程式邏輯',
    status: 'IN_PROGRESS',
    progress: 65,
    projectId: '1',
    assigneeId: '1',
    functionTags: ['PROGRAMMING'],
    startDate: '2024-02-05',
    dueDate: '2024-02-20',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-10T00:00:00Z',
  },
  {
    id: '2',
    title: '新手教學 UI 設計',
    description: '設計新手教學介面與圖示',
    status: 'CLAIMED',
    progress: 30,
    projectId: '1',
    assigneeId: '2',
    functionTags: ['ART'],
    startDate: '2024-02-10',
    dueDate: '2024-02-25',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-10T00:00:00Z',
  },
  {
    id: '3',
    title: 'PVP 匹配系統開發',
    description: '開發玩家配對演算法與後端 API',
    status: 'UNCLAIMED',
    progress: 0,
    projectId: '2',
    functionTags: ['PROGRAMMING'],
    startDate: '2024-02-15',
    dueDate: '2024-03-15',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: '4',
    title: 'PVP 戰鬥特效製作',
    description: '製作 PVP 模式專屬技能特效',
    status: 'UNCLAIMED',
    progress: 0,
    projectId: '2',
    functionTags: ['VFX', 'ART'],
    startDate: '2024-02-20',
    dueDate: '2024-03-20',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: '5',
    title: '主選單 UI 重新設計',
    description: '重新設計主選單介面',
    status: 'DONE',
    progress: 100,
    projectId: '3',
    assigneeId: '2',
    functionTags: ['ART'],
    startDate: '2024-02-15',
    dueDate: '2024-02-28',
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2024-02-25T00:00:00Z',
  },
  {
    id: '6',
    title: '角色動畫優化',
    description: '優化角色移動與攻擊動畫',
    status: 'IN_PROGRESS',
    progress: 45,
    projectId: '3',
    assigneeId: '4',
    functionTags: ['ANIMATION'],
    startDate: '2024-02-20',
    dueDate: '2024-03-10',
    createdAt: '2024-02-20T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
  {
    id: '7',
    title: '背景音樂製作',
    description: '製作 PVP 戰鬥場景背景音樂',
    status: 'UNCLAIMED',
    progress: 0,
    projectId: '2',
    functionTags: ['SOUND'],
    startDate: '2024-03-01',
    dueDate: '2024-03-25',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: '8',
    title: '新手教學企劃文件',
    description: '撰寫新手教學流程與文案',
    status: 'DONE',
    progress: 100,
    projectId: '1',
    assigneeId: '3',
    functionTags: ['PLANNING'],
    startDate: '2024-02-01',
    dueDate: '2024-02-10',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-08T00:00:00Z',
  },
]

// ============================================
// Mock 進度回報記錄
// ============================================
export const mockProgressLogs: ProgressLog[] = [
  {
    id: '1',
    taskId: '1',
    userId: '1',
    reportType: 'PROGRESS',
    progress: 65,
    progressDelta: 15,
    notes: '完成新手教學前三關的程式邏輯',
    reportedAt: '2024-02-10T17:30:00Z',
  },
  {
    id: '2',
    taskId: '2',
    userId: '2',
    reportType: 'PROGRESS',
    progress: 30,
    progressDelta: 10,
    notes: '完成主要 UI 元件設計稿',
    reportedAt: '2024-02-10T16:00:00Z',
  },
  {
    id: '3',
    taskId: '6',
    userId: '4',
    reportType: 'CONTINUE',
    progress: 45,
    progressDelta: 0,
    notes: '繼續處理攻擊動畫',
    reportedAt: '2024-03-01T18:00:00Z',
  },
  {
    id: '4',
    taskId: '1',
    userId: '1',
    reportType: 'CONTINUE',
    progress: 65,
    progressDelta: 0,
    notes: '繼續進行中',
    reportedAt: '2024-02-11T17:00:00Z',
  },
]

// ============================================
// 回報類型名稱對照
// ============================================
export const reportTypeLabels: Record<string, string> = {
  PROGRESS: '進度更新',
  CONTINUE: '繼續進行',
  BLOCKED: '卡關',
  COMPLETE: '已完成',
}

// ============================================
// 回報週期名稱對照
// ============================================
export const reportCycleLabels: Record<string, string> = {
  DAILY: '每日回報',
  WEEKLY: '每週回報',
  CUSTOM: '自訂週期',
}

// ============================================
// Mock Dashboard 統計
// ============================================
export const mockDashboardStats: DashboardStats = {
  totalTasks: 8,
  completedTasks: 2,
  inProgressTasks: 3,
  unclaimedTasks: 3,
  overdueTasksCount: 0,
}

// ============================================
// Mock 職能負載統計
// ============================================
export const mockFunctionWorkloads: FunctionWorkload[] = [
  {
    functionType: 'PROGRAMMING',
    totalTasks: 2,
    unclaimedTasks: 1,
    inProgressTasks: 1,
    memberCount: 1,
  },
  {
    functionType: 'ART',
    totalTasks: 3,
    unclaimedTasks: 1,
    inProgressTasks: 1,
    memberCount: 1,
  },
  {
    functionType: 'ANIMATION',
    totalTasks: 1,
    unclaimedTasks: 0,
    inProgressTasks: 1,
    memberCount: 1,
  },
  {
    functionType: 'VFX',
    totalTasks: 1,
    unclaimedTasks: 1,
    inProgressTasks: 0,
    memberCount: 0,
  },
  {
    functionType: 'SOUND',
    totalTasks: 1,
    unclaimedTasks: 1,
    inProgressTasks: 0,
    memberCount: 0,
  },
  {
    functionType: 'PLANNING',
    totalTasks: 1,
    unclaimedTasks: 0,
    inProgressTasks: 0,
    memberCount: 2,
  },
]

// ============================================
// 當前登入使用者 (Mock)
// ============================================
export const mockCurrentUser: User = mockUsers[0] // 預設為王小明

// ============================================
// 職能名稱對照
// ============================================
export const functionTypeLabels: Record<string, string> = {
  PLANNING: '企劃',
  PROGRAMMING: '程式',
  ART: '美術',
  ANIMATION: '動態',
  SOUND: '音效',
  VFX: '特效',
  COMBAT: '戰鬥',
}

// ============================================
// 任務狀態名稱對照
// ============================================
export const taskStatusLabels: Record<string, string> = {
  UNCLAIMED: '待認領',
  CLAIMED: '已認領',
  IN_PROGRESS: '進行中',
  PAUSED: '暫停中',
  DONE: '已完成',
  BLOCKED: '阻塞',
}

// ============================================
// 角色名稱對照
// ============================================
export const roleLabels: Record<string, string> = {
  MEMBER: '成員',
  PM: '專案經理',
  ADMIN: '管理員',
}
