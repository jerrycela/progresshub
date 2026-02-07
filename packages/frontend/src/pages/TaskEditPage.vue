<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTaskStore } from '@/stores/tasks'
import { useProjectStore } from '@/stores/projects'
import { useDepartmentStore } from '@/stores/departments'
import { useEmployeeStore } from '@/stores/employees'
import type { PoolTask } from 'shared/types'
import { useToast } from '@/composables/useToast'
import TaskForm from '@/components/task/TaskForm.vue'
import type { TaskFormData } from '@/components/task/TaskForm.vue'

// ============================================
// 任務編輯頁面 - 編輯現有任務
// ============================================

const { showSuccess } = useToast()
const router = useRouter()
const route = useRoute()

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const departmentStore = useDepartmentStore()
const employeeStore = useEmployeeStore()

// 載入狀態
const isLoading = ref(true)
const originalTask = ref<PoolTask | null>(null)

// 表單狀態（reactive 物件傳給 TaskForm）
const form = reactive<TaskFormData>({
  title: '',
  description: '',
  projectId: '',
  department: '',
  assigneeId: '',
  collaboratorIds: [],
  startDate: '',
  dueDate: '',
  functionTags: [],
})

// 載入任務資料
onMounted(() => {
  const taskId = route.params.id as string
  const task = taskStore.getPoolTaskById(taskId)

  if (task) {
    originalTask.value = task
    form.title = task.title
    form.description = task.description || ''
    form.projectId = task.projectId
    form.department = task.department || ''
    form.assigneeId = task.assigneeId || ''
    form.startDate = task.startDate || ''
    form.dueDate = task.dueDate || ''
    form.functionTags = [...task.functionTags]
  }

  isLoading.value = false
})

// 是否可提交
const canSubmit = computed(() => {
  if (!form.title.trim()) return false
  if (!form.projectId) return false
  return true
})

// 提交表單
const handleSubmit = (): void => {
  const _taskData = {
    id: originalTask.value?.id,
    ...form,
    assigneeId: form.assigneeId || undefined,
  }
  void _taskData

  showSuccess(`任務「${form.title}」已更新`)
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
          <p class="text-sm mt-1" style="color: var(--text-secondary);">修改任務資訊</p>
        </div>
      </div>

      <!-- 共用任務表單 -->
      <TaskForm
        :form="form"
        :projects="projectStore.projects"
        :departments="departmentStore.departments"
        :employees="employeeStore.employees"
      />

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
