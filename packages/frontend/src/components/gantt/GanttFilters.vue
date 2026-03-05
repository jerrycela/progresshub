<script setup lang="ts">
import Card from '@/components/common/Card.vue'
import Select from '@/components/common/Select.vue'
import SearchableSelect from '@/components/common/SearchableSelect.vue'
import type { SearchableOption } from '@/components/common/SearchableSelect.vue'
import Badge from '@/components/common/Badge.vue'
import type { FunctionType } from 'shared/types'

interface GanttFilterPreset {
  name: string
  filters: {
    selectedProject: string
    selectedFunction: string
    selectedEmployee: string
    selectedStatus: string
    showOverdueOnly: boolean
    groupByProject: boolean
  }
}

defineProps<{
  projectOptions: Array<{ value: string; label: string }>
  functionOptions: Array<{ value: string; label: string }>
  employeeOptions: SearchableOption[]
  statusOptions: Array<{ value: string; label: string }>
  taskStats: {
    total: number
    overdue: number
    inProgress: number
    completed: number
    paused: number
  }
  tasksOutsideRange: { before: number; after: number; total: number }
  hasFilters: boolean
  allProjectsCollapsed: boolean
  savedPresets: GanttFilterPreset[]
}>()

const selectedProject = defineModel<string>('selectedProject', { required: true })
const selectedFunction = defineModel<FunctionType | 'ALL'>('selectedFunction', { required: true })
const selectedEmployee = defineModel<string>('selectedEmployee', { required: true })
const selectedStatus = defineModel<string>('selectedStatus', { required: true })
const showOverdueOnly = defineModel<boolean>('showOverdueOnly', { required: true })
const groupByProject = defineModel<boolean>('groupByProject', { required: true })

const emit = defineEmits<{
  clearFilters: []
  expandAll: []
  collapseAll: []
  savePreset: [name: string]
  applyPreset: [preset: GanttFilterPreset]
  deletePreset: [index: number]
}>()

const handleSavePreset = (): void => {
  const name = window.prompt('請輸入篩選條件名稱：')
  if (name?.trim()) {
    emit('savePreset', name.trim())
  }
}
</script>

<template>
  <Card>
    <!-- 篩選器 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <Select v-model="selectedProject" label="專案" :options="projectOptions" />
      <Select v-model="selectedFunction" label="職能" :options="functionOptions" />
      <SearchableSelect v-model="selectedEmployee" :options="employeeOptions" label="員工" />
      <Select v-model="selectedStatus" label="狀態" :options="statusOptions" />
    </div>

    <!-- 快速篩選 -->
    <div
      class="flex flex-wrap items-center gap-2 pt-3 border-t"
      style="border-color: var(--border-primary)"
    >
      <button
        :class="[
          'px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border',
          showOverdueOnly
            ? 'bg-danger/10 text-danger border-danger/30'
            : 'border-transparent hover:bg-danger/5 text-danger/60',
        ]"
        @click="showOverdueOnly = !showOverdueOnly"
      >
        逾期任務
        <Badge v-if="taskStats.overdue > 0" variant="danger" size="sm" class="ml-1">
          {{ taskStats.overdue }}
        </Badge>
      </button>

      <button
        :class="[
          'px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border',
          groupByProject
            ? 'bg-samurai/10 text-samurai border-samurai/30'
            : 'border-transparent hover:bg-samurai/5',
        ]"
        style="color: var(--text-secondary)"
        @click="groupByProject = !groupByProject"
      >
        按專案分組
      </button>

      <button
        v-if="groupByProject"
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border border-transparent hover-bg"
        style="color: var(--text-secondary)"
        @click="allProjectsCollapsed ? emit('expandAll') : emit('collapseAll')"
      >
        {{ allProjectsCollapsed ? '全部展開' : '全部摺疊' }}
      </button>

      <button
        v-if="hasFilters"
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border border-transparent hover-bg"
        style="color: var(--text-tertiary)"
        @click="emit('clearFilters')"
      >
        清除篩選
      </button>
    </div>

    <!-- 篩選條件預設 -->
    <div
      class="flex flex-wrap items-center gap-2 pt-3 border-t mt-3"
      style="border-color: var(--border-primary)"
    >
      <span class="text-xs font-medium" style="color: var(--text-tertiary)">預設條件</span>
      <button
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border border-dashed hover-bg"
        style="color: var(--text-secondary); border-color: var(--border-primary)"
        @click="handleSavePreset"
      >
        + 儲存目前條件
      </button>
      <button
        v-for="(preset, index) in savedPresets"
        :key="index"
        class="group px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border hover-bg flex items-center gap-1"
        style="color: var(--text-secondary); border-color: var(--border-primary)"
        @click="emit('applyPreset', preset)"
      >
        {{ preset.name }}
        <span
          class="opacity-0 group-hover:opacity-100 ml-1 text-danger hover:text-danger/80 transition-opacity"
          role="button"
          aria-label="刪除預設"
          @click.stop="emit('deletePreset', index)"
        >
          &times;
        </span>
      </button>
    </div>

    <!-- 員工視角提示 -->
    <div v-if="selectedEmployee" class="mt-3 text-sm" style="color: var(--text-info)">
      目前為員工視角篩選
    </div>

    <!-- 逾期警告 -->
    <div
      v-if="taskStats.overdue > 0 && !showOverdueOnly"
      class="mt-3 p-3 bg-danger/5 rounded-lg border border-danger/20"
    >
      <div class="flex items-center gap-2 text-sm text-danger">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span
          >有 <strong>{{ taskStats.overdue }}</strong> 個任務已逾期</span
        >
      </div>
    </div>

    <!-- 超出範圍警告 -->
    <div
      v-if="tasksOutsideRange.total > 0"
      class="mt-3 p-3 rounded-lg border"
      style="background-color: var(--bg-tertiary); border-color: var(--border-primary)"
    >
      <div class="flex items-center gap-2 text-sm" style="color: var(--text-secondary)">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          {{ tasksOutsideRange.total }} 個任務超出目前時間範圍
          <span v-if="tasksOutsideRange.before > 0"
            >（{{ tasksOutsideRange.before }} 個在更早期間）</span
          >
          <span v-if="tasksOutsideRange.after > 0"
            >（{{ tasksOutsideRange.after }} 個在更晚期間）</span
          >
        </span>
      </div>
    </div>

    <!-- 快速統計 -->
    <div class="flex flex-wrap items-center gap-4 mt-3 text-sm" style="color: var(--text-tertiary)">
      <span
        >共 <strong style="color: var(--text-primary)">{{ taskStats.total }}</strong> 任務</span
      >
      <span v-if="taskStats.overdue > 0" class="text-danger">
        逾期 <strong>{{ taskStats.overdue }}</strong>
      </span>
      <span class="text-samurai">
        進行中 <strong>{{ taskStats.inProgress }}</strong>
      </span>
      <span class="text-success">
        已完成 <strong>{{ taskStats.completed }}</strong>
      </span>
      <span v-if="taskStats.paused > 0" style="color: var(--text-secondary)">
        暫停 <strong>{{ taskStats.paused }}</strong>
      </span>
    </div>
  </Card>
</template>
