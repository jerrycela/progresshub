<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  mockProjects,
  mockDepartments,
  mockEmployees,
  getTaskById,
  type MockEmployee,
  type PoolTask,
} from '@/mocks/taskPool'
import type { Department, FunctionType } from 'shared/types'
import { useToast } from '@/composables/useToast'

// ============================================
// 任務編輯頁面 - 編輯現有任務

const { showSuccess } = useToast()
// 複用 TaskCreatePage 表單結構
// ============================================

const router = useRouter()
const route = useRoute()

// 載入狀態
const isLoading = ref(true)
const originalTask = ref<PoolTask | null>(null)

// 表單狀態
const title = ref('')
const description = ref('')
const projectId = ref('')
const department = ref<Department | ''>('')
const assigneeId = ref('')
const collaboratorIds = ref<string[]>([])
const startDate = ref('')
const dueDate = ref('')
const functionTags = ref<FunctionType[]>([])

// 職能標籤選項
const functionTagOptions: { value: FunctionType; label: string }[] = [
  { value: 'ART', label: '美術' },
  { value: 'PROGRAMMING', label: '程式' },
  { value: 'PLANNING', label: '企劃' },
  { value: 'ANIMATION', label: '動態' },
  { value: 'SOUND', label: '音效' },
  { value: 'VFX', label: '特效' },
  { value: 'COMBAT', label: '戰鬥' },
]

// 載入任務資料
onMounted(() => {
  const taskId = route.params.id as string
  const task = getTaskById(taskId)

  if (task) {
    originalTask.value = task
    title.value = task.title
    description.value = task.description || ''
    projectId.value = task.projectId
    department.value = task.department || ''
    assigneeId.value = task.assigneeId || ''
    startDate.value = task.startDate || ''
    dueDate.value = task.dueDate || ''
    functionTags.value = [...task.functionTags]
  }

  isLoading.value = false
})

// 根據部門篩選員工
const filteredEmployees = computed(() => {
  if (!department.value) return mockEmployees
  return mockEmployees.filter((emp: MockEmployee) => emp.department === department.value)
})

// 是否可提交
const canSubmit = computed(() => {
  if (!title.value.trim()) return false
  if (!projectId.value) return false
  return true
})

// 切換職能標籤
const toggleFunctionTag = (tag: FunctionType): void => {
  const index = functionTags.value.indexOf(tag)
  if (index === -1) {
    functionTags.value = [...functionTags.value, tag]
  } else {
    functionTags.value = functionTags.value.filter((t: FunctionType) => t !== tag)
  }
}

// 切換協作者
const toggleCollaborator = (empId: string): void => {
  const index = collaboratorIds.value.indexOf(empId)
  if (index === -1) {
    collaboratorIds.value = [...collaboratorIds.value, empId]
  } else {
    collaboratorIds.value = collaboratorIds.value.filter((id: string) => id !== empId)
  }
}

// 提交表單
const handleSubmit = (): void => {
  // 任務資料（待後端 API 實作時使用）
  const _taskData = {
    id: originalTask.value?.id,
    title: title.value,
    description: description.value,
    projectId: projectId.value,
    department: department.value,
    assigneeId: assigneeId.value || undefined,
    collaboratorIds: collaboratorIds.value,
    startDate: startDate.value,
    dueDate: dueDate.value,
    functionTags: functionTags.value,
  }
  void _taskData // 避免 TS 未使用警告

  showSuccess(`任務「${title.value}」已更新`)
  router.push(`/task-pool/${originalTask.value?.id}`)
}

