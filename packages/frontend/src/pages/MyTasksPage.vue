<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useAuthStore } from '@/stores/auth'
import { mockProjects } from '@/mocks/data'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import { TaskCard } from '@/components/task'
import type { TaskStatus, Task } from 'shared/types'

// 我的任務頁面 - 已認領/進行中任務
const taskStore = useTaskStore()
const authStore = useAuthStore()

// 篩選條件
const selectedStatus = ref<TaskStatus | 'ALL'>('ALL')

// 我的任務
const myTasks = computed(() => {
  const userId = authStore.user?.id
  if (!userId) return []

  let tasks = (taskStore.tasks as Task[]).filter(
    (t: Task) => t.assigneeId === userId && t.status !== 'DONE'
  )

  if (selectedStatus.value !== 'ALL') {
    tasks = tasks.filter((t: Task) => t.status === selectedStatus.value)
  }

  return tasks
})

// 已完成任務
const completedTasks = computed(() => {
  const userId = authStore.user?.id
  if (!userId) return []
  return (taskStore.tasks as Task[]).filter((t: Task) => t.assigneeId === userId && t.status === 'DONE')
})

// 取得專案
const getProject = (projectId: string) =>
  mockProjects.find((p) => p.id === projectId)

// 放棄認領對話框
const showUnclaimModal = ref(false)
const taskToUnclaim = ref<Task | null>(null)
const isUnclaimLoading = ref(false)

const openUnclaimModal = (taskId: string) => {
  const task = (taskStore.tasks as Task[]).find((t: Task) => t.id === taskId)
  if (task) {
    taskToUnclaim.value = task
    showUnclaimModal.value = true
  }
}

const confirmUnclaim = async () => {
  if (!taskToUnclaim.value) return

  isUnclaimLoading.value = true
  try {
    await taskStore.unclaimTask(taskToUnclaim.value.id)
    showUnclaimModal.value = false
    taskToUnclaim.value = null
  } finally {
    isUnclaimLoading.value = false
  }
}

// 狀態選項
const statusOptions = [
  { value: 'ALL', label: '全部狀態' },
  { value: 'CLAIMED', label: '已認領' },
  { value: 'IN_PROGRESS', label: '進行中' },
  { value: 'BLOCKED', label: '卡關' },
]

// 顯示已完成
const showCompleted = ref(false)
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">我的任務</h1>
        <p class="text-gray-500 mt-1">管理您已認領的所有任務</p>
      </div>
      <div class="flex items-center gap-3">
        <Badge variant="primary" size="md">
          {{ myTasks.length }} 個進行中
        </Badge>
        <Badge variant="success" size="md">
          {{ completedTasks.length }} 個已完成
        </Badge>
      </div>
    </div>

    <!-- 篩選器 -->
    <Card>
      <div class="flex flex-wrap items-center gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">狀態篩選</label>
          <select
            v-model="selectedStatus"
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="flex items-center ml-auto">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="showCompleted"
              type="checkbox"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            >
            <span class="text-sm text-gray-700">顯示已完成任務</span>
          </label>
        </div>
      </div>
    </Card>

    <!-- 進行中任務 -->
    <div>
      <h2 class="text-lg font-semibold text-gray-900 mb-4">進行中的任務</h2>
      <div v-if="myTasks.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TaskCard
          v-for="task in myTasks"
          :key="task.id"
          :task="task"
          :project="getProject(task.projectId)"
          @unclaim="openUnclaimModal"
        />
      </div>
      <Card v-else class="text-center py-8">
        <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p class="text-gray-500">目前沒有進行中的任務</p>
        <RouterLink
          to="/backlog"
          class="inline-block mt-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          前往需求池認領任務
        </RouterLink>
      </Card>
    </div>

    <!-- 已完成任務 -->
    <div v-if="showCompleted && completedTasks.length > 0">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">已完成的任務</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TaskCard
          v-for="task in completedTasks"
          :key="task.id"
          :task="task"
          :project="getProject(task.projectId)"
          :show-actions="false"
        />
      </div>
    </div>

    <!-- 放棄認領對話框 -->
    <Modal v-model="showUnclaimModal" title="確認放棄認領" size="md">
      <div v-if="taskToUnclaim" class="space-y-4">
        <p class="text-gray-600">您確定要放棄認領以下任務嗎？此操作將使任務回到需求池。</p>
        <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 class="font-semibold text-gray-900">{{ taskToUnclaim.title }}</h4>
          <p class="text-sm text-gray-500 mt-1">目前進度：{{ taskToUnclaim.progress }}%</p>
        </div>
        <p class="text-sm text-yellow-600">
          ⚠️ 注意：放棄認領後，您的進度將被清除
        </p>
      </div>

      <template #footer>
        <Button variant="secondary" @click="showUnclaimModal = false">
          取消
        </Button>
        <Button variant="danger" :loading="isUnclaimLoading" @click="confirmUnclaim">
          確認放棄
        </Button>
      </template>
    </Modal>
  </div>
</template>
