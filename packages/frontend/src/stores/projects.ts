import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, ActionResult } from 'shared/types'
import { mockProjects } from '@/mocks/unified'

export const useProjectStore = defineStore('projects', () => {
  const projects = ref<Project[]>([...mockProjects])

  const activeProjects = computed(() => projects.value.filter(p => p.status === 'ACTIVE'))

  const projectOptions = computed(() => projects.value.map(p => ({ value: p.id, label: p.name })))

  const getProjectById = (id: string) => projects.value.find(p => p.id === id)

  const getProjectName = (id: string) => getProjectById(id)?.name ?? ''

  const fetchProjects = async (): Promise<ActionResult<Project[]>> => {
    try {
      await new Promise(r => setTimeout(r, 200))
      projects.value = [...mockProjects]
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