// 取消編輯
const handleCancel = (): void => {
  router.push(`/task-pool/${originalTask.value?.id}`)
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- 載入中 -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2" style="border-color: var(--accent-primary);"></div>
    </div>

    <!-- 任務不存在 -->
    <div v-else-if="!originalTask" class="card p-12 text-center">
      <svg class="w-16 h-16 mx-auto" style="color: var(--text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="mt-4" style="color: var(--text-secondary);">找不到此任務</p>
      <button class="btn-primary mt-4" @click="router.push('/task-pool')">返回任務池</button>
    </div>

    <!-- 編輯表單 -->
    <template v-else>
      <!-- 頁面標題 -->
      <div class="flex items-center gap-4">
        <button
          class="p-2 rounded-lg transition-colors cursor-pointer"
          style="background-color: var(--bg-tertiary);"
          @click="handleCancel"
        >
          <svg class="w-5 h-5" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 class="text-2xl font-bold" style="color: var(--text-primary);">編輯任務</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            修改任務資訊
          </p>
        </div>
      </div>

      <!-- 任務基本資訊 -->
      <div class="card p-6 space-y-5">
        <h2 class="text-lg font-semibold" style="color: var(--text-primary);">任務資訊</h2>

        <!-- 任務標題 -->
        <div>
          <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
            任務標題 <span style="color: var(--accent-primary);">*</span>
          </label>
          <input
            v-model="title"
            type="text"
            placeholder="輸入任務標題"
            class="input-field w-full"
          />
        </div>

        <!-- 任務描述 -->
        <div>
          <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
            任務描述
          </label>
          <textarea
            v-model="description"
            rows="4"
            placeholder="輸入任務描述..."
            class="input-field w-full resize-none"
          ></textarea>
        </div>

        <!-- 專案選擇 -->
        <div>
          <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
            所屬專案 <span style="color: var(--accent-primary);">*</span>
          </label>
          <select v-model="projectId" class="input-field w-full cursor-pointer">
            <option value="">請選擇專案</option>
            <option v-for="project in mockProjects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>

        <!-- 部門選擇 -->
        <div>
          <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
            相關部門
          </label>
          <select v-model="department" class="input-field w-full cursor-pointer">
            <option value="">請選擇部門</option>
            <option v-for="dept in mockDepartments" :key="dept.id" :value="dept.id">
              {{ dept.name }}
            </option>
          </select>
        </div>

        <!-- 職能標籤 -->
        <div>
          <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
            職能標籤
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in functionTagOptions"
              :key="tag.value"
              :class="[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer',
                functionTags.includes(tag.value)
                  ? 'bg-[var(--accent-primary)]'
                  : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80'
              ]"
              :style="{ color: functionTags.includes(tag.value) ? '#FFFFFF' : 'var(--text-secondary)' }"
              @click="toggleFunctionTag(tag.value)"
            >
              {{ tag.label }}
            </button>
          </div>
        </div>

        <!-- 日期區間 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
              開始日期
            </label>
            <input
              v-model="startDate"
              type="date"
              class="input-field w-full cursor-pointer"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
              截止日期
            </label>
            <input
              v-model="dueDate"
              type="date"
              class="input-field w-full cursor-pointer"
            />
          </div>
        </div>
      </div>

      <!-- 指派設定 -->
      <div class="card p-6 space-y-5">
        <h2 class="text-lg font-semibold" style="color: var(--text-primary);">指派設定</h2>

        <!-- 負責人 -->
        <div>
          <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
            負責人
          </label>
          <select v-model="assigneeId" class="input-field w-full cursor-pointer">
            <option value="">尚未指派</option>
            <option v-for="emp in filteredEmployees" :key="emp.id" :value="emp.id">
              {{ emp.name }} ({{ emp.department }})
            </option>
          </select>
        </div>

        <!-- 協作者 -->
        <div>
          <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
            協作者（可多選）
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="emp in filteredEmployees"
              :key="emp.id"
              :class="[
                'px-3 py-1.5 rounded-full text-sm transition-all duration-200 cursor-pointer flex items-center gap-2',
                collaboratorIds.includes(emp.id)
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80'
              ]"
              :style="{ color: collaboratorIds.includes(emp.id) ? undefined : 'var(--text-secondary)' }"
              @click="toggleCollaborator(emp.id)"
            >
              <svg v-if="collaboratorIds.includes(emp.id)" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ emp.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="flex items-center justify-end gap-3">
        <button
          class="px-6 py-2.5 rounded-lg font-medium transition-colors cursor-pointer"
          style="background-color: var(--bg-tertiary); color: var(--text-secondary);"
          @click="handleCancel"
        >
          取消
        </button>
        <button
          :disabled="!canSubmit"
          :class="[
            'px-6 py-2.5 rounded-lg font-medium transition-colors',
            canSubmit ? 'btn-primary cursor-pointer' : 'opacity-50 cursor-not-allowed'
          ]"
          @click="handleSubmit"
        >
          儲存變更
        </button>
      </div>
    </template>
  </div>
</template>
