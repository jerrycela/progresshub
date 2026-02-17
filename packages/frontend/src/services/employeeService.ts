import type { MockEmployee, Department, ActionResult, UserRole } from 'shared/types'
import { mockEmployees } from '@/mocks/unified'
import { apiGetUnwrap, apiPostUnwrap, apiPutUnwrap, apiDelete } from './api'

// 後端 DTO → 前端 MockEmployee 欄位映射
// 後端回傳 `role`，前端 type 使用 `userRole`
function mapBackendEmployee(raw: Record<string, unknown>): MockEmployee {
  return {
    id: raw.id as string,
    name: raw.name as string,
    email: raw.email as string,
    department: raw.department as Department,
    userRole: (raw.role || raw.userRole) as UserRole,
    avatar: raw.avatar as string | undefined,
  }
}

export interface CreateEmployeeInput {
  name: string
  email: string
  department: Department
  userRole: string
}

export interface EmployeeServiceInterface {
  fetchEmployees(): Promise<MockEmployee[]>
  getEmployeeById(id: string): Promise<MockEmployee | undefined>
  getByDepartment(dept: Department): Promise<MockEmployee[]>
  createEmployee(input: CreateEmployeeInput): Promise<ActionResult<MockEmployee>>
  updateEmployee(id: string, input: Partial<MockEmployee>): Promise<ActionResult<MockEmployee>>
  deleteEmployee(id: string): Promise<ActionResult<void>>
}

class MockEmployeeService implements EmployeeServiceInterface {
  async fetchEmployees(): Promise<MockEmployee[]> {
    await new Promise(r => setTimeout(r, 200))
    return [...mockEmployees]
  }

  async getEmployeeById(id: string): Promise<MockEmployee | undefined> {
    return mockEmployees.find(e => e.id === id)
  }

  async getByDepartment(dept: Department): Promise<MockEmployee[]> {
    return mockEmployees.filter(e => e.department === dept)
  }

  async createEmployee(input: CreateEmployeeInput): Promise<ActionResult<MockEmployee>> {
    await new Promise(r => setTimeout(r, 200))
    const newEmployee: MockEmployee = {
      id: `emp-${Date.now()}`,
      name: input.name,
      email: input.email,
      department: input.department,
      userRole: input.userRole as MockEmployee['userRole'],
    }
    return { success: true, data: newEmployee }
  }

  async updateEmployee(
    id: string,
    input: Partial<MockEmployee>,
  ): Promise<ActionResult<MockEmployee>> {
    await new Promise(r => setTimeout(r, 200))
    const employee = mockEmployees.find(e => e.id === id)
    if (!employee) {
      return {
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: '找不到指定的員工' },
      }
    }
    return { success: true, data: { ...employee, ...input } }
  }

  async deleteEmployee(id: string): Promise<ActionResult<void>> {
    await new Promise(r => setTimeout(r, 200))
    const employee = mockEmployees.find(e => e.id === id)
    if (!employee) {
      return {
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: '找不到指定的員工' },
      }
    }
    return { success: true }
  }
}

class ApiEmployeeService implements EmployeeServiceInterface {
  async fetchEmployees(): Promise<MockEmployee[]> {
    const raw = await apiGetUnwrap<Record<string, unknown>[]>('/employees')
    return raw.map(mapBackendEmployee)
  }

  async getEmployeeById(id: string): Promise<MockEmployee | undefined> {
    const raw = await apiGetUnwrap<Record<string, unknown>>(`/employees/${id}`)
    return mapBackendEmployee(raw)
  }

  async getByDepartment(dept: Department): Promise<MockEmployee[]> {
    const raw = await apiGetUnwrap<Record<string, unknown>[]>(`/employees?department=${dept}`)
    return raw.map(mapBackendEmployee)
  }

  async createEmployee(input: CreateEmployeeInput): Promise<ActionResult<MockEmployee>> {
    // 前端欄位名 → 後端欄位名轉換
    const backendPayload = {
      name: input.name,
      email: input.email,
      department: input.department,
      permissionLevel: input.userRole,
    }
    const raw = await apiPostUnwrap<Record<string, unknown>>('/employees', backendPayload)
    return { success: true, data: mapBackendEmployee(raw) }
  }

  async updateEmployee(
    id: string,
    input: Partial<MockEmployee>,
  ): Promise<ActionResult<MockEmployee>> {
    // 前端欄位名 → 後端欄位名轉換
    const backendPayload: Record<string, unknown> = {}
    if (input.name !== undefined) backendPayload.name = input.name
    if (input.email !== undefined) backendPayload.email = input.email
    if (input.department !== undefined) backendPayload.department = input.department
    if (input.userRole !== undefined) backendPayload.permissionLevel = input.userRole

    const raw = await apiPutUnwrap<Record<string, unknown>>(`/employees/${id}`, backendPayload)
    return { success: true, data: mapBackendEmployee(raw) }
  }

  async deleteEmployee(id: string): Promise<ActionResult<void>> {
    await apiDelete(`/employees/${id}`)
    return { success: true }
  }
}

export const createEmployeeService = (): EmployeeServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockEmployeeService() : new ApiEmployeeService()
