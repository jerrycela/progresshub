<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { tasksApi } from '@/api'
import type { Task } from '@/types'

const loading = ref(true)
const tasks = ref<Task[]>([])

onMounted(async () => {
  try {
    const response = await tasksApi.getMy()
    tasks.value = response.data.tasks
  } catch (error) {
    console.error('Failed to load tasks:', error)
  } finally {
    loading.value = false
  }
})

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    NOT_STARTED: 'status-not-started',
    IN_PROGRESS: 'status-in-progress',
    COMPLETED: 'status-completed',
  }
  return classes[status] || ''
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    NOT_STARTED: '未開始',
    IN_PROGRESS: '進行中',
    COMPLETED: '已完成',
  }
  return texts[status] || status
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW')
}

const isOverdue = (task: Task) => {
  if (task.status === 'COMPLETED') return false
  return new Date(task.plannedEndDate) < new Date()
}

const getProgressColor = (progress: number) => {
  if (progress >= 100) return 'from-success-500 to-success-600'
  if (progress >= 70) return 'from-primary-500 to-primary-600'
  if (progress >= 30) return 'from-warning-500 to-warning-600'
  return 'from-gray-400 to-gray-500'
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Page Header -->
    <div class="page-header">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h1 class="page-title">我的任務</h1>
          <p class="page-subtitle">管理您被分配的所有任務</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="card">
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <div class="skeleton h-5 w-32"></div>
          <div class="skeleton h-5 w-24"></div>
          <div class="skeleton h-5 w-20"></div>
          <div class="skeleton h-5 w-28"></div>
          <div class="skeleton h-5 w-16"></div>
        </div>
        <div v-for="i in 5" :key="i" class="skeleton h-16 rounded-lg"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="tasks.length === 0" class="card">
      <div class="empty-state py-16">
        <svg class="empty-state-icon w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p class="empty-state-title text-xl">目前沒有任務</p>
        <p class="empty-state-description">您目前沒有被分配的任務，請聯繫您的專案經理</p>
      </div>
    </div>

    <!-- Task Table -->
    <div v-else class="table-container">
      <table class="table">
        <thead class="table-header">
          <tr>
            <th>任務</th>
            <th>專案</th>
            <th>截止日期</th>
            <th>進度</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody class="table-body">
          <tr
            v-for="task in tasks"
            :key="task.id"
            class="table-row cursor-pointer"
          >
            <td class="table-cell">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                     :class="task.status === 'COMPLETED' ? 'bg-success-50 text-success-600' : 'bg-gray-100 text-gray-400'">
                  <svg v-if="task.status === 'COMPLETED'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ task.name }}</p>
                  <p v-if="task.description" class="text-sm text-gray-500 truncate max-w-xs">
                    {{ task.description }}
                  </p>
                </div>
              </div>
            </td>
            <td class="table-cell">
              <span class="inline-flex items-center gap-1.5 text-sm text-gray-600">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {{ task.project?.name }}
              </span>
            </td>
            <td class="table-cell">
              <span
                class="inline-flex items-center gap-1.5 text-sm"
                :class="isOverdue(task) ? 'text-danger-600 font-medium' : 'text-gray-600'"
              >
                <svg v-if="isOverdue(task)" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <svg v-else class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ formatDate(task.plannedEndDate) }}
                <span v-if="isOverdue(task)" class="text-xs bg-danger-50 text-danger-600 px-1.5 py-0.5 rounded">
                  已逾期
                </span>
              </span>
            </td>
            <td class="table-cell">
              <div class="flex items-center gap-3">
                <div class="w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500 bg-gradient-to-r"
                    :class="getProgressColor(task.progressPercentage)"
                    :style="{ width: `${task.progressPercentage}%` }"
                  ></div>
                </div>
                <span class="text-sm font-semibold text-gray-900 w-12 text-right">
                  {{ task.progressPercentage }}%
                </span>
              </div>
            </td>
            <td class="table-cell">
              <span :class="['status-badge', getStatusClass(task.status)]">
                {{ getStatusText(task.status) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Task Summary -->
    <div v-if="!loading && tasks.length > 0" class="mt-6 flex items-center justify-between text-sm text-gray-500">
      <span>共 {{ tasks.length }} 個任務</span>
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-gray-400"></span>
          未開始: {{ tasks.filter(t => t.status === 'NOT_STARTED').length }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-primary-500 animate-pulse-soft"></span>
          進行中: {{ tasks.filter(t => t.status === 'IN_PROGRESS').length }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-success-500"></span>
          已完成: {{ tasks.filter(t => t.status === 'COMPLETED').length }}
        </span>
      </div>
    </div>
  </div>
</template>
