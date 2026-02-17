import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, ActionResult } from 'shared/types'
import { createProjectService, type CreateProjectInput } from '@/services/projectService'
import { mockProjects } from '@/mocks/unified'

const isMock = import.meta.env.VITE_USE_MOCK === 'true'
const service = createProjectService()

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

  const createProject = async (input: CreateProjectInput): Promise<ActionResult<Project>> => {
    try {
      const result = await service.createProject(input)

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || { code: 'UNKNOWN_ERROR', message: '建立專案失敗' },
        }
      }

      projects.value = [...projects.value, result.data]
      return { success: true, data: result.data }
    } catch (e) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '建立專案失敗' },
      }
    }
  }

  const updateProject = async (
    id: string,
    input: Partial<Project>,
  ): Promise<ActionResult<Project>> => {
    const idx = projects.value.findIndex(p => p.id === id)
    if (idx === -1) {
      return {
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: '找不到指定的專案' },
      }
    }

    // 樂觀更新
    const snapshot = projects.value
    const now = new Date().toISOString()
    const optimistic = { ...projects.value[idx], ...input, updatedAt: now }
    projects.value = projects.value.map((p, i) => (i === idx ? optimistic : p))

    try {
      const result = await service.updateProject(id, input)

      if (result.success && result.data) {
        projects.value = projects.value.map(p => (p.id === id ? { ...p, ...result.data } : p))
      }

      return { success: true, data: projects.value.find(p => p.id === id)! }
    } catch (e) {
      // 回滾
      projects.value = snapshot
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '更新專案失敗' },
      }
    }
  }

  const deleteProject = async (id: string): Promise<ActionResult<void>> => {
    const idx = projects.value.findIndex(p => p.id === id)
    if (idx === -1) {
      return {
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: '找不到指定的專案' },
      }
    }

    // 樂觀更新
    const snapshot = projects.value
    projects.value = projects.value.filter(p => p.id !== id)

    try {
      await service.deleteProject(id)
      return { success: true }
    } catch (e) {
      // 回滾
      projects.value = snapshot
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '刪除專案失敗' },
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
    createProject,
    updateProject,
    deleteProject,
  }
})
