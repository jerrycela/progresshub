import type { Project, ActionResult } from 'shared/types'
import { mockProjects } from '@/mocks/unified'
import { apiGetUnwrap, apiPostUnwrap, apiPutUnwrap, apiDelete } from './api'

export interface CreateProjectInput {
  name: string
  description?: string
  startDate: string
  endDate: string
}

export interface ProjectServiceInterface {
  fetchProjects(): Promise<Project[]>
  getProjectById(id: string): Promise<Project | undefined>
  createProject(input: CreateProjectInput): Promise<ActionResult<Project>>
  updateProject(id: string, input: Partial<Project>): Promise<ActionResult<Project>>
  deleteProject(id: string): Promise<ActionResult<void>>
}

class MockProjectService implements ProjectServiceInterface {
  async fetchProjects(): Promise<Project[]> {
    await new Promise(r => setTimeout(r, 200))
    return [...mockProjects]
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    return mockProjects.find(p => p.id === id)
  }

  async createProject(input: CreateProjectInput): Promise<ActionResult<Project>> {
    await new Promise(r => setTimeout(r, 200))
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: input.name,
      description: input.description || '',
      status: 'ACTIVE',
      startDate: input.startDate,
      endDate: input.endDate,
      createdById: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return { success: true, data: newProject }
  }

  async updateProject(id: string, input: Partial<Project>): Promise<ActionResult<Project>> {
    await new Promise(r => setTimeout(r, 200))
    const project = mockProjects.find(p => p.id === id)
    if (!project) {
      return { success: false, error: { code: 'PROJECT_NOT_FOUND', message: '找不到指定的專案' } }
    }
    return { success: true, data: { ...project, ...input, updatedAt: new Date().toISOString() } }
  }

  async deleteProject(id: string): Promise<ActionResult<void>> {
    await new Promise(r => setTimeout(r, 200))
    const project = mockProjects.find(p => p.id === id)
    if (!project) {
      return { success: false, error: { code: 'PROJECT_NOT_FOUND', message: '找不到指定的專案' } }
    }
    return { success: true }
  }
}

class ApiProjectService implements ProjectServiceInterface {
  async fetchProjects(): Promise<Project[]> {
    return apiGetUnwrap<Project[]>('/projects')
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    return apiGetUnwrap<Project>(`/projects/${id}`)
  }

  async createProject(input: CreateProjectInput): Promise<ActionResult<Project>> {
    const data = await apiPostUnwrap<Project>('/projects', input)
    return { success: true, data }
  }

  async updateProject(id: string, input: Partial<Project>): Promise<ActionResult<Project>> {
    // 只傳送後端 validator 允許的欄位
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.description !== undefined) payload.description = input.description
    if (input.startDate !== undefined) payload.startDate = input.startDate
    if (input.endDate !== undefined) payload.endDate = input.endDate
    if (input.status !== undefined) payload.status = input.status

    const data = await apiPutUnwrap<Project>(`/projects/${id}`, payload)
    return { success: true, data }
  }

  async deleteProject(id: string): Promise<ActionResult<void>> {
    await apiDelete(`/projects/${id}`)
    return { success: true }
  }
}

export const createProjectService = (): ProjectServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockProjectService() : new ApiProjectService()
