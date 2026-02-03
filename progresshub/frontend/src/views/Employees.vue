<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { employeesApi } from '@/api'
import type { Employee, PermissionLevel } from '@/types'

const loading = ref(true)
const employees = ref<Employee[]>([])
const showModal = ref(false)
const editingEmployee = ref<Employee | null>(null)

const form = ref({
  name: '',
  department: '',
  role: '',
  permissionLevel: 'EMPLOYEE' as PermissionLevel,
})

onMounted(async () => {
  await loadEmployees()
})

const loadEmployees = async () => {
  try {
    const response = await employeesApi.getAll()
    employees.value = response.data.employees
  } catch (error) {
    console.error('Failed to load employees:', error)
  } finally {
    loading.value = false
  }
}

const openEditModal = (employee: Employee) => {
  editingEmployee.value = employee
  form.value = {
    name: employee.name,
    department: employee.department || '',
    role: employee.role || '',
    permissionLevel: employee.permissionLevel,
  }
  showModal.value = true
}

const handleSubmit = async () => {
  if (!editingEmployee.value) return

  try {
    await employeesApi.update(editingEmployee.value.id, {
      name: form.value.name,
      department: form.value.department || null,
      role: form.value.role || null,
      permissionLevel: form.value.permissionLevel,
    })

    showModal.value = false
    await loadEmployees()
  } catch (error) {
    console.error('Failed to update employee:', error)
  }
}

const toggleActive = async (employee: Employee) => {
  const action = employee.isActive ? '停用' : '啟用'
  if (!confirm(`確定要${action}此員工嗎？`)) return

  try {
    if (employee.isActive) {
      await employeesApi.delete(employee.id)
    } else {
      await employeesApi.update(employee.id, { isActive: true })
    }
    await loadEmployees()
  } catch (error) {
    console.error('Failed to toggle employee status:', error)
  }
}

const getPermissionText = (level: PermissionLevel) => {
  const texts: Record<PermissionLevel, string> = {
    EMPLOYEE: '員工',
    PM: '專案經理',
    ADMIN: '管理員',
  }
  return texts[level]
}

const getPermissionClass = (level: PermissionLevel) => {
  const classes: Record<PermissionLevel, string> = {
    EMPLOYEE: 'bg-gray-100 text-gray-800',
    PM: 'bg-blue-100 text-blue-800',
    ADMIN: 'bg-purple-100 text-purple-800',
  }
  return classes[level]
}
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">員工管理</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>

    <div v-else class="card overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              員工
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              部門
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              職能
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              權限
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              任務數
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              狀態
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="employee in employees" :key="employee.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span class="text-primary-600 font-medium">{{ employee.name?.charAt(0) }}</span>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-gray-900">{{ employee.name }}</p>
                  <p class="text-sm text-gray-500">{{ employee.email }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ employee.department || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ employee.role || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="['status-badge', getPermissionClass(employee.permissionLevel)]">
                {{ getPermissionText(employee.permissionLevel) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ employee._count?.assignedTasks || 0 }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="[
                  'status-badge',
                  employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                ]"
              >
                {{ employee.isActive ? '啟用' : '停用' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <button
                @click="openEditModal(employee)"
                class="text-primary-600 hover:text-primary-700 mr-3"
              >
                編輯
              </button>
              <button
                @click="toggleActive(employee)"
                :class="employee.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'"
              >
                {{ employee.isActive ? '停用' : '啟用' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 編輯 Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">編輯員工</h2>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="form-label">姓名</label>
              <input v-model="form.name" type="text" class="form-input" required />
            </div>

            <div>
              <label class="form-label">部門</label>
              <input v-model="form.department" type="text" class="form-input" />
            </div>

            <div>
              <label class="form-label">職能</label>
              <input v-model="form.role" type="text" class="form-input" placeholder="例如：前端、後端、美術" />
            </div>

            <div>
              <label class="form-label">權限等級</label>
              <select v-model="form.permissionLevel" class="form-select">
                <option value="EMPLOYEE">員工</option>
                <option value="PM">專案經理</option>
                <option value="ADMIN">管理員</option>
              </select>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button type="button" @click="showModal = false" class="btn btn-secondary">
                取消
              </button>
              <button type="submit" class="btn btn-primary">
                儲存
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
