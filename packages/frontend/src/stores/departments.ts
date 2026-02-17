import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Department } from 'shared/types'
import { createDepartmentService, type DepartmentData } from '@/services/departmentService'
import { storeAction } from '@/utils/storeHelpers'

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

  const fetchDepartments = () =>
    storeAction(async () => {
      departments.value = await service.fetchDepartments()
      return departments.value
    }, '載入部門失敗')

  return {
    departments,
    getDepartmentName,
    departmentOptions,
    fetchDepartments,
  }
})
