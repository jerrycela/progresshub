import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MockEmployee, Department, ActionResult } from 'shared/types'
import { createEmployeeService } from '@/services/employeeService'
import { mockEmployees } from '@/mocks/unified'

const service = createEmployeeService()

export const useEmployeeStore = defineStore('employees', () => {
  const employees = ref<MockEmployee[]>([...mockEmployees])

  const getByDepartment = (dept: Department) =>
    computed(() => employees.value.filter(e => e.department === dept))

  const filteredByDepartment = (dept: Department | '') => {
    if (!dept) return employees.value
    return employees.value.filter(e => e.department === dept)
  }

  const getEmployeeById = (id: string) => employees.value.find(e => e.id === id)

  const getEmployeeName = (id: string) => getEmployeeById(id)?.name ?? ''

  const employeeOptions = computed(() =>
    employees.value.map(e => ({
      value: e.id,
      label: `${e.name} (${e.department})`,
    })),
  )

  const fetchEmployees = async (): Promise<ActionResult<MockEmployee[]>> => {
    try {
      const data = await service.fetchEmployees()
      employees.value = data
      return { success: true, data: employees.value }
    } catch (e) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '載入員工失敗' },
      }
    }
  }

  const createEmployee = (input: Omit<MockEmployee, 'id'>): MockEmployee => {
    const newEmployee: MockEmployee = {
      id: `emp-${Date.now()}`,
      ...input,
    }
    employees.value = [...employees.value, newEmployee]
    return newEmployee
  }

  const updateEmployee = (id: string, input: Partial<MockEmployee>): MockEmployee | null => {
    const idx = employees.value.findIndex(e => e.id === id)
    if (idx === -1) return null
    const updated = { ...employees.value[idx], ...input }
    employees.value = employees.value.map((e, i) => (i === idx ? updated : e))
    return updated
  }

  const deleteEmployee = (id: string): boolean => {
    const idx = employees.value.findIndex(e => e.id === id)
    if (idx === -1) return false
    employees.value = employees.value.filter(e => e.id !== id)
    return true
  }

  return {
    employees,
    getByDepartment,
    filteredByDepartment,
    getEmployeeById,
    getEmployeeName,
    employeeOptions,
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  }
})
