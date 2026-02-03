<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useAuthStore } from '@/stores/auth'
import { useProject } from '@/composables/useProject'
import { useToast } from '@/composables/useToast'
import { TASK_STATUS_OPTIONS } from '@/constants/filterOptions'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import Select from '@/components/common/Select.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { TaskCard } from '@/components/task'
import type { TaskStatus, Task } from 'shared/types'

// ============================================
// 我的任務頁面 - 已認領/進行中任務
// Ralph Loop 迭代 8: 使用 Composables 和常數
// Ralph Loop 迭代 26: RWD 與元件升級
// ============================================
const taskStore = useTaskStore()
const authStore = useAuthStore()
const { getProjectById } = useProject()
const { showSuccess, showError } = useToast()

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
    const result = await taskStore.unclaimTask(taskToUnclaim.value.id)
    if (result.success) {
      showSuccess(`已放棄「${taskToUnclaim.value.title}」`)
      showUnclaimModal.value = false
      taskToUnclaim.value = null
    } else {
      showError(result.error?.message || '放棄認領失敗')
    }
  } catch {
    showError('操作失敗，請稍後再試')
  } finally {
    isUnclaimLoading.value = false
  }
}

// 使用常數（排除 UNCLAIMED 和 DONE）
const statusOptions = TASK_STATUS_OPTIONS.filter(
  opt => !['UNCLAIMED', 'DONE'].includes(opt.value as string)
)

// 顯示已完成
const showCompleted = ref(false)
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 (RWD: 迭代 26) -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl md:text-2xl font-bold" style="color: var(--text-primary);">我的任務</h1>
        <p class="text-sm md:text-base mt-1" style="color: var(--text-secondary);">管理您已認領的所有任務</p>
      </div>
      <div class="flex items-center gap-2 sm:gap-3">
        <Badge variant="primary" size="md">
          {{ myTasks.length }} 個進行中
        </Badge>
        <Badge variant="success" size="md">
          {{ completedTasks.length }} 個已完成
        </Badge>
      </div>
    </div>

    <!-- 篩選器 (迭代 26: 使用 Select 元件) -->
    <Card>
      <div class="flex flex-col sm:flex-row sm:items-end gap-4">
        <div class="w-full sm:w-48">
          <Select
            v-model="selectedStatus"
            label="狀態篩選"
            :options="statusOptions"
          />
        </div>
        <div class="flex items-center sm:ml-auto">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="showCompleted"
              type="checkbox"
              class="w-4 h-4 rounded accent-samurai"
              style="border-color: var(--border-primary);"
            >
            <span class="text-sm" style="color: var(--text-secondary);">顯示已完成任務</span>
          </label>
        </div>
      </div>
    </Card>

    <!-- 進行中任務 -->
    <div>
      <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">進行中的任務</h2>
      <div v-if="myTasks.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TaskCard
          v-for="task in myTasks"
          :key="task.id"
          :task="task"
          :project="getProjectById(task.projectId)"
          @unclaim="openUnclaimModal"
        />
      </div>
      <!-- 空狀態 (迭代 26: 使用 EmptyState 元件) -->
      <Card v-else>
        <EmptyState
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          title="目前沒有進行中的任務"
        >
          <RouterLink
            to="/backlog"
            class="inline-block mt-2 font-medium text-samurai hover:text-samurai-dark transition-colors"
          >
            前往需求池認領任務
          </RouterLink>
        </EmptyState>
      </Card>
    </div>

    <!-- 已完成任務 -->
    <div v-if="showCompleted && completedTasks.length > 0">
      <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">已完成的任務</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TaskCard
          v-for="task in completedTasks"
          :key="task.id"
          :task="task"
          :project="getProjectById(task.projectId)"
          :show-actions="false"
        />
      </div>
    </div>

    <!-- 放棄認領對話框 -->
    <Modal v-model="showUnclaimModal" title="確認放棄認領" size="md">
      <div v-if="taskToUnclaim" class="space-y-4">
        <p style="color: var(--text-secondary);">您確定要放棄認領以下任務嗎？此操作將使任務回到需求池。</p>
        <div class="p-4 rounded-lg bg-warning/10 border border-warning/30">
          <h4 class="font-semibold" style="color: var(--text-primary);">{{ taskToUnclaim.title }}</h4>
          <p class="text-sm mt-1" style="color: var(--text-tertiary);">目前進度：{{ taskToUnclaim.progress }}%</p>
        </div>
        <p class="text-sm text-warning">
          注意：放棄認領後，您的進度將被清除
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
