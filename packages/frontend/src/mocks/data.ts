// ============================================
// Mock 資料 - Re-export wrapper
// 實際資料已移至 unified.ts
// ============================================
export {
  mockUsers,
  mockCurrentUser,
  mockProjects,
  mockTasks,
  mockProgressLogs,
  mockDashboardStats,
  mockFunctionWorkloads,
} from './unified'

// 標籤名稱對照（從 constants/labels.ts re-export）
export {
  functionTypeLabels,
  taskStatusLabels,
  roleLabels,
  reportTypeLabels,
  reportCycleLabels,
} from '@/constants/labels'
