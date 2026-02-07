import type { Project } from 'shared/types'
import { mockProjects } from '@/mocks/unified'
import api from './api'

export interface ProjectServiceInterface {
  fetchProjects(): Promise<Project[]>
  getProjectById(id: string): Promise<Project | undefined>
}

class MockProjectService implements ProjectServiceInterface {
  async fetchProjects(): Promise<Project[]> {
    await new Promise((r) => setTimeout(r, 200))
    return [...mockProjects]
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    return mockProjects.find((p) => p.id === id)
  }
}

class ApiProjectService implements ProjectServiceInterface {
  async fetchProjects(): Promise<Project[]> {
    const { data } = await api.get<Project[]>('/projects')
    return data
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    const { data } = await api.get<Project>(`/projects/${id}`)
    return data
  }
}

export const createProjectService = (): ProjectServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockProjectService() : new ApiProjectService()
