import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MockEmployee, Department, ActionResult } from 'shared/types'
import { mockEmployees } from '@/mocks/unified'

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
      await new Promise(r => setTimeout(r, 200))
      employees.value = [...mockEmployees]
      return { success: true, data: employees.value }
    } catch (e) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '載入員工失敗' },
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
  }
})
