import type { DashboardStats, FunctionWorkload } from 'shared/types'
import { mockDashboardStats, mockFunctionWorkloads } from '@/mocks/unified'
import api from './api'

export interface DashboardServiceInterface {
  fetchStats(): Promise<DashboardStats>
  fetchWorkloads(): Promise<FunctionWorkload[]>
}

class MockDashboardService implements DashboardServiceInterface {
  async fetchStats(): Promise<DashboardStats> {
    await new Promise(r => setTimeout(r, 300))
    return { ...mockDashboardStats }
  }

  async fetchWorkloads(): Promise<FunctionWorkload[]> {
    await new Promise(r => setTimeout(r, 300))
    return [...mockFunctionWorkloads]
  }
}

class ApiDashboardService implements DashboardServiceInterface {
  async fetchStats(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>('/dashboard/stats')
    return data
  }

  async fetchWorkloads(): Promise<FunctionWorkload[]> {
    const { data } = await api.get<FunctionWorkload[]>('/dashboard/workloads')
    return data
  }
}

export const createDashboardService = (): DashboardServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockDashboardService() : new ApiDashboardService()
