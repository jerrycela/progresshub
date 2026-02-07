<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/projects'
import { useDepartmentStore } from '@/stores/departments'
import { useEmployeeStore } from '@/stores/employees'
import type { MockEmployee } from 'shared/types'
import type { Department, FunctionType, UserRole } from 'shared/types'
import { useToast } from '@/composables/useToast'

// ============================================
// 任務建立頁面 - 建立任務池任務、指派任務、自建任務
// ============================================

const { showSuccess } = useToast()

const router = useRouter()

const projectStore = useProjectStore()
const departmentStore = useDepartmentStore()
const employeeStore = useEmployeeStore()

// 任務來源類型
type SourceType = 'POOL' | 'ASSIGNED' | 'SELF_CREATED'

// 表單狀態
const sourceType = ref<SourceType>('POOL')
const title = ref('')
const description = ref('')
const projectId = ref('')
const department = ref<Department | ''>('')
const assigneeId = ref('')
const collaboratorIds = ref<string[]>([])
const startDate = ref('')
const dueDate = ref('')
const functionTags = ref<FunctionType[]>([])

// 模擬當前登入者（PM 角色可建立任務池任務）
const currentUser = {
  id: 'emp-6',
  name: '黃美玲',
  userRole: 'PM' as UserRole,
}

// 來源類型選項
const sourceTypeOptions: { value: SourceType; label: string; description: string; icon: string }[] = [
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

// 根據部門篩選員工
const filteredEmployees = computed(() => {
  if (!department.value) return employeeStore.employees
  return employeeStore.employees.filter((emp: MockEmployee) => emp.department === department.value)
})

// 是否顯示指派欄位
const showAssignee = computed(() => sourceType.value === 'ASSIGNED')

// 是否可提交
const canSubmit = computed(() => {
  if (!title.value.trim()) return false
  if (!projectId.value) return false
  if (sourceType.value === 'ASSIGNED' && !assigneeId.value) return false
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
    sourceType: sourceType.value,
    title: title.value,
    description: description.value,
    projectId: projectId.value,
    department: department.value,
    assigneeId: sourceType.value === 'ASSIGNED' ? assigneeId.value : undefined,
    collaboratorIds: collaboratorIds.value,
    startDate: startDate.value,
    dueDate: dueDate.value,
    functionTags: functionTags.value,
    createdBy: currentUser,
  }
  void _taskData // 避免 TS 未使用警告

  showSuccess(`任務「${title.value}」已建立`)
  router.push('/task-pool')
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
        style="background-color: var(--bg-tertiary);"
        @click="handleCancel"
      >
        <svg class="w-5 h-5" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div>
        <h1 class="text-2xl font-bold" style="color: var(--text-primary);">建立任務</h1>
        <p class="text-sm mt-1" style="color: var(--text-secondary);">
          建立者: {{ currentUser.name }} ({{ currentUser.userRole }})
        </p>
      </div>
    </div>

    <!-- 任務類型選擇 -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">選擇任務類型</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          v-for="option in sourceTypeOptions"
          :key="option.value"
          :class="[
            'p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer',
            sourceType === option.value
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
              : 'border-transparent hover:border-[var(--border-secondary)]'
          ]"
          style="background-color: var(--bg-tertiary);"
          @click="sourceType = option.value"
        >
          <div class="flex items-center gap-3 mb-2">
            <div
              :class="[
                'p-2 rounded-lg',
                sourceType === option.value ? 'bg-[var(--accent-primary)]/10' : ''
              ]"
              :style="{ color: sourceType === option.value ? 'var(--accent-primary)' : 'var(--text-secondary)' }"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="option.icon" />
              </svg>
            </div>
            <span
              class="font-semibold"
              :style="{ color: sourceType === option.value ? 'var(--accent-primary)' : 'var(--text-primary)' }"
            >
              {{ option.label }}
            </span>
          </div>
          <p class="text-sm" style="color: var(--text-secondary);">
            {{ option.description }}
          </p>
        </button>
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
          <option v-for="project in projectStore.projects" :key="project.id" :value="project.id">
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
          <option v-for="dept in departmentStore.departments" :key="dept.id" :value="dept.id">
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

    <!-- 指派設定（僅指派任務顯示） -->
    <div v-if="showAssignee" class="card p-6 space-y-5">
      <h2 class="text-lg font-semibold" style="color: var(--text-primary);">指派設定</h2>

      <!-- 負責人 -->
      <div>
        <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
          指派給 <span style="color: var(--accent-primary);">*</span>
        </label>
        <select v-model="assigneeId" class="input-field w-full cursor-pointer">
          <option value="">請選擇負責人</option>
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
        建立任務
      </button>
    </div>
  </div>
</template>
