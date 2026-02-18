<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTaskStore } from '@/stores/tasks'
import { useProject } from '@/composables/useProject'
import { useDashboardStore } from '@/stores/dashboard'
import { DASHBOARD } from '@/constants/pageSettings'
import Card from '@/components/common/Card.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { StatCard, TaskCard } from '@/components/task'
import type { Task } from 'shared/types'

// ============================================
// 儀表板頁面 - SG-Arts 精品金屬質感設計
// 個人任務總覽 + Dark mode 支援
// ============================================

const authStore = useAuthStore()
const taskStore = useTaskStore()
const dashboardStore = useDashboardStore()
const { getProjectById } = useProject()

const user = computed(() => authStore.user)
const stats = computed(() => dashboardStore.stats)

// 取得使用者的進行中任務（使用常數限制數量）
const myInProgressTasks = computed(() =>
  (taskStore.tasks as Task[])
    .filter(
      (t: Task) => t.assigneeId === user.value?.id && ['CLAIMED', 'IN_PROGRESS'].includes(t.status),
    )
    .slice(0, DASHBOARD.TASK_LIMIT),
)

// 統計卡片圖示
const icons = {
  total:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  completed: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  inProgress: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  unclaimed:
    'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  overdue:
    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
}
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 -->
    <div>
      <h1 class="text-xl md:text-2xl font-semibold" style="color: var(--text-primary)">
        {{ user?.name }}，歡迎回來！
      </h1>
      <p class="text-sm md:text-base mt-1" style="color: var(--text-tertiary)">
        以下是您今天的工作概覽
      </p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="taskStore.loading.fetch" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="card p-4 animate-pulse">
        <div class="h-4 w-20 bg-[var(--bg-tertiary)] rounded mb-2" />
        <div class="h-8 w-12 bg-[var(--bg-tertiary)] rounded" />
      </div>
    </div>

    <!-- 統計卡片 -->
    <div v-else class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <StatCard title="總任務數" :value="stats.totalTasks" :icon="icons.total" color="blue" />
      <StatCard
        title="已完成"
        :value="stats.completedTasks"
        :icon="icons.completed"
        color="green"
      />
      <StatCard
        title="進行中"
        :value="stats.inProgressTasks"
        :icon="icons.inProgress"
        color="yellow"
      />
      <StatCard
        title="待認領"
        :value="stats.unclaimedTasks"
        :icon="icons.unclaimed"
        color="purple"
      />
    </div>

    <!-- 主要內容區 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 我的進行中任務 -->
      <div class="lg:col-span-2">
        <Card title="我的進行中任務" subtitle="點擊任務查看詳情">
          <template #header-actions>
            <RouterLink
              to="/my-tasks"
              class="text-sm font-medium transition-colors duration-150"
              style="color: var(--accent)"
            >
              查看全部 →
            </RouterLink>
          </template>

          <div v-if="myInProgressTasks.length > 0" class="space-y-4">
            <TaskCard
              v-for="task in myInProgressTasks"
              :key="task.id"
              :task="task"
              :project="getProjectById(task.projectId)"
              :show-actions="false"
            />
          </div>
          <EmptyState
            v-else
            icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            title="目前沒有進行中的任務"
          >
            <RouterLink
              to="/backlog"
              class="inline-block mt-2 font-medium transition-colors duration-150"
              style="color: var(--accent)"
            >
              前往需求池認領任務
            </RouterLink>
          </EmptyState>
        </Card>
      </div>

      <!-- 快速操作 -->
      <div class="space-y-6">
        <Card title="快速操作">
          <div class="space-y-3">
            <!-- 進度回報 -->
            <RouterLink
              to="/report"
              class="flex items-center gap-3 p-3 rounded-md transition-all duration-150 hover-bg"
              style="background-color: var(--accent-light); color: var(--accent)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span class="font-medium text-sm">進度回報</span>
            </RouterLink>

            <!-- 認領新任務 -->
            <RouterLink
              to="/backlog"
              class="flex items-center gap-3 p-3 rounded-md transition-all duration-150"
              style="background-color: var(--bg-tertiary); color: var(--text-secondary)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span class="font-medium text-sm">認領新任務</span>
            </RouterLink>

            <!-- 查看甘特圖 -->
            <RouterLink
              to="/gantt"
              class="flex items-center gap-3 p-3 rounded-md transition-all duration-150"
              style="background-color: var(--bg-tertiary); color: var(--text-secondary)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span class="font-medium text-sm">查看甘特圖</span>
            </RouterLink>
          </div>
        </Card>

        <!-- 逾期警示 -->
        <div
          v-if="stats.overdueTasksCount > 0"
          class="p-4 rounded-lg"
          style="background-color: var(--accent-light); border: 1px solid var(--accent)"
        >
          <div class="flex items-center gap-3" style="color: var(--accent)">
            <svg
              class="w-6 h-6 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p class="font-semibold text-sm">逾期警示</p>
              <p class="text-sm opacity-80">您有 {{ stats.overdueTasksCount }} 個任務已逾期</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
