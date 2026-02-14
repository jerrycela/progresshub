import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, ActionResult } from 'shared/types'
import { createProjectService } from '@/services/projectService'
import { mockProjects } from '@/mocks/unified'

const service = createProjectService()

export const useProjectStore = defineStore('projects', () => {
  const projects = ref<Project[]>([...mockProjects])

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

  const createProject = (input: {
    name: string
    description?: string
    status?: string
    startDate?: string
    endDate?: string
  }): Project => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: input.name,
      description: input.description || '',
      status: (input.status as Project['status']) || 'ACTIVE',
      startDate: input.startDate || new Date().toISOString().split('T')[0],
      endDate: input.endDate || '',
      createdById: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    projects.value = [...projects.value, newProject]
    return newProject
  }

  const updateProject = (id: string, input: Partial<Project>): Project | null => {
    const idx = projects.value.findIndex(p => p.id === id)
    if (idx === -1) return null
    const updated = { ...projects.value[idx], ...input, updatedAt: new Date().toISOString() }
    projects.value = projects.value.map((p, i) => (i === idx ? updated : p))
    return updated
  }

  const deleteProject = (id: string): boolean => {
    const idx = projects.value.findIndex(p => p.id === id)
    if (idx === -1) return false
    projects.value = projects.value.filter(p => p.id !== id)
    return true
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
