<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/projects'
import { useDepartmentStore } from '@/stores/departments'
import { useEmployeeStore } from '@/stores/employees'
import { useTaskStore } from '@/stores/tasks'
import { useAuthStore } from '@/stores/auth'
import type { TaskSourceType } from 'shared/types'
import { useToast } from '@/composables/useToast'
import { roleLabels } from '@/constants/labels'
import TaskForm from '@/components/task/TaskForm.vue'
import type { TaskFormData } from '@/components/task/TaskForm.vue'
import TaskRelationSelector from '@/components/task/TaskRelationSelector.vue'

// ============================================
// 任務建立頁面 - 建立任務池任務、指派任務、自建任務
// ============================================

const { showSuccess, showError } = useToast()
const router = useRouter()

const projectStore = useProjectStore()
const departmentStore = useDepartmentStore()
const employeeStore = useEmployeeStore()
const taskStore = useTaskStore()
const authStore = useAuthStore()

const sourceType = ref<TaskSourceType>('POOL')
const isSubmitting = ref(false)

// 來源類型選項
const sourceTypeOptions: {
  value: TaskSourceType
  label: string
  description: string
  icon: string
}[] = [
  {
    value: 'POOL',
    label: '任務池任務',
    description: '發布到任務池，讓成員自行認領',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
  {
    value: 'ASSIGNED',
    label: '指派任務',
    description: '直接指派給特定成員',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    value: 'SELF_CREATED',
    label: '自建任務',
    description: '為自己建立的個人任務',
    icon: 'M12 4v16m8-8H4',
  },
]

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

// 關聯任務（獨立管理，不在 TaskForm 中）
const dependsOnTaskIds = ref<string[]>([])

// 是否顯示指派欄位
const showAssignee = computed(() => sourceType.value === 'ASSIGNED')

// 是否可提交
const canSubmit = computed(() => {
  if (!form.title.trim()) return false
  if (!form.projectId) return false
  if (sourceType.value === 'ASSIGNED' && !form.assigneeId) return false
  return true
})

// 提交表單
const handleSubmit = async (): Promise<void> => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const result = await taskStore.createTask({
      title: form.title,
      projectId: form.projectId,
      description: form.description,
      functionTags: form.functionTags,
      startDate: form.startDate,
      dueDate: form.dueDate,
      sourceType: sourceType.value,
      assigneeId: sourceType.value === 'ASSIGNED' ? form.assigneeId : undefined,
      department: form.department || undefined,
      createdBy: authStore.user
        ? {
            id: authStore.user.id,
            name: authStore.user.name,
            userRole: authStore.user.role,
          }
        : undefined,
      dependsOnTaskIds: dependsOnTaskIds.value.length > 0 ? dependsOnTaskIds.value : undefined,
    })

    if (result.success) {
      showSuccess(`任務「${form.title}」已建立`)
      router.push('/task-pool')
    } else {
      showError(result.error?.message || '建立任務失敗')
    }
  } finally {
    isSubmitting.value = false
  }
}

// 取消建立
const handleCancel = (): void => {
  router.push('/task-pool')
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- 頁面標題 -->
    <div class="flex items-center gap-4">
      <button
        class="p-2 rounded-lg transition-colors cursor-pointer"
        style="background-color: var(--bg-tertiary)"
        aria-label="返回"
        @click="handleCancel"
      >
        <svg
          class="w-5 h-5"
          style="color: var(--text-secondary)"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <div>
        <h1 class="text-2xl font-bold" style="color: var(--text-primary)">建立任務</h1>
        <p class="text-sm mt-1" style="color: var(--text-secondary)">
          建立者: {{ authStore.user?.name }} ({{
            roleLabels[authStore.user?.role ?? ''] || authStore.user?.role
          }})
        </p>
      </div>
    </div>

    <!-- 任務類型選擇 -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">選擇任務類型</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          v-for="option in sourceTypeOptions"
          :key="option.value"
          :class="[
            'p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer',
            sourceType === option.value
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
              : 'border-transparent hover:border-[var(--border-secondary)]',
          ]"
          style="background-color: var(--bg-tertiary)"
          @click="sourceType = option.value"
        >
          <div class="flex items-center gap-3 mb-2">
            <div
              :class="[
                'p-2 rounded-lg',
                sourceType === option.value ? 'bg-[var(--accent-primary)]/10' : '',
              ]"
              :style="{
                color:
                  sourceType === option.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="option.icon"
                />
              </svg>
            </div>
            <span
              class="font-semibold"
              :style="{
                color:
                  sourceType === option.value ? 'var(--accent-primary)' : 'var(--text-primary)',
              }"
            >
              {{ option.label }}
            </span>
          </div>
          <p class="text-sm" style="color: var(--text-secondary)">
            {{ option.description }}
          </p>
        </button>
      </div>
    </div>

    <!-- 共用任務表單 -->
    <TaskForm
      :form="form"
      :projects="projectStore.projects"
      :departments="departmentStore.departments"
      :employees="employeeStore.employees"
      :show-assignee="showAssignee"
      assignee-label="指派給"
      :assignee-required="true"
      @update:function-tags="form.functionTags = $event"
      @update:collaborator-ids="form.collaboratorIds = $event"
    />

    <!-- 任務關聯 -->
    <div class="card p-6 space-y-5">
      <h2 class="text-lg font-semibold" style="color: var(--text-primary)">任務關聯</h2>
      <TaskRelationSelector v-model="dependsOnTaskIds" :all-tasks="taskStore.tasks" />
    </div>

    <!-- 操作按鈕 -->
    <div class="flex items-center justify-end gap-3">
      <button
        class="px-6 py-2.5 rounded-lg font-medium transition-colors cursor-pointer"
        style="background-color: var(--bg-tertiary); color: var(--text-secondary)"
        @click="handleCancel"
      >
        取消
      </button>
      <button
        :disabled="!canSubmit || isSubmitting"
        :class="[
          'px-6 py-2.5 rounded-lg font-medium transition-colors',
          canSubmit && !isSubmitting
            ? 'btn-primary cursor-pointer'
            : 'opacity-50 cursor-not-allowed',
        ]"
        @click="handleSubmit"
      >
        {{ isSubmitting ? '建立中...' : '建立任務' }}
      </button>
    </div>
  </div>
</template>
