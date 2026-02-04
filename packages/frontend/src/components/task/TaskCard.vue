<script setup lang="ts">
import { computed } from 'vue'
import type { Task, Project, ProgressLog } from 'shared/types'
import Card from '@/components/common/Card.vue'
import Badge from '@/components/common/Badge.vue'
import Button from '@/components/common/Button.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import { functionTypeLabels, taskStatusLabels } from '@/mocks/data'

// 任務卡片元件 - 顯示任務資訊與快速操作按鈕
// 會議改進：顯示逾期天數、暫停原因、最近備註
interface Props {
  task: Task & {
    pauseReason?: string
    pauseNote?: string
  }
  project?: Project
  showActions?: boolean
  showQuickReport?: boolean
  latestNote?: string  // 最近一筆備註
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true,
  showQuickReport: false,
  latestNote: '',
})

const emit = defineEmits<{
  claim: [taskId: string]
  unclaim: [taskId: string]
  continue: [taskId: string]
  updateProgress: [taskId: string]
  blocked: [taskId: string]
  complete: [taskId: string]
  click: [task: Task]
}>()

// 狀態徽章樣式
const statusBadgeVariant = computed(() => {
  const variants: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    UNCLAIMED: 'default',
    CLAIMED: 'info',
    IN_PROGRESS: 'primary',
    PAUSED: 'warning',
    DONE: 'success',
    BLOCKED: 'danger',
  }
  return variants[props.task.status] || 'default'
})

// 職能標籤樣式
const functionBadgeVariant = (funcType: string) => {
  const variants: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    PLANNING: 'info',
    PROGRAMMING: 'primary',
    ART: 'warning',
    ANIMATION: 'success',
    SOUND: 'default',
    VFX: 'danger',
    COMBAT: 'warning',
  }
  return variants[funcType] || 'default'
}

// 格式化日期
const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
  })
}

// 是否逾期
const isOverdue = computed(() => {
  if (!props.task.dueDate || props.task.status === 'DONE') return false
  return new Date(props.task.dueDate) < new Date()
})

// 逾期天數
const overdueDays = computed(() => {
  if (!isOverdue.value || !props.task.dueDate) return 0
  const due = new Date(props.task.dueDate)
  const now = new Date()
  const diffTime = now.getTime() - due.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

// 是否暫停中
const isPaused = computed(() => props.task.status === 'PAUSED')

// 暫停原因標籤
const pauseReasonLabel = computed(() => {
  const reasons: Record<string, string> = {
    OTHER_PROJECT: '被插件至其他專案',
    WAITING_RESOURCE: '等待資源',
    WAITING_TASK: '等待其他任務',
    OTHER: '其他原因',
  }
  return props.task.pauseReason ? reasons[props.task.pauseReason] || props.task.pauseReason : ''
})

// 可否認領
const canClaim = computed(() => props.task.status === 'UNCLAIMED')
const canUnclaim = computed(() => ['CLAIMED', 'IN_PROGRESS'].includes(props.task.status))
const canReport = computed(() => ['IN_PROGRESS', 'CLAIMED'].includes(props.task.status))
</script>

<template>
  <Card hoverable class="cursor-pointer" @click="emit('click', task)">
    <div class="space-y-4">
      <!-- 頂部：標題與狀態 -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <h4 class="font-semibold truncate" style="color: var(--text-primary);">{{ task.title }}</h4>
          <p v-if="project" class="text-sm mt-0.5" style="color: var(--text-tertiary);">
            {{ project.name }}
          </p>
        </div>
        <Badge :variant="statusBadgeVariant" size="sm" dot>
          {{ taskStatusLabels[task.status] }}
        </Badge>
      </div>

      <!-- 職能標籤 -->
      <div class="flex flex-wrap gap-1.5">
        <Badge
          v-for="func in task.functionTags"
          :key="func"
          :variant="functionBadgeVariant(func)"
          size="sm"
        >
          {{ functionTypeLabels[func] }}
        </Badge>
      </div>

      <!-- 進度條 -->
      <ProgressBar :value="task.progress" size="sm" />

      <!-- 截止日期（改進：顯示完整日期和逾期天數） -->
      <div class="flex items-center justify-between text-sm">
        <span style="color: var(--text-tertiary);">截止日期</span>
        <span :class="[isOverdue ? 'text-danger font-medium' : '']" :style="isOverdue ? '' : 'color: var(--text-secondary);'">
          {{ formatDate(task.dueDate) }}
          <span v-if="isOverdue" class="ml-1">(逾期 {{ overdueDays }} 天)</span>
        </span>
      </div>

      <!-- 暫停原因（改進：在卡片上直接顯示） -->
      <div v-if="isPaused && (pauseReasonLabel || task.pauseNote)" class="p-2 rounded-lg text-sm bg-amber-500/10 border border-amber-500/30">
        <div class="flex items-center gap-1 text-amber-600 font-medium">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>{{ pauseReasonLabel || '暫停中' }}</span>
        </div>
        <p v-if="task.pauseNote" class="mt-1 text-xs" style="color: var(--text-secondary);">
          {{ task.pauseNote }}
        </p>
      </div>

      <!-- 最近備註預覽（改進：直接在卡片上顯示） -->
      <div v-if="latestNote" class="p-2 rounded-lg text-sm" style="background-color: var(--bg-tertiary);">
        <div class="flex items-center gap-1 mb-1" style="color: var(--text-muted);">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <span class="text-xs">最近備註</span>
        </div>
        <p class="text-xs line-clamp-2" style="color: var(--text-secondary);">
          {{ latestNote }}
        </p>
      </div>

      <!-- 快速回報按鈕（進度回報頁面使用） -->
      <div v-if="showQuickReport && canReport" class="flex flex-wrap gap-2 pt-2 border-t" style="border-color: var(--border-primary);">
        <Button variant="primary" size="sm" @click.stop="emit('continue', task.id)">
          繼續
        </Button>
        <Button variant="secondary" size="sm" @click.stop="emit('updateProgress', task.id)">
          更新
        </Button>
        <Button variant="warning" size="sm" @click.stop="emit('blocked', task.id)">
          卡關
        </Button>
        <Button variant="success" size="sm" @click.stop="emit('complete', task.id)">
          完成
        </Button>
      </div>

      <!-- 一般操作按鈕 -->
      <div v-else-if="showActions" class="flex gap-2 pt-2 border-t" style="border-color: var(--border-primary);">
        <Button
          v-if="canClaim"
          variant="primary"
          size="sm"
          @click.stop="emit('claim', task.id)"
        >
          認領任務
        </Button>
        <Button
          v-if="canUnclaim"
          variant="ghost"
          size="sm"
          @click.stop="emit('unclaim', task.id)"
        >
          放棄認領
        </Button>
      </div>
    </div>
  </Card>
</template>
