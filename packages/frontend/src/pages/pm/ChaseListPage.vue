<script setup lang="ts">
import { computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useProject } from '@/composables/useProject'
import { useFormatDate } from '@/composables/useFormatDate'
import { CHASE_LIST } from '@/constants/pageSettings'
import { mockUsers, functionTypeLabels } from '@/mocks/data'
import Card from '@/components/common/Card.vue'
import Badge from '@/components/common/Badge.vue'
import Button from '@/components/common/Button.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { Task } from 'shared/types'

// ============================================
// 追殺清單頁面 - PM 專用，顯示逾期/未認領任務警示
// Ralph Loop 迭代 8: 使用 Composables 和常數
// Ralph Loop 迭代 28: RWD 與元件升級
// ============================================

const taskStore = useTaskStore()
const { getProjectName } = useProject()
const { getToday, getDaysAgo, formatShort, getRelativeDays } = useFormatDate()

// 取得今天日期
const today = getToday()

// 逾期任務
const overdueTasks = computed(() =>
  (taskStore.tasks as Task[]).filter((t: Task) =>
    t.dueDate &&
    t.dueDate < today &&
    t.status !== 'DONE'
  )
)

// 超過 N 天未認領的任務（使用常數）
const longUnclaimedTasks = computed(() => {
  const thresholdDate = getDaysAgo(CHASE_LIST.UNCLAIMED_DAYS_THRESHOLD)

  return (taskStore.tasks as Task[]).filter((t: Task) =>
    t.status === 'UNCLAIMED' &&
    t.createdAt &&
    t.createdAt.split('T')[0] < thresholdDate
  )
})

// 卡關任務
const blockedTasks = computed(() =>
  (taskStore.tasks as Task[]).filter((t: Task) => t.status === 'BLOCKED')
)

// 長期無進度的任務（使用常數）
const staleTasks = computed(() => {
  const thresholdDate = getDaysAgo(CHASE_LIST.STALE_UPDATE_DAYS)

  return (taskStore.tasks as Task[]).filter((t: Task) =>
    ['IN_PROGRESS', 'CLAIMED'].includes(t.status) &&
    t.updatedAt &&
    t.updatedAt.split('T')[0] < thresholdDate
  )
})

// 取得負責人
const getAssigneeName = (assigneeId?: string) =>
  assigneeId ? mockUsers.find(u => u.id === assigneeId)?.name || '未指派' : '未認領'

// 格式化日期
const formatDate = (date?: string) => formatShort(date)

