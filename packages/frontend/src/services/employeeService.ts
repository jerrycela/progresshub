import type { MockEmployee, Department } from 'shared/types'
import { mockEmployees } from '@/mocks/unified'
import api from './api'

export interface EmployeeServiceInterface {
  fetchEmployees(): Promise<MockEmployee[]>
  getEmployeeById(id: string): Promise<MockEmployee | undefined>
  getByDepartment(dept: Department): Promise<MockEmployee[]>
}

class MockEmployeeService implements EmployeeServiceInterface {
  async fetchEmployees(): Promise<MockEmployee[]> {
    await new Promise((r) => setTimeout(r, 200))
    return [...mockEmployees]
  }

  async getEmployeeById(id: string): Promise<MockEmployee | undefined> {
    return mockEmployees.find((e) => e.id === id)
  }

  async getByDepartment(dept: Department): Promise<MockEmployee[]> {
    return mockEmployees.filter((e) => e.department === dept)
  }
}

class ApiEmployeeService implements EmployeeServiceInterface {
  async fetchEmployees(): Promise<MockEmployee[]> {
    const { data } = await api.get<MockEmployee[]>('/employees')
    return data
  }

  async getEmployeeById(id: string): Promise<MockEmployee | undefined> {
    const { data } = await api.get<MockEmployee>(`/employees/${id}`)
    return data
  }

  async getByDepartment(dept: Department): Promise<MockEmployee[]> {
    const { data } = await api.get<MockEmployee[]>(`/employees?department=${dept}`)
    return data
  }
}

export const createEmployeeService = (): EmployeeServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockEmployeeService() : new ApiEmployeeService()
