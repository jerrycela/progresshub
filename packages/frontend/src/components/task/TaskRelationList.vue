<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import TaskRelationCard from './TaskRelationCard.vue'
import type { Task } from 'shared/types'

// ============================================
// 關聯任務清單組件
// 顯示所有關聯任務，支援跳轉查看
// ============================================

interface Props {
  relatedTasks: Task[]
  label?: string
  emptyDescription?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: '關聯任務',
  emptyDescription: '此任務目前沒有前置任務依賴',
})

const emit = defineEmits<{
  viewTask: [task: Task]
}>()

// 關聯任務圖示 (連結圖示)
const linkIcon =
  'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
</script>

<template>
  <div class="mt-6">
    <!-- 標題列 -->
    <div class="flex items-center gap-2 mb-4">
      <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="linkIcon" />
      </svg>
      <h3 class="text-lg font-semibold text-primary">
        {{ props.label }} ({{ relatedTasks.length }})
      </h3>
    </div>

    <!-- 關聯任務清單 -->
    <div v-if="relatedTasks.length > 0" class="space-y-3">
      <TaskRelationCard
        v-for="task in relatedTasks"
        :key="task.id"
        :task="task"
        @view-detail="emit('viewTask', $event)"
      />
    </div>

    <!-- 空狀態 -->
    <EmptyState
      v-else
      :icon="linkIcon"
      :title="`無${props.label}`"
      :description="props.emptyDescription"
    />
  </div>
</template>