// 計算逾期天數
const getOverdueDays = (dueDate: string) => Math.abs(getRelativeDays(dueDate))
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 (RWD: 迭代 28) -->
    <div>
      <h1 class="text-xl md:text-2xl font-bold" style="color: var(--text-primary);">追殺清單</h1>
      <p class="text-sm md:text-base mt-1" style="color: var(--text-secondary);">需要立即關注的任務警示</p>
    </div>

    <!-- 統計概覽 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card class="bg-danger/5 border-danger/20">
        <div class="flex items-center gap-3">
          <div class="p-3 bg-danger/10 rounded-xl">
            <svg class="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-danger">{{ overdueTasks.length }}</p>
            <p class="text-sm" style="color: var(--text-secondary);">逾期任務</p>
          </div>
        </div>
      </Card>

      <Card class="bg-warning/5 border-warning/20">
        <div class="flex items-center gap-3">
          <div class="p-3 bg-warning/10 rounded-xl">
            <svg class="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-warning">{{ longUnclaimedTasks.length }}</p>
            <p class="text-sm" style="color: var(--text-secondary);">久未認領</p>
          </div>
        </div>
      </Card>

      <Card class="bg-samurai/5 border-samurai/20">
        <div class="flex items-center gap-3">
          <div class="p-3 bg-samurai/10 rounded-xl">
            <svg class="w-6 h-6 text-samurai" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-samurai">{{ blockedTasks.length }}</p>
            <p class="text-sm" style="color: var(--text-secondary);">卡關中</p>
          </div>
        </div>
      </Card>

      <Card style="background-color: var(--bg-tertiary); border-color: var(--border-primary);">
        <div class="flex items-center gap-3">
          <div class="p-3 rounded-xl" style="background-color: var(--bg-hover);">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--text-secondary);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold" style="color: var(--text-primary);">{{ staleTasks.length }}</p>
            <p class="text-sm" style="color: var(--text-secondary);">無進度更新</p>
          </div>
        </div>
      </Card>
    </div>

    <!-- 逾期任務 (RWD: 迭代 28) -->
    <Card v-if="overdueTasks.length > 0" title="逾期任務" class="border-danger/30">
      <template #header-actions>
        <Badge variant="danger">{{ overdueTasks.length }}</Badge>
      </template>
      <div class="divide-y" style="border-color: var(--border-primary);">
        <div
          v-for="task in overdueTasks"
          :key="task.id"
          class="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-2 -mx-2 rounded-lg cursor-pointer transition-colors duration-200 hover-bg"
        >
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="font-medium truncate" style="color: var(--text-primary);">{{ task.title }}</h4>
              <Badge variant="danger" size="sm">逾期 {{ getOverdueDays(task.dueDate!) }} 天</Badge>
            </div>
            <div class="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-sm" style="color: var(--text-tertiary);">
              <span>{{ getProjectName(task.projectId) }}</span>
              <span class="hidden sm:inline">•</span>
              <span>負責人：{{ getAssigneeName(task.assigneeId) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <Badge
              v-for="func in task.functionTags"
              :key="func"
              variant="default"
              size="sm"
            >
              {{ functionTypeLabels[func] }}
            </Badge>
          </div>
        </div>
      </div>
    </Card>

    <!-- 卡關任務 -->
    <Card v-if="blockedTasks.length > 0" title="卡關任務" class="border-samurai/30">
      <template #header-actions>
        <Badge variant="primary">{{ blockedTasks.length }}</Badge>
      </template>
      <div class="divide-y" style="border-color: var(--border-primary);">
        <div
          v-for="task in blockedTasks"
          :key="task.id"
          class="py-3 flex items-center justify-between px-2 -mx-2 rounded-lg cursor-pointer transition-colors duration-200 hover-bg"
        >
          <div class="flex-1 min-w-0">
            <h4 class="font-medium truncate" style="color: var(--text-primary);">{{ task.title }}</h4>
            <div class="flex items-center gap-3 mt-1 text-sm" style="color: var(--text-tertiary);">
              <span>{{ getProjectName(task.projectId) }}</span>
              <span>•</span>
              <span>負責人：{{ getAssigneeName(task.assigneeId) }}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            查看詳情
          </Button>
        </div>
      </div>
    </Card>

    <!-- 久未認領 -->
    <Card v-if="longUnclaimedTasks.length > 0" title="超過 3 天未認領" class="border-warning/30">
      <template #header-actions>
        <Badge variant="warning">{{ longUnclaimedTasks.length }}</Badge>
      </template>
      <div class="divide-y" style="border-color: var(--border-primary);">
        <div
          v-for="task in longUnclaimedTasks"
          :key="task.id"
          class="py-3 flex items-center justify-between px-2 -mx-2 rounded-lg cursor-pointer transition-colors duration-200 hover-bg"
        >
          <div class="flex-1 min-w-0">
            <h4 class="font-medium truncate" style="color: var(--text-primary);">{{ task.title }}</h4>
            <div class="flex items-center gap-3 mt-1 text-sm" style="color: var(--text-tertiary);">
              <span>{{ getProjectName(task.projectId) }}</span>
              <span>•</span>
              <span>建立於 {{ formatDate(task.createdAt) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Badge
              v-for="func in task.functionTags"
              :key="func"
              variant="info"
              size="sm"
            >
              {{ functionTypeLabels[func] }}
            </Badge>
          </div>
        </div>
      </div>
    </Card>

    <!-- 無異常狀態 (迭代 28: 使用 EmptyState 元件) -->
    <Card
      v-if="overdueTasks.length === 0 && blockedTasks.length === 0 && longUnclaimedTasks.length === 0"
      class="bg-success/5 border-success/20"
    >
      <EmptyState
        icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        title="太棒了！目前沒有需要追蹤的異常任務"
        description="所有任務都在正常進度中"
        icon-size="lg"
      />
    </Card>
  </div>
</template>
