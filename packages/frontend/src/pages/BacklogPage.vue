<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useAuthStore } from '@/stores/auth'
import { mockProjects, functionTypeLabels } from '@/mocks/data'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import { TaskCard } from '@/components/task'
import type { FunctionType, Task } from 'shared/types'

// 需求池頁面 - 待認領任務列表
const taskStore = useTaskStore()
const authStore = useAuthStore()

// 篩選條件
const selectedFunction = ref<FunctionType | 'ALL'>('ALL')
const selectedProject = ref<string>('ALL')

// 待認領任務
const backlogTasks = computed(() => {
  let tasks = taskStore.backlogTasks as Task[]

  // 職能篩選
  if (selectedFunction.value !== 'ALL') {
    tasks = tasks.filter((t: Task) => t.functionTags.includes(selectedFunction.value as FunctionType))
  }

  // 專案篩選
  if (selectedProject.value !== 'ALL') {
    tasks = tasks.filter((t: Task) => t.projectId === selectedProject.value)
  }

  return tasks
})

// 取得專案
const getProject = (projectId: string) =>
  mockProjects.find(p => p.id === projectId)

// 認領確認對話框
const showClaimModal = ref(false)
const taskToClaim = ref<Task | null>(null)
const isClaimLoading = ref(false)

const openClaimModal = (task: Task) => {
  taskToClaim.value = task
  showClaimModal.value = true
}

const confirmClaim = async () => {
  if (!taskToClaim.value || !authStore.user) return

  isClaimLoading.value = true
  try {
    await taskStore.claimTask(taskToClaim.value.id, authStore.user.id)
    showClaimModal.value = false
    taskToClaim.value = null
  } finally {
    isClaimLoading.value = false
  }
}

// 職能選項
const functionOptions = [
  { value: 'ALL', label: '全部職能' },
  { value: 'PLANNING', label: '企劃' },
  { value: 'PROGRAMMING', label: '程式' },
  { value: 'ART', label: '美術' },
  { value: 'ANIMATION', label: '動態' },
  { value: 'SOUND', label: '音效' },
  { value: 'VFX', label: '特效' },
  { value: 'COMBAT', label: '戰鬥' },
]

// 專案選項
const projectOptions = computed(() => [
  { value: 'ALL', label: '全部專案' },
  ...mockProjects.map(p => ({ value: p.id, label: p.name })),
])
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">需求池</h1>
        <p class="text-gray-500 mt-1">瀏覽並認領適合您的任務</p>
      </div>
      <Badge variant="info" size="md">
        {{ backlogTasks.length }} 個待認領任務
      </Badge>
    </div>

    <!-- 篩選器 -->
    <Card>
      <div class="flex flex-wrap gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">職能篩選</label>
          <select
            v-model="selectedFunction"
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option v-for="opt in functionOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">專案篩選</label>
          <select
            v-model="selectedProject"
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option v-for="opt in projectOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
    </Card>

    <!-- 任務列表 -->
    <div v-if="backlogTasks.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <TaskCard
        v-for="task in backlogTasks"
        :key="task.id"
        :task="task"
        :project="getProject(task.projectId)"
        @claim="openClaimModal(task)"
      />
    </div>

    <!-- 空狀態 -->
    <Card v-else class="text-center py-12">
      <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-1">目前沒有待認領的任務</h3>
      <p class="text-gray-500">所有任務都已被認領，請稍後再回來查看</p>
    </Card>

    <!-- 認領確認對話框 -->
    <Modal v-model="showClaimModal" title="確認認領任務" size="md">
      <div v-if="taskToClaim" class="space-y-4">
        <p class="text-gray-600">您確定要認領以下任務嗎？</p>
        <div class="p-4 bg-gray-50 rounded-lg">
          <h4 class="font-semibold text-gray-900">{{ taskToClaim.title }}</h4>
          <p class="text-sm text-gray-500 mt-1">{{ taskToClaim.description }}</p>
          <div class="flex flex-wrap gap-1.5 mt-3">
            <Badge
              v-for="func in taskToClaim.functionTags"
              :key="func"
              variant="primary"
              size="sm"
            >
              {{ functionTypeLabels[func] }}
            </Badge>
          </div>
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" @click="showClaimModal = false">
          取消
        </Button>
        <Button :loading="isClaimLoading" @click="confirmClaim">
          確認認領
        </Button>
      </template>
    </Modal>
  </div>
</template>
