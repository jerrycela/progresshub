import type { DashboardStats, FunctionWorkload, FunctionType } from 'shared/types'
import { mockEmployees, departmentToFunctionType } from './employees'
import { mockPoolTasks } from './tasks'

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
