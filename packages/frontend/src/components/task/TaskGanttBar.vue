<script setup lang="ts">
import type { Task } from 'shared/types'

// ============================================
// 甘特條組件 - 可點擊的任務條
// Phase 1.1: 基本顯示與點擊功能
// ============================================

interface Props {
  task: Task
  position: { left: number; width: number }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: [task: Task]
}>()

const handleClick = () => {
  emit('click', props.task)
}

// 根據狀態決定樣式
const getStatusClass = (status: Task['status']) => {
  const classes: Record<Task['status'], string> = {
    UNCLAIMED: 'bg-ink-muted/30',
    CLAIMED: 'bg-info/60',
    IN_PROGRESS: 'bg-samurai',
    PAUSED: 'bg-gradient-to-r from-amber-500/40 via-amber-400/20 to-amber-500/40 bg-[length:10px_100%]',
    DONE: 'bg-success',
    BLOCKED: 'bg-danger',
  }
  return classes[status] || 'bg-ink-muted/30'
}
</script>

<template>
  <div
    :class="[
      'absolute h-full rounded-lg transition-all duration-200 cursor-pointer',
      'hover:ring-2 hover:ring-samurai/50 hover:shadow-lg',
      getStatusClass(task.status),
    ]"
    :style="{
      left: `${position.left}%`,
      width: `${position.width}%`,
    }"
    :title="`${task.title} - ${task.progress}%`"
    @click="handleClick"
  >
    <div class="flex items-center justify-center h-full px-2 gap-1">
      <!-- 暫停圖示 -->
      <svg
        v-if="task.status === 'PAUSED'"
        class="w-3 h-3 text-amber-600"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fill-rule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
          clip-rule="evenodd"
        />
      </svg>
      <!-- 進度百分比 -->
      <span
        :class="[
          'text-xs font-medium truncate',
          task.status === 'PAUSED' ? 'text-amber-700' : 'text-white'
        ]"
      >
        {{ task.status === 'PAUSED' ? '暫停中' : `${task.progress}%` }}
      </span>
    </div>
  </div>
</template>
