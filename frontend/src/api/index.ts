import axios from 'axios'
import { getToken, clearAllSensitiveData } from '@/utils/security'
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
  // 安全性設定
  withCredentials: false, // 不傳送 cookies 到跨域請求
  timeout: 30000, // 30 秒超時
})

// Add auth token and security headers to requests
api.interceptors.request.use((config) => {
  // 使用安全存儲取得 token
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // 加入安全標頭
  config.headers['X-Content-Type-Options'] = 'nosniff'
  config.headers['X-Requested-With'] = 'XMLHttpRequest'

  return config
})

// Handle responses and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 清除所有敏感資料
      clearAllSensitiveData()
      // 安全重導向
      window.location.href = '/login'
    }

    // 防止敏感錯誤訊息洩露
    if (error.response?.status >= 500) {
      console.error('Server error occurred')
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
