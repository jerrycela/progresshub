import type { Project } from 'shared/types'
import { mockProjects } from '@/mocks/unified'
import { apiGetUnwrap } from './api'

export interface ProjectServiceInterface {
  fetchProjects(): Promise<Project[]>
  getProjectById(id: string): Promise<Project | undefined>
}

class MockProjectService implements ProjectServiceInterface {
  async fetchProjects(): Promise<Project[]> {
    await new Promise(r => setTimeout(r, 200))
    return [...mockProjects]
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    return mockProjects.find(p => p.id === id)
  }
}

class ApiProjectService implements ProjectServiceInterface {
  async fetchProjects(): Promise<Project[]> {
    return apiGetUnwrap<Project[]>('/projects')
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    return apiGetUnwrap<Project>(`/projects/${id}`)
  }
}

export const createProjectService = (): ProjectServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockProjectService() : new ApiProjectService()
