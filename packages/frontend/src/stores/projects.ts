import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, ActionResult } from 'shared/types'
import { createProjectService } from '@/services/projectService'
import { mockProjects } from '@/mocks/unified'

const service = createProjectService()
const isMock = import.meta.env.VITE_USE_MOCK === 'true'

export const useProjectStore = defineStore('projects', () => {
  const projects = ref<Project[]>(isMock ? [...mockProjects] : [])

  const activeProjects = computed(() => projects.value.filter(p => p.status === 'ACTIVE'))

  const projectOptions = computed(() => projects.value.map(p => ({ value: p.id, label: p.name })))

  const getProjectById = (id: string) => projects.value.find(p => p.id === id)

  const getProjectName = (id: string) => getProjectById(id)?.name ?? ''

  const fetchProjects = async (): Promise<ActionResult<Project[]>> => {
    try {
      const data = await service.fetchProjects()
      projects.value = data
      return { success: true, data: projects.value }
    } catch (e) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '載入專案失敗' },
      }
    }
  }

  return {
    projects,
    activeProjects,
    projectOptions,
    getProjectById,
    getProjectName,
    fetchProjects,
  }
})
