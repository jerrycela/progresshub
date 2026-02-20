<script setup lang="ts">
import Badge from '@/components/common/Badge.vue'
import Avatar from '@/components/common/Avatar.vue'
import { computed } from 'vue'
import type { Task, User } from 'shared/types'
import { functionTypeLabels, taskStatusLabels } from '@/mocks/unified'
import { mockUsers } from '@/mocks/employees'

// ============================================
// 關聯任務卡片組件
// 顯示關聯任務的摘要資訊
// ============================================

interface Props {
  task: Task
}

const props = defineProps<Props>()

const emit = defineEmits<{
  viewDetail: [task: Task]
}>()

// 取得負責人資訊
const assignee = computed(() => {
  if (!props.task.assigneeId) return null
  return mockUsers.find((u: User) => u.id === props.task.assigneeId)
})

// 狀態標籤顏色
const statusColor = computed((): 'success' | 'warning' | 'info' | 'default' => {
  switch (props.task.status) {
    case 'DONE':
      return 'success'
    case 'IN_PROGRESS':
      return 'warning'
    case 'CLAIMED':
      return 'info'
    default:
      return 'default'
  }
})

// 職能標籤
const functionTags = computed(() => {
  return props.task.functionTags.map((tag: string) => functionTypeLabels[tag] || tag)
})

// 狀態標籤
const statusLabel = computed(() => {
  return taskStatusLabels[props.task.status] || props.task.status
})
</script>

<template>
  <div
    class="bg-surface border border-metal-silver rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
    @click="emit('viewDetail', task)"
  >
    <!-- 職能標籤與狀態 -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex gap-2">
        <Badge v-for="(tag, index) in functionTags" :key="index" variant="default">
          {{ tag }}
        </Badge>
      </div>
      <Badge :variant="statusColor">
        {{ statusLabel }}
      </Badge>
    </div>

    <!-- 任務標題 -->
    <h4 class="text-base font-semibold text-primary mb-2">
      {{ task.title }}
    </h4>

    <!-- 進度條 -->
    <div class="mb-3">
      <div class="flex items-center justify-between text-sm text-secondary mb-1">
        <span>進度</span>
        <span class="font-semibold">{{ task.progress }}%</span>
      </div>
      <div class="w-full bg-elevated rounded-full h-2">
        <div
          class="bg-samurai h-2 rounded-full transition-all duration-300"
          :style="{ width: `${task.progress}%` }"
        />
      </div>
    </div>

    <!-- 負責人與查看按鈕 -->
    <div class="flex items-center justify-between">
      <div v-if="assignee" class="flex items-center gap-2">
        <Avatar :src="assignee.avatar" :name="assignee.name" size="sm" />
        <span class="text-sm text-secondary">{{ assignee.name }}</span>
      </div>
      <div v-else class="text-sm text-muted">未指派</div>

      <button
        type="button"
        class="text-sm text-accent font-medium hover:text-accent-primary transition-colors duration-150"
        @click.stop="emit('viewDetail', task)"
      >
        查看詳細 →
      </button>
    </div>
  </div>
</template>
