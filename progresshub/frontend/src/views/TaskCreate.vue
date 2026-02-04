<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { mockProjects, mockDepartments, mockEmployees } from '@/stores/mockData'
import type { Department } from '@/types'

const router = useRouter()

// 表單資料
const form = ref({
  name: '',
  description: '',
  projectId: '',
  department: '' as Department | '',
  sourceType: 'POOL' as 'POOL' | 'ASSIGNED' | 'SELF_CREATED',
  assignedToId: '',
  collaborators: [] as string[],
  plannedStartDate: '',
  plannedEndDate: '',
})

// 篩選後的員工（根據部門）
const filteredEmployees = computed(() => {
  if (!form.value.department) {
    return mockEmployees
  }
  return mockEmployees.filter((e) => e.department === form.value.department)
})

// 表單驗證
const isValid = computed(() => {
  return (
    form.value.name.trim() !== '' &&
    form.value.projectId !== '' &&
    form.value.plannedStartDate !== '' &&
    form.value.plannedEndDate !== ''
  )
})

// 來源類型選項
const sourceTypes = [
  { value: 'POOL', label: '任務池', description: '發布到任務池讓大家認領' },
  { value: 'ASSIGNED', label: '指派', description: '直接指派給特定人員' },
  { value: 'SELF_CREATED', label: '自建', description: '建立自己的個人工項' },
]

// 切換協作者
const toggleCollaborator = (employeeId: string) => {
  const index = form.value.collaborators.indexOf(employeeId)
  if (index === -1) {
    form.value.collaborators.push(employeeId)
  } else {
    form.value.collaborators.splice(index, 1)
  }
}

// 提交表單
const submitForm = () => {
  if (!isValid.value) {
    alert('請填寫所有必填欄位')
    return
  }

  const sourceLabel = sourceTypes.find((t) => t.value === form.value.sourceType)?.label
  const assignee = mockEmployees.find((e) => e.id === form.value.assignedToId)
  const collaboratorNames = form.value.collaborators
    .map((id) => mockEmployees.find((e) => e.id === id)?.name)
    .filter(Boolean)
    .join('、')

  let message = `任務建立成功！\n\n`
  message += `任務名稱: ${form.value.name}\n`
  message += `類型: ${sourceLabel}\n`
  if (assignee) {
    message += `指派給: ${assignee.name}\n`
  }
  if (collaboratorNames) {
    message += `協作者: ${collaboratorNames}\n`
  }
  message += `\n（此為原型展示，實際功能待後端實作）`

  alert(message)
  router.push('/task-pool')
}

// 取消
const cancel = () => {
  router.push('/task-pool')
}
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto">
    <!-- 頁面標題 -->
    <div class="mb-6">
      <button
        @click="cancel"
        class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer mb-4"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>返回任務池</span>
      </button>

      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">建立新任務</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        建立任務並發布到任務池或直接指派給同仁
      </p>
    </div>

    <!-- 表單 -->
    <form @submit.prevent="submitForm" class="space-y-6">
      <!-- 任務類型選擇 -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">任務類型</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label
            v-for="type in sourceTypes"
            :key="type.value"
            class="relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all"
            :class="[
              form.sourceType === type.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            ]"
          >
            <input
              v-model="form.sourceType"
              type="radio"
              :value="type.value"
              class="sr-only"
            />
            <span class="font-semibold text-gray-900 dark:text-white">{{ type.label }}</span>
            <span class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ type.description }}</span>
            <div
              v-if="form.sourceType === type.value"
              class="absolute top-3 right-3 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center"
            >
              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </label>
        </div>
      </div>

      <!-- 基本資訊 -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">基本資訊</h2>

        <div class="space-y-4">
          <!-- 任務名稱 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              任務名稱 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="輸入任務名稱"
            />
          </div>

          <!-- 描述 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              任務描述
            </label>
            <textarea
              v-model="form.description"
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="詳細描述任務內容..."
            ></textarea>
          </div>

          <!-- 專案和部門 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                所屬專案 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.projectId"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="">選擇專案</option>
                <option v-for="project in mockProjects" :key="project.id" :value="project.id">
                  {{ project.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                相關部門
              </label>
              <select
                v-model="form.department"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="">選擇部門</option>
                <option v-for="dept in mockDepartments" :key="dept.id" :value="dept.id">
                  {{ dept.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- 時間範圍 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                開始日期 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.plannedStartDate"
                type="date"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                結束日期 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.plannedEndDate"
                type="date"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 人員指派（當選擇指派類型時顯示） -->
      <div v-if="form.sourceType === 'ASSIGNED'" class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">指派給</h2>

        <div class="space-y-2 max-h-48 overflow-y-auto">
          <label
            v-for="employee in filteredEmployees"
            :key="employee.id"
            class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
            :class="[
              form.assignedToId === employee.id
                ? 'bg-primary-50 dark:bg-primary-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            ]"
          >
            <input
              v-model="form.assignedToId"
              type="radio"
              :value="employee.id"
              class="text-primary-500 focus:ring-primary-500"
            />
            <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span class="text-gray-600 dark:text-gray-300 font-semibold">
                {{ employee.name.charAt(0) }}
              </span>
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ employee.name }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ employee.email }}</p>
            </div>
          </label>
        </div>
      </div>

      <!-- 協作者（可選） -->
      <div v-if="form.sourceType !== 'SELF_CREATED'" class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">協作者</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">選擇需要一起協作的同仁（可選）</p>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="employee in filteredEmployees"
            :key="employee.id"
            type="button"
            @click="toggleCollaborator(employee.id)"
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer"
            :class="[
              form.collaborators.includes(employee.id)
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            ]"
          >
            {{ employee.name }}
          </button>
        </div>
      </div>

      <!-- 提交按鈕 -->
      <div class="flex justify-end gap-3 pt-4">
        <button
          type="button"
          @click="cancel"
          class="btn-secondary"
        >
          取消
        </button>
        <button
          type="submit"
          :disabled="!isValid"
          class="btn-primary"
          :class="{ 'opacity-50 cursor-not-allowed': !isValid }"
        >
          建立任務
        </button>
      </div>
    </form>
  </div>
</template>
