import type { TaskNote, MilestoneData, ProgressLog, PoolTask, Department } from 'shared/types'
import { mockTaskNotes } from './tasks'
import { mockMilestones } from './milestones'
import { mockProgressLogs } from './progressLogs'
import { mockPoolTasks } from './tasks'
import { mockProjects } from './projects'
import { mockDepartments } from './departments'

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
