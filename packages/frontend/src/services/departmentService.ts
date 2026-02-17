import type { Department } from 'shared/types'
import { mockDepartments } from '@/mocks/unified'

export interface DepartmentData {
  id: Department
  name: string
  memberCount: number
}

export interface DepartmentServiceInterface {
  fetchDepartments(): Promise<DepartmentData[]>
}

// 部門為靜態資料，Mock 和 API 模式都使用相同的本地資料
// 後端目前沒有 /api/departments endpoint
class DepartmentService implements DepartmentServiceInterface {
  async fetchDepartments(): Promise<DepartmentData[]> {
    return [...mockDepartments]
  }
}

export const createDepartmentService = (): DepartmentServiceInterface => new DepartmentService()
