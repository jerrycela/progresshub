import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Department, ActionResult } from 'shared/types'
import { createDepartmentService, type DepartmentData } from '@/services/departmentService'

const service = createDepartmentService()

export const useDepartmentStore = defineStore('departments', () => {
  const departments = ref<DepartmentData[]>([])

  const getDepartmentName = (id: Department) => departments.value.find(d => d.id === id)?.name ?? ''

  const departmentOptions = computed(() =>
    departments.value.map(d => ({
      value: d.id,
      label: d.name,
    })),
  )

  const fetchDepartments = async (): Promise<ActionResult<DepartmentData[]>> => {
    try {
      const data = await service.fetchDepartments()
      departments.value = data
      return { success: true, data: departments.value }
    } catch (e) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '載入部門失敗' },
      }
    }
  }

  return {
    departments,
    getDepartmentName,
    departmentOptions,
    fetchDepartments,
  }
})
