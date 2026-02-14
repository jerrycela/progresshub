import type { MockEmployee, Department } from 'shared/types'
import { mockEmployees } from '@/mocks/unified'
import { apiGetUnwrap } from './api'

export interface EmployeeServiceInterface {
  fetchEmployees(): Promise<MockEmployee[]>
  getEmployeeById(id: string): Promise<MockEmployee | undefined>
  getByDepartment(dept: Department): Promise<MockEmployee[]>
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
}

class ApiEmployeeService implements EmployeeServiceInterface {
  async fetchEmployees(): Promise<MockEmployee[]> {
    return apiGetUnwrap<MockEmployee[]>('/employees')
  }

  async getEmployeeById(id: string): Promise<MockEmployee | undefined> {
    return apiGetUnwrap<MockEmployee>(`/employees/${id}`)
  }

  async getByDepartment(dept: Department): Promise<MockEmployee[]> {
    return apiGetUnwrap<MockEmployee[]>(`/employees?department=${dept}`)
  }
}

export const createEmployeeService = (): EmployeeServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockEmployeeService() : new ApiEmployeeService()
