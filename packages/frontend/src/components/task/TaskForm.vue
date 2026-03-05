<script setup lang="ts">
import { computed } from 'vue'
import type { FunctionType, MockEmployee } from 'shared/types'
import { DepartmentLabels } from 'shared/types'
import SearchableSelect from '@/components/common/SearchableSelect.vue'
import type { SearchableOption } from '@/components/common/SearchableSelect.vue'
import MultiSearchSelect from '@/components/common/MultiSearchSelect.vue'

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

// NOTE: form prop 為 reactive 物件，父元件透過 reactive() 建立後傳入。
// 子元件的 v-model 直接修改此物件的屬性是有意為之的雙向綁定模式。
// 這是 Vue 3 中 reactive 物件作為 prop 的已知慣例，避免為每個欄位 emit update 事件。
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

const filteredEmployeeOptions = computed<SearchableOption[]>(() =>
  filteredEmployees.value.map(e => ({
    value: e.id,
    label: e.name,
    sublabel: DepartmentLabels[e.department] || e.department,
  })),
)

const toggleFunctionTag = (tag: FunctionType): void => {
  const current = props.form.functionTags
  const newTags = current.includes(tag)
    ? current.filter((t: FunctionType) => t !== tag)
    : [...current, tag]
  emit('update:functionTags', newTags)
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
      <input v-model="form.title" type="text" placeholder="輸入任務標題" class="input w-full" />
    </div>

    <div>
      <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
        任務描述
      </label>
      <textarea
        v-model="form.description"
        rows="4"
        placeholder="輸入任務描述..."
        class="input w-full resize-none"
      ></textarea>
    </div>

    <div>
      <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
        所屬專案 <span style="color: var(--accent-primary)">*</span>
      </label>
      <select v-model="form.projectId" class="input w-full cursor-pointer">
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
      <select v-model="form.department" class="input w-full cursor-pointer">
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
        <input v-model="form.startDate" type="date" class="input w-full cursor-pointer" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
          截止日期
        </label>
        <input v-model="form.dueDate" type="date" class="input w-full cursor-pointer" />
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
      <SearchableSelect
        :model-value="form.assigneeId"
        :options="filteredEmployeeOptions"
        :placeholder="assigneeRequired ? '搜尋負責人...' : '尚未指派'"
        :required="assigneeRequired"
        @update:model-value="form.assigneeId = $event"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
        協作者（可多選）
      </label>
      <MultiSearchSelect
        :model-value="form.collaboratorIds"
        :options="filteredEmployeeOptions"
        placeholder="搜尋協作者..."
        @update:model-value="emit('update:collaboratorIds', $event)"
      />
    </div>
  </div>
</template>
