// ============================================
// useProject - 專案查詢 Composable
// 委派到 useProjectStore
// ============================================

import { useProjectStore } from '@/stores/projects'
import type { Project } from 'shared/types'

export function useProject() {
  const projectStore = useProjectStore()

  const getProjectById = (projectId: string): Project | undefined => {
    return projectStore.getProjectById(projectId)
  }

  const getProjectName = (projectId: string): string => {
    return projectStore.getProjectName(projectId) || '未知專案'
  }

  const getProjectOptions = (includeAll = true) => {
    const options = projectStore.projects.map(p => ({
      value: p.id,
      label: p.name,
    }))

    if (includeAll) {
      return [{ value: 'ALL', label: '全部專案' }, ...options]
    }

    return options
  }

  const getActiveProjects = (): Project[] => {
    return projectStore.activeProjects
  }

  return {
    getProjectById,
    getProjectName,
    getProjectOptions,
    getActiveProjects,
  }
}
