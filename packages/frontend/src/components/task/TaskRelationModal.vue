<script setup lang="ts">
import Modal from '@/components/common/Modal.vue'
import TaskBasicInfo from './TaskBasicInfo.vue'
import TaskRelationList from './TaskRelationList.vue'
import { computed, ref, watch } from 'vue'
import type { Task } from 'shared/types'

// ============================================
// 任務關聯資訊 Modal
// Phase 1.1: 基本資訊顯示
// Phase 1.2: 關聯任務顯示與多層導航
// ============================================

interface Props {
  modelValue: boolean
  task: Task | null
  allTasks: Task[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// 導航堆疊（支援多層跳轉）
interface NavigationItem {
  task: Task
  title: string
}

const navigationStack = ref<NavigationItem[]>([])
const currentTask = ref<Task | null>(null)

// 當 Modal 打開時初始化導航堆疊
watch(() => props.modelValue, (isOpen: boolean) => {
  if (isOpen && props.task) {
    navigationStack.value = [{
      task: props.task,
      title: props.task.title
    }]
    currentTask.value = props.task
  } else {
    navigationStack.value = []
    currentTask.value = null
  }
})

// 計算關聯任務清單
const relatedTasks = computed((): Task[] => {
  if (!currentTask.value?.dependsOnTaskIds) return []

  return currentTask.value.dependsOnTaskIds
    .map((taskId: string) => props.allTasks.find((t: Task) => t.id === taskId))
    .filter((t: Task | undefined): t is Task => t !== undefined)
})

// 處理任務跳轉
const handleViewTask = (task: Task): void => {
  navigationStack.value.push({
    task,
    title: task.title
  })
  currentTask.value = task
}

// 麵包屑導航
const handleBreadcrumbClick = (index: number): void => {
  navigationStack.value = navigationStack.value.slice(0, index + 1)
  currentTask.value = navigationStack.value[index].task
}
</script>

<template>
  <Modal
    :model-value="modelValue"
    :title="currentTask?.title || '任務詳情'"
    size="xl"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="currentTask">
      <!-- 麵包屑導航 -->
      <nav
        v-if="navigationStack.length > 1"
        class="flex items-center gap-2 mb-4 pb-3 border-b border-metal-silver"
      >
        <button
          v-for="(item, index) in navigationStack"
          :key="index"
          type="button"
          class="flex items-center gap-2 text-sm transition-colors duration-150"
          :class="index === navigationStack.length - 1 ? 'text-carbon-black font-semibold' : 'text-cool-gray hover:text-samurai-red'"
          @click="handleBreadcrumbClick(index)"
        >
          <span>{{ item.title }}</span>
          <svg
            v-if="index < navigationStack.length - 1"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </nav>

      <!-- 任務基本資訊 -->
      <TaskBasicInfo :task="currentTask" />

      <!-- 關聯任務清單 -->
      <TaskRelationList
        :related-tasks="relatedTasks"
        @view-task="handleViewTask"
      />
    </div>
  </Modal>
</template>
