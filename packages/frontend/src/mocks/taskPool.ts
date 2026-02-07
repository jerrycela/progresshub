// ============================================
// 任務池 Mock 資料 - Re-export wrapper
// 實際資料已移至 unified.ts
// 類型已移至 shared/types
// ============================================
export {
  mockProjects,
  mockDepartments,
  mockEmployees,
  mockPoolTasks,
  mockProgressLogs,
  mockTaskNotes,
  mockMilestones,
  getNotesByTaskId,
  getMilestonesByProjectId,
  getAllMilestones,
  getProgressLogsByTaskId,
  getTaskById,
  getProjectsForFilter,
  getDepartmentsForFilter,
} from './unified'

// 類型 re-export（已移至 shared/types）
export type {
  PoolTask,
  GitLabIssue,
  TaskNote,
  MilestoneData,
  MockEmployee,
} from 'shared/types'
