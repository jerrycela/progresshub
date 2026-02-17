<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useAuthStore } from '@/stores/auth'
import { useProject } from '@/composables/useProject'
import { useTaskModal } from '@/composables/useTaskModal'
import { FUNCTION_OPTIONS } from '@/constants/filterOptions'
import { functionTypeLabels } from '@/constants/labels'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { TaskCard } from '@/components/task'
import type { FunctionType, Task } from 'shared/types'

// ============================================
// 需求池頁面 - 待認領任務列表
// Ralph Loop 迭代 8: 使用 Composables 和常數
// Ralph Loop 迭代 12: 使用 EmptyState 元件
// ============================================
const taskStore = useTaskStore()
const authStore = useAuthStore()
const { getProjectById, getProjectOptions } = useProject()
const claimModal = useTaskModal<Task>()

// 篩選條件
const selectedFunction = ref<FunctionType | 'ALL'>('ALL')
const selectedProject = ref<string>('ALL')

// 待認領任務
const backlogTasks = computed(() => {
  let tasks = taskStore.backlogTasks as Task[]

  // 職能篩選
  if (selectedFunction.value !== 'ALL') {
    tasks = tasks.filter((t: Task) =>
      t.functionTags.includes(selectedFunction.value as FunctionType),
    )
  }

  // 專案篩選
  if (selectedProject.value !== 'ALL') {
    tasks = tasks.filter((t: Task) => t.projectId === selectedProject.value)
  }

  return tasks
})

// 認領確認
const confirmClaim = () =>
  claimModal.execute(
    t => taskStore.claimTask(t.id, authStore.user!.id),
    `已成功認領「${claimModal.task.value?.title}」`,
    '認領失敗',
  )

// 使用常數和 composable
const functionOptions = FUNCTION_OPTIONS
const projectOptions = computed(() => getProjectOptions(true))
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold" style="color: var(--text-primary)">需求池</h1>
        <p class="mt-1" style="color: var(--text-secondary)">瀏覽並認領適合您的任務</p>
      </div>
      <Badge variant="info" size="md"> {{ backlogTasks.length }} 個待認領任務 </Badge>
    </div>

    <!-- 篩選器 -->
    <Card>
      <div class="flex flex-wrap gap-4">
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-secondary)"
            >職能篩選</label
          >
          <select v-model="selectedFunction" class="input">
            <option v-for="opt in functionOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-secondary)"
            >專案篩選</label
          >
          <select v-model="selectedProject" class="input">
            <option v-for="opt in projectOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
    </Card>

    <!-- 任務列表 -->
    <div
      v-if="backlogTasks.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <TaskCard
        v-for="task in backlogTasks"
        :key="task.id"
        :task="task"
        :project="getProjectById(task.projectId)"
        @claim="claimModal.open(task)"
      />
    </div>

    <!-- 空狀態 -->
    <Card v-else>
      <EmptyState
        icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        title="目前沒有待認領的任務"
        description="所有任務都已被認領，請稍後再回來查看"
        icon-size="lg"
      />
    </Card>

    <!-- 認領確認對話框 -->
    <Modal v-model="claimModal.show.value" title="確認認領任務" size="md">
      <div v-if="claimModal.task.value" class="space-y-4">
        <p style="color: var(--text-secondary)">您確定要認領以下任務嗎？</p>
        <div class="p-4 rounded-lg" style="background-color: var(--bg-tertiary)">
          <h4 class="font-semibold" style="color: var(--text-primary)">
            {{ claimModal.task.value.title }}
          </h4>
          <p class="text-sm mt-1" style="color: var(--text-tertiary)">
            {{ claimModal.task.value.description }}
          </p>
          <div class="flex flex-wrap gap-1.5 mt-3">
            <Badge
              v-for="func in claimModal.task.value.functionTags"
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
        <Button variant="secondary" @click="claimModal.close()"> 取消 </Button>
        <Button :loading="claimModal.loading.value" @click="confirmClaim"> 確認認領 </Button>
      </template>
    </Modal>
  </div>
</template>
