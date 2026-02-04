<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  mockPoolTasks,
  mockProjects,
  mockDepartments,
  type PoolTask,
} from '@/stores/mockData'
import type { Department } from '@/types'

const router = useRouter()

// 篩選狀態
const selectedProject = ref<string>('')
const selectedDepartment = ref<Department | ''>('')
const selectedStatus = ref<string>('')
const searchQuery = ref('')

// 篩選後的任務
const filteredTasks = computed(() => {
  return mockPoolTasks.filter((task) => {
    // 專案篩選
    if (selectedProject.value && task.projectId !== selectedProject.value) {
      return false
    }
    // 部門篩選
    if (selectedDepartment.value && task.department !== selectedDepartment.value) {
      return false
    }
    // 狀態篩選
    if (selectedStatus.value && task.status !== selectedStatus.value) {
      return false
    }
    // 搜尋篩選
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      return (
        task.name.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      )
    }
    return true
  })
})

// 任務統計
const taskStats = computed(() => ({
  total: mockPoolTasks.length,
  available: mockPoolTasks.filter((t) => !t.assignedToId && t.status === 'NOT_STARTED').length,
  inProgress: mockPoolTasks.filter((t) => t.status === 'IN_PROGRESS').length,
  completed: mockPoolTasks.filter((t) => t.status === 'COMPLETED').length,
}))

// 狀態標籤樣式
const getStatusClass = (status: string) => {
  switch (status) {
    case 'NOT_STARTED':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
    case 'COMPLETED':
      return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'NOT_STARTED':
      return '未開始'
    case 'IN_PROGRESS':
      return '進行中'
    case 'COMPLETED':
      return '已完成'
    default:
      return status
  }
}

// 來源類型標籤
const getSourceLabel = (sourceType: string) => {
  switch (sourceType) {
    case 'ASSIGNED':
      return '已指派'
    case 'POOL':
      return '任務池'
    case 'SELF_CREATED':
      return '自建'
    default:
      return sourceType
  }
}

const getSourceClass = (sourceType: string) => {
  switch (sourceType) {
    case 'ASSIGNED':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
    case 'POOL':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
    case 'SELF_CREATED':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

// 點擊任務卡片
const viewTaskDetail = (task: PoolTask) => {
  router.push(`/task-pool/${task.id}`)
}

// 認領任務
const claimTask = (task: PoolTask) => {
  alert(`認領任務: ${task.name}\n（此為原型展示，實際功能待後端實作）`)
}

// 清除篩選
const clearFilters = () => {
  selectedProject.value = ''
  selectedDepartment.value = ''
  selectedStatus.value = ''
  searchQuery.value = ''
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- 頁面標題 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">任務池</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          瀏覽和認領可用任務
        </p>
      </div>
      <router-link
        to="/task-pool/create"
        class="btn-primary flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        建立任務
      </router-link>
    </div>

    <!-- 統計卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">全部任務</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ taskStats.total }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">可認領</p>
        <p class="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{{ taskStats.available }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">進行中</p>
        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{{ taskStats.inProgress }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">已完成</p>
        <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{{ taskStats.completed }}</p>
      </div>
    </div>

    <!-- 篩選區域 -->
    <div class="card p-4">
      <div class="flex flex-wrap items-center gap-4">
        <!-- 搜尋 -->
        <div class="flex-1 min-w-[200px]">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜尋任務名稱或描述..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <!-- 專案篩選 -->
        <select
          v-model="selectedProject"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 cursor-pointer"
        >
          <option value="">所有專案</option>
          <option v-for="project in mockProjects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>

        <!-- 部門篩選 -->
        <select
          v-model="selectedDepartment"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 cursor-pointer"
        >
          <option value="">所有部門</option>
          <option v-for="dept in mockDepartments" :key="dept.id" :value="dept.id">
            {{ dept.name }}
          </option>
        </select>

        <!-- 狀態篩選 -->
        <select
          v-model="selectedStatus"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 cursor-pointer"
        >
          <option value="">所有狀態</option>
          <option value="NOT_STARTED">未開始</option>
          <option value="IN_PROGRESS">進行中</option>
          <option value="COMPLETED">已完成</option>
        </select>

        <!-- 清除篩選 -->
        <button
          v-if="selectedProject || selectedDepartment || selectedStatus || searchQuery"
          @click="clearFilters"
          class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
        >
          清除篩選
        </button>
      </div>
    </div>

    <!-- 任務列表 -->
    <div class="space-y-4">
      <div v-if="filteredTasks.length === 0" class="card p-12 text-center">
        <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p class="mt-4 text-gray-500 dark:text-gray-400">沒有符合條件的任務</p>
      </div>

      <div
        v-for="task in filteredTasks"
        :key="task.id"
        @click="viewTaskDetail(task)"
        class="card p-5 hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <!-- 標籤列 -->
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span :class="['px-2 py-0.5 text-xs font-medium rounded-full', getSourceClass(task.sourceType)]">
                {{ getSourceLabel(task.sourceType) }}
              </span>
              <span :class="['px-2 py-0.5 text-xs font-medium rounded-full', getStatusClass(task.status)]">
                {{ getStatusLabel(task.status) }}
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ task.project?.name }}
              </span>
            </div>

            <!-- 任務名稱 -->
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {{ task.name }}
            </h3>

            <!-- 描述 -->
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {{ task.description }}
            </p>

            <!-- 底部資訊 -->
            <div class="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
              <!-- 負責人 -->
              <div v-if="task.assignedTo" class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{{ task.assignedTo.name }}</span>
              </div>

              <!-- 協作者 -->
              <div v-if="task.collaboratorNames?.length" class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>+{{ task.collaboratorNames.length }} 協作</span>
              </div>

              <!-- 日期 -->
              <div class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{{ task.plannedStartDate }} ~ {{ task.plannedEndDate }}</span>
              </div>

              <!-- 建立者 -->
              <div class="flex items-center gap-1">
                <span class="text-xs">建立者: {{ task.createdBy.name }}</span>
              </div>
            </div>
          </div>

          <!-- 右側：進度和動作 -->
          <div class="flex flex-col items-end gap-3">
            <!-- 進度 -->
            <div class="text-right">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">{{ task.progressPercentage }}%</span>
              <div class="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                <div
                  class="h-full bg-primary-500 rounded-full transition-all duration-300"
                  :style="{ width: `${task.progressPercentage}%` }"
                ></div>
              </div>
            </div>

            <!-- 認領按鈕 -->
            <button
              v-if="!task.assignedToId && task.status === 'NOT_STARTED'"
              @click.stop="claimTask(task)"
              class="btn-accent text-sm px-4 py-1.5"
            >
              認領任務
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
