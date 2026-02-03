import axios from 'axios'
import type {
  User,
  Project,
  Task,
  Milestone,
  ProgressLog,
  Employee,
  GanttTask,
  GanttStats,
} from '@/types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  slackLogin: (code: string) =>
    api.post<{ success: boolean; token: string; user: User }>('/auth/slack', { code }),

  getMe: () =>
    api.get<{ success: boolean; user: User }>('/auth/me'),

  refresh: () =>
    api.post<{ success: boolean; token: string }>('/auth/refresh'),

  logout: () =>
    api.post<{ success: boolean }>('/auth/logout'),
}

// Projects API
export const projectsApi = {
  getAll: (status?: string) =>
    api.get<{ success: boolean; projects: Project[] }>('/projects', { params: { status } }),

  getById: (id: string) =>
    api.get<{ success: boolean; project: Project }>(`/projects/${id}`),

  create: (data: Partial<Project>) =>
    api.post<{ success: boolean; project: Project }>('/projects', data),

  update: (id: string, data: Partial<Project>) =>
    api.put<{ success: boolean; project: Project }>(`/projects/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/projects/${id}`),
}

// Tasks API
export const tasksApi = {
  getMy: () =>
    api.get<{ success: boolean; tasks: Task[] }>('/tasks/my'),

  getByProject: (projectId: string) =>
    api.get<{ success: boolean; tasks: Task[] }>(`/tasks/project/${projectId}`),

  getById: (id: string) =>
    api.get<{ success: boolean; task: Task }>(`/tasks/${id}`),

  create: (data: Partial<Task>) =>
    api.post<{ success: boolean; task: Task }>('/tasks', data),

  update: (id: string, data: Partial<Task>) =>
    api.put<{ success: boolean; task: Task }>(`/tasks/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/tasks/${id}`),
}

// Milestones API
export const milestonesApi = {
  getByProject: (projectId: string) =>
    api.get<{ success: boolean; milestones: Milestone[] }>(`/milestones/project/${projectId}`),

  getById: (id: string) =>
    api.get<{ success: boolean; milestone: Milestone }>(`/milestones/${id}`),

  create: (data: Partial<Milestone>) =>
    api.post<{ success: boolean; milestone: Milestone }>('/milestones', data),

  update: (id: string, data: Partial<Milestone>) =>
    api.put<{ success: boolean; milestone: Milestone }>(`/milestones/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/milestones/${id}`),
}

// Progress API
export const progressApi = {
  submit: (data: { taskId: string; progressPercentage: number; notes?: string }) =>
    api.post<{ success: boolean; progressLog: ProgressLog }>('/progress', data),

  getAll: (params?: { taskId?: string; employeeId?: string; date?: string }) =>
    api.get<{ success: boolean; logs: ProgressLog[] }>('/progress', { params }),

  getMy: (limit?: number) =>
    api.get<{ success: boolean; logs: ProgressLog[] }>('/progress/my', { params: { limit } }),

  getTodayStatus: () =>
    api.get<{ success: boolean; reportedCount: number; pendingTasks: Task[] }>('/progress/today-status'),
}

// Gantt API
export const ganttApi = {
  getData: (params?: { projectId?: string; employeeId?: string; role?: string; startDate?: string; endDate?: string }) =>
    api.get<{ success: boolean; tasks: GanttTask[]; milestones: GanttTask[]; ganttData: GanttTask[] }>('/gantt', { params }),

  getStats: (projectId?: string) =>
    api.get<{ success: boolean; stats: GanttStats }>('/gantt/stats', { params: { projectId } }),
}

// Employees API
export const employeesApi = {
  getAll: (params?: { department?: string; role?: string; permissionLevel?: string; isActive?: boolean }) =>
    api.get<{ success: boolean; employees: Employee[] }>('/employees', { params }),

  getById: (id: string) =>
    api.get<{ success: boolean; employee: Employee }>(`/employees/${id}`),

  update: (id: string, data: Partial<Employee>) =>
    api.put<{ success: boolean; employee: Employee }>(`/employees/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/employees/${id}`),

  getDepartments: () =>
    api.get<{ success: boolean; departments: string[] }>('/employees/meta/departments'),

  getRoles: () =>
    api.get<{ success: boolean; roles: string[] }>('/employees/meta/roles'),
}

export default api
