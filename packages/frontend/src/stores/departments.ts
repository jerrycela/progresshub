import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Department } from 'shared/types'
import { mockDepartments } from '@/mocks/unified'

export const useDepartmentStore = defineStore('departments', () => {
  const departments = ref<{ id: Department; name: string; memberCount: number }[]>(
    [...mockDepartments]
  )

  const getDepartmentName = (id: Department) =>
    departments.value.find((d) => d.id === id)?.name ?? ''

  const departmentOptions = departments.value.map((d) => ({
    value: d.id,
    label: d.name,
  }))

  return {
    departments,
    getDepartmentName,
    departmentOptions,
  }
})
