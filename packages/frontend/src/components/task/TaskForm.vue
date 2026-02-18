<script setup lang="ts">
import { computed } from 'vue'
import type { FunctionType, MockEmployee } from 'shared/types'

export interface TaskFormData {
  title: string
  description: string
  projectId: string
  department: string
  assigneeId: string
  collaboratorIds: string[]
  startDate: string
  dueDate: string
  functionTags: FunctionType[]
}

const props = withDefaults(
  defineProps<{
    form: TaskFormData
    projects: Array<{ id: string; name: string }>
    departments: Array<{ id: string; name: string }>
    employees: MockEmployee[]
    showAssignee?: boolean
    assigneeLabel?: string
    assigneeRequired?: boolean
  }>(),
  {
    showAssignee: true,
    assigneeLabel: '負責人',
    assigneeRequired: false,
  },
)

const emit = defineEmits<{
  (e: 'update:functionTags', tags: FunctionType[]): void
  (e: 'update:collaboratorIds', ids: string[]): void
}>()

const functionTagOptions: { value: FunctionType; label: string }[] = [
  { value: 'ART', label: '美術' },
  { value: 'PROGRAMMING', label: '程式' },
  { value: 'PLANNING', label: '企劃' },
  { value: 'ANIMATION', label: '動態' },
  { value: 'SOUND', label: '音效' },
  { value: 'VFX', label: '特效' },
  { value: 'COMBAT', label: '戰鬥' },
]

const filteredEmployees = computed(() => {
  if (!props.form.department) return props.employees
  return props.employees.filter((emp: MockEmployee) => emp.department === props.form.department)
})

const toggleFunctionTag = (tag: FunctionType): void => {
  const current = props.form.functionTags
  const newTags = current.includes(tag)
    ? current.filter((t: FunctionType) => t !== tag)
    : [...current, tag]
  emit('update:functionTags', newTags)
}

const toggleCollaborator = (empId: string): void => {
  const current = props.form.collaboratorIds
  const newIds = current.includes(empId)
    ? current.filter((id: string) => id !== empId)
    : [...current, empId]
  emit('update:collaboratorIds', newIds)
}
</script>

<template>
  <!-- 任務基本資訊 -->
  <div class="card p-6 space-y-5">
    <h2 class="text-lg font-semibold" style="color: var(--text-primary)">任務資訊</h2>

    <div>
      <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
        任務標題 <span style="color: var(--accent-primary)">*</span>
      </label>
      <input
        v-model="form.title"
        type="text"
        placeholder="輸入任務標題"
        class="input-field w-full"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
        任務描述
      </label>
      <textarea
        v-model="form.description"
        rows="4"
        placeholder="輸入任務描述..."
        class="input-field w-full resize-none"
      ></textarea>
    </div>

    <div>
      <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
        所屬專案 <span style="color: var(--accent-primary)">*</span>
      </label>
      <select v-model="form.projectId" class="input-field w-full cursor-pointer">
        <option value="">請選擇專案</option>
        <option v-for="project in projects" :key="project.id" :value="project.id">
          {{ project.name }}
        </option>
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
        相關部門
      </label>
      <select v-model="form.department" class="input-field w-full cursor-pointer">
        <option value="">請選擇部門</option>
        <option v-for="dept in departments" :key="dept.id" :value="dept.id">
          {{ dept.name }}
        </option>
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
        職能標籤
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in functionTagOptions"
          :key="tag.value"
          :class="[
            'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer',
            form.functionTags.includes(tag.value)
              ? 'bg-[var(--accent-primary)]'
              : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80',
          ]"
          :style="{
            color: form.functionTags.includes(tag.value) ? '#FFFFFF' : 'var(--text-secondary)',
          }"
          @click="toggleFunctionTag(tag.value)"
        >
          {{ tag.label }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
          開始日期
        </label>
        <input v-model="form.startDate" type="date" class="input-field w-full cursor-pointer" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
          截止日期
        </label>
        <input v-model="form.dueDate" type="date" class="input-field w-full cursor-pointer" />
      </div>
    </div>
  </div>

  <!-- 指派設定 -->
  <div v-if="showAssignee" class="card p-6 space-y-5">
    <h2 class="text-lg font-semibold" style="color: var(--text-primary)">指派設定</h2>

    <div>
      <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
        {{ assigneeLabel }}
        <span v-if="assigneeRequired" style="color: var(--accent-primary)">*</span>
      </label>
      <select v-model="form.assigneeId" class="input-field w-full cursor-pointer">
        <option value="">{{ assigneeRequired ? '請選擇負責人' : '尚未指派' }}</option>
        <option v-for="emp in filteredEmployees" :key="emp.id" :value="emp.id">
          {{ emp.name }} ({{ emp.department }})
        </option>
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
        協作者（可多選）
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="emp in filteredEmployees"
          :key="emp.id"
          :class="[
            'px-3 py-1.5 rounded-full text-sm transition-all duration-200 cursor-pointer flex items-center gap-2',
            form.collaboratorIds.includes(emp.id)
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80',
          ]"
          :style="{
            color: form.collaboratorIds.includes(emp.id) ? undefined : 'var(--text-secondary)',
          }"
          @click="toggleCollaborator(emp.id)"
        >
          <svg
            v-if="form.collaboratorIds.includes(emp.id)"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          {{ emp.name }}
        </button>
      </div>
    </div>
  </div>
</template>
