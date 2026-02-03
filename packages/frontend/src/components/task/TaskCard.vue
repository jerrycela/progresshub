<script setup lang="ts">
import { computed } from 'vue'
import type { Task, Project } from 'shared/types'
import Card from '@/components/common/Card.vue'
import Badge from '@/components/common/Badge.vue'
import Button from '@/components/common/Button.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import { functionTypeLabels, taskStatusLabels } from '@/mocks/data'

// 任務卡片元件 - 顯示任務資訊與快速操作按鈕
interface Props {
  task: Task
  project?: Project
  showActions?: boolean
  showQuickReport?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true,
  showQuickReport: false,
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
          <h4 class="font-semibold text-gray-900 truncate">{{ task.title }}</h4>
          <p v-if="project" class="text-sm text-gray-500 mt-0.5">
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

      <!-- 截止日期 -->
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">截止日期</span>
        <span :class="[isOverdue ? 'text-red-600 font-medium' : 'text-gray-700']">
          {{ formatDate(task.dueDate) }}
          <span v-if="isOverdue" class="ml-1">(已逾期)</span>
        </span>
      </div>

      <!-- 快速回報按鈕（進度回報頁面使用） -->
      <div v-if="showQuickReport && canReport" class="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        <Button
          variant="primary"
          size="sm"
          @click.stop="emit('continue', task.id)"
        >
          🔄 繼續
        </Button>
        <Button
          variant="secondary"
          size="sm"
          @click.stop="emit('updateProgress', task.id)"
        >
          📝 更新
        </Button>
        <Button
          variant="warning"
          size="sm"
          @click.stop="emit('blocked', task.id)"
        >
          ⚠️ 卡關
        </Button>
        <Button
          variant="success"
          size="sm"
          @click.stop="emit('complete', task.id)"
        >
          ✅ 完成
        </Button>
      </div>

      <!-- 一般操作按鈕 -->
      <div v-else-if="showActions" class="flex gap-2 pt-2 border-t border-gray-100">
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
