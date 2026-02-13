<script setup lang="ts">
import { useProject } from '@/composables/useProject'
import { useFormatDate } from '@/composables/useFormatDate'
import { mockEmployees } from '@/mocks/taskPool'
import Badge from '@/components/common/Badge.vue'
import Avatar from '@/components/common/Avatar.vue'
import type { Task, TaskStatus } from 'shared/types'

// ============================================
// 任務基本資訊組件
// Phase 1.1: 顯示任務摘要資訊
// ============================================

interface Props {
  task: Task
}

const props = defineProps<Props>()

const { getProjectName } = useProject()
const { formatShort } = useFormatDate()

// 根據狀態決定 Badge 樣式
const getStatusBadgeVariant = (status: TaskStatus) => {
  const variants: Record<TaskStatus, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'paused'> = {
    UNCLAIMED: 'default',
    CLAIMED: 'info',
    IN_PROGRESS: 'primary',
    PAUSED: 'paused',
    DONE: 'success',
    BLOCKED: 'danger',
  }
  return variants[status]
}

// 狀態顯示名稱
const statusLabels: Record<TaskStatus, string> = {
  UNCLAIMED: '待認領',
  CLAIMED: '已認領',
  IN_PROGRESS: '進行中',
  PAUSED: '暫停中',
  DONE: '已完成',
  BLOCKED: '卡關',
}

// 找出負責人資訊
const assignee = props.task.assigneeId
  ? mockEmployees.find((emp) => emp.id === props.task.assigneeId)
  : null
</script>

<template>
  <div class="space-y-4">
    <!-- 標題 -->
    <div>
      <h2 class="text-lg font-semibold" style="color: var(--text-primary);">
        {{ task.title }}
      </h2>
    </div>

    <!-- 狀態與專案 -->
    <div class="flex items-center gap-3 flex-wrap">
      <Badge :variant="getStatusBadgeVariant(task.status)" :dot="true">
        {{ statusLabels[task.status] }}
      </Badge>
      <span class="text-sm" style="color: var(--text-secondary);">
        {{ getProjectName(task.projectId) }}
      </span>
    </div>

    <!-- 負責人 -->
    <div v-if="assignee" class="flex items-center gap-3">
      <span class="text-sm" style="color: var(--text-tertiary);">負責人：</span>
      <div class="flex items-center gap-2">
        <Avatar :src="assignee.avatar" :name="assignee.name" size="sm" />
        <span class="text-sm font-medium" style="color: var(--text-primary);">
          {{ assignee.name }}
        </span>
      </div>
    </div>
    <div v-else class="flex items-center gap-3">
      <span class="text-sm" style="color: var(--text-tertiary);">負責人：</span>
      <span class="text-sm" style="color: var(--text-muted);">尚未分配</span>
    </div>

    <!-- 日期範圍 -->
    <div v-if="task.startDate && task.dueDate" class="flex items-center gap-3">
      <span class="text-sm" style="color: var(--text-tertiary);">日期：</span>
      <span class="text-sm" style="color: var(--text-secondary);">
        {{ formatShort(task.startDate) }} - {{ formatShort(task.dueDate) }}
      </span>
    </div>

    <!-- 進度 -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm" style="color: var(--text-tertiary);">進度：</span>
        <span class="text-sm font-medium" style="color: var(--text-primary);">
          {{ task.progress }}%
        </span>
      </div>
      <div class="w-full h-2 rounded-full" style="background-color: var(--bg-tertiary);">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="getStatusBadgeVariant(task.status) === 'success' ? 'bg-success' : 'bg-samurai'"
          :style="{ width: `${task.progress}%` }"
        />
      </div>
    </div>

    <!-- 暫停說明 -->
    <div
      v-if="task.status === 'PAUSED' && (task.pauseReason || task.pauseNote)"
      class="p-3 rounded-lg border"
      style="background-color: var(--bg-secondary); border-color: var(--border-primary);"
    >
      <p class="text-sm font-medium mb-1" style="color: var(--text-primary);">暫停原因</p>
      <p v-if="task.pauseReason" class="text-sm" style="color: var(--text-secondary);">
        {{ task.pauseReason }}
      </p>
      <p v-if="task.pauseNote" class="text-sm mt-1" style="color: var(--text-tertiary);">
        {{ task.pauseNote }}
      </p>
    </div>
  </div>
</template>
