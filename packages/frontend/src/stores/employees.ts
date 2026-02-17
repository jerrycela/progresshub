import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MockEmployee, Department, ActionResult } from 'shared/types'
import { createEmployeeService, type CreateEmployeeInput } from '@/services/employeeService'
import { mockEmployees } from '@/mocks/unified'

const isMock = import.meta.env.VITE_USE_MOCK === 'true'
const service = createEmployeeService()

export const useEmployeeStore = defineStore('employees', () => {
  const employees = ref<MockEmployee[]>(isMock ? [...mockEmployees] : [])

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

  const createEmployee = async (
    input: CreateEmployeeInput,
  ): Promise<ActionResult<MockEmployee>> => {
    try {
      const result = await service.createEmployee(input)

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || { code: 'UNKNOWN_ERROR', message: '建立員工失敗' },
        }
      }

      employees.value = [...employees.value, result.data]
      return { success: true, data: result.data }
    } catch (e) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '建立員工失敗' },
      }
    }
  }

  const updateEmployee = async (
    id: string,
    input: Partial<MockEmployee>,
  ): Promise<ActionResult<MockEmployee>> => {
    const idx = employees.value.findIndex(e => e.id === id)
    if (idx === -1) {
      return {
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: '找不到指定的員工' },
      }
    }

    // 樂觀更新
    const snapshot = employees.value
    const updated = { ...employees.value[idx], ...input }
    employees.value = employees.value.map((e, i) => (i === idx ? updated : e))

    try {
      const result = await service.updateEmployee(id, input)

      if (result.success && result.data) {
        employees.value = employees.value.map(e => (e.id === id ? { ...e, ...result.data } : e))
      }

      return { success: true, data: employees.value.find(e => e.id === id)! }
    } catch (e) {
      // 回滾
      employees.value = snapshot
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '更新員工失敗' },
      }
    }
  }

  const deleteEmployee = async (id: string): Promise<ActionResult<void>> => {
    const idx = employees.value.findIndex(e => e.id === id)
    if (idx === -1) {
      return {
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: '找不到指定的員工' },
      }
    }

    // 樂觀更新
    const snapshot = employees.value
    employees.value = employees.value.filter(e => e.id !== id)

    try {
      await service.deleteEmployee(id)
      return { success: true }
    } catch (e) {
      // 回滾
      employees.value = snapshot
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '刪除員工失敗' },
      }
    }
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
