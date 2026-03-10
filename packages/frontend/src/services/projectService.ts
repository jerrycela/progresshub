import type { Project, ActionResult } from 'shared/types'
import { mockProjects } from '@/mocks/unified'
import { apiGetUnwrap, apiPostUnwrap, apiPutUnwrap, apiDelete, apiDeleteUnwrap } from './api'
import { mockDelay } from '@/utils/mockDelay'

export interface CreateProjectInput {
  name: string
  description?: string
  startDate: string
  endDate?: string
}

export interface ProjectMember {
  id: string
  employeeId: string
  role: string
  employee: { id: string; name: string; email: string; department: string; permissionLevel: string }
  createdAt: string
}

export interface ProjectServiceInterface {
  fetchProjects(): Promise<Project[]>
  getProjectById(id: string): Promise<Project | undefined>
  createProject(input: CreateProjectInput): Promise<ActionResult<Project>>
  updateProject(id: string, input: Partial<Project>): Promise<ActionResult<Project>>
  deleteProject(id: string): Promise<ActionResult<void>>
  getProjectMembers(projectId: string): Promise<ProjectMember[]>
  addProjectMembers(projectId: string, employeeIds: string[]): Promise<{ count: number }>
  removeProjectMember(projectId: string, employeeId: string): Promise<void>
}

class MockProjectService implements ProjectServiceInterface {
  async fetchProjects(): Promise<Project[]> {
    await mockDelay()
    return [...mockProjects]
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    return mockProjects.find(p => p.id === id)
  }

  async createProject(input: CreateProjectInput): Promise<ActionResult<Project>> {
    await mockDelay()
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
    await mockDelay()
    const project = mockProjects.find(p => p.id === id)
    if (!project) {
      return { success: false, error: { code: 'PROJECT_NOT_FOUND', message: '找不到指定的專案' } }
    }
    return { success: true, data: { ...project, ...input, updatedAt: new Date().toISOString() } }
  }

  async deleteProject(id: string): Promise<ActionResult<void>> {
    await mockDelay()
    const project = mockProjects.find(p => p.id === id)
    if (!project) {
      return { success: false, error: { code: 'PROJECT_NOT_FOUND', message: '找不到指定的專案' } }
    }
    return { success: true }
  }

  async getProjectMembers(): Promise<ProjectMember[]> {
    return []
  }

  async addProjectMembers(): Promise<{ count: number }> {
    return { count: 0 }
  }

  async removeProjectMember(): Promise<void> {}
}

class ApiProjectService implements ProjectServiceInterface {
  async fetchProjects(): Promise<Project[]> {
    return apiGetUnwrap<Project[]>('/projects')
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    try {
      return await apiGetUnwrap<Project>(`/projects/${id}`)
    } catch {
      return undefined
    }
  }

  async createProject(input: CreateProjectInput): Promise<ActionResult<Project>> {
    try {
      const data = await apiPostUnwrap<Project>('/projects', input)
      return { success: true, data }
    } catch (e) {
      const message = e instanceof Error ? e.message : '操作失敗'
      return { success: false, error: { code: 'PROJECT_CREATE_FAILED', message } }
    }
  }

  async updateProject(id: string, input: Partial<Project>): Promise<ActionResult<Project>> {
    try {
      // 只傳送後端 validator 允許的欄位
      const payload: Record<string, unknown> = {}
      if (input.name !== undefined) payload.name = input.name
      if (input.description !== undefined) payload.description = input.description
      if (input.startDate !== undefined) payload.startDate = input.startDate
      if (input.endDate !== undefined) payload.endDate = input.endDate
      if (input.status !== undefined) payload.status = input.status

      const data = await apiPutUnwrap<Project>(`/projects/${id}`, payload)
      return { success: true, data }
    } catch (e) {
      const message = e instanceof Error ? e.message : '操作失敗'
      return { success: false, error: { code: 'PROJECT_UPDATE_FAILED', message } }
    }
  }

  async deleteProject(id: string): Promise<ActionResult<void>> {
    try {
      await apiDelete(`/projects/${id}`)
      return { success: true }
    } catch (e) {
      const message = e instanceof Error ? e.message : '操作失敗'
      return { success: false, error: { code: 'PROJECT_DELETE_FAILED', message } }
    }
  }

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return apiGetUnwrap<ProjectMember[]>(`/projects/${projectId}/members`)
  }

  async addProjectMembers(projectId: string, employeeIds: string[]): Promise<{ count: number }> {
    return apiPostUnwrap<{ count: number }>(`/projects/${projectId}/members`, { employeeIds })
  }

  async removeProjectMember(projectId: string, employeeId: string): Promise<void> {
    await apiDeleteUnwrap(`/projects/${projectId}/members/${employeeId}`)
  }
}

export const createProjectService = (): ProjectServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockProjectService() : new ApiProjectService()
