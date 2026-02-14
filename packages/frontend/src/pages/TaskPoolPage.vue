<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/tasks'
import { useProjectStore } from '@/stores/projects'
import { useDepartmentStore } from '@/stores/departments'
import type { PoolTask } from 'shared/types'
import { FUNCTION_OPTIONS } from '@/constants/filterOptions'
import { getStatusLabel } from '@/composables/useStatusUtils'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import type { Department, FunctionType } from 'shared/types'

const { showSuccess, showError } = useToast()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const departmentStore = useDepartmentStore()
const authStore = useAuthStore()

// ============================================
// 任務池頁面 - 瀏覽和認領任務
// 整合原「需求池」功能
// ============================================

const router = useRouter()

// 篩選狀態
const selectedProject = ref<string>('')
const selectedDepartment = ref<Department | ''>('')
const selectedFunction = ref<FunctionType | ''>('')
const selectedStatus = ref<string>('')
const searchQuery = ref('')

// 快速篩選：只看待認領
const showOnlyUnclaimed = ref(false)

// 篩選後的任務
const filteredTasks = computed(() => {
  return taskStore.poolTasks.filter((task: PoolTask) => {
    // 快速篩選：只看待認領
    if (showOnlyUnclaimed.value && task.status !== 'UNCLAIMED') {
      return false
    }
    if (selectedProject.value && task.projectId !== selectedProject.value) {
      return false
    }
    if (selectedDepartment.value && task.department !== selectedDepartment.value) {
      return false
    }
    // 職能篩選
    if (selectedFunction.value && !task.functionTags.includes(selectedFunction.value)) {
      return false
    }
    if (selectedStatus.value && task.status !== selectedStatus.value) {
      return false
    }
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      return (
        task.title.toLowerCase().includes(query) || task.description?.toLowerCase().includes(query)
      )
    }
    return true
  })
})

// 任務統計
const taskStats = computed(() => ({
  total: taskStore.poolTasks.length,
  available: taskStore.poolTasks.filter((t: PoolTask) => t.status === 'UNCLAIMED').length,
  inProgress: taskStore.poolTasks.filter((t: PoolTask) => t.status === 'IN_PROGRESS').length,
  completed: taskStore.poolTasks.filter((t: PoolTask) => t.status === 'DONE').length,
}))

// 狀態標籤樣式
const getStatusClass = (status: string): string => {
  switch (status) {
    case 'UNCLAIMED':
      return 'status-badge-unclaimed'
    case 'CLAIMED':
    case 'IN_PROGRESS':
      return 'status-badge-in-progress'
    case 'DONE':
      return 'status-badge-done'
    case 'BLOCKED':
      return 'status-badge-blocked'
    default:
      return ''
  }
}

// 來源類型標籤
const getSourceLabel = (sourceType: string): string => {
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

const getSourceClass = (sourceType: string): string => {
  switch (sourceType) {
    case 'ASSIGNED':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    case 'POOL':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
    case 'SELF_CREATED':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
    default:
      return ''
  }
}

// 點擊任務卡片
const viewTaskDetail = (task: PoolTask): void => {
  router.push(`/task-pool/${task.id}`)
}

// 認領任務
const claimTask = async (task: PoolTask): Promise<void> => {
  if (!authStore.user) return
  const result = await taskStore.claimTask(task.id, authStore.user.id)
  if (result.success) {
    showSuccess(`已認領任務：${task.title}`)
  } else {
    showError(result.error?.message || '認領任務失敗')
  }
}

// 清除篩選
const clearFilters = (): void => {
  selectedProject.value = ''
  selectedDepartment.value = ''
  selectedFunction.value = ''
  selectedStatus.value = ''
  searchQuery.value = ''
  showOnlyUnclaimed.value = false
}

// 切換快速篩選
const toggleUnclaimedFilter = (): void => {
  showOnlyUnclaimed.value = !showOnlyUnclaimed.value
  if (showOnlyUnclaimed.value) {
    selectedStatus.value = ''
  }
}

// 職能選項
const functionOptions = FUNCTION_OPTIONS.filter(opt => opt.value !== 'ALL')
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-primary">任務池</h1>
        <p class="text-sm mt-1 text-secondary">瀏覽和認領可用任務</p>
      </div>
      <router-link to="/task-pool/create" class="btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        建立任務
      </router-link>
    </div>

    <!-- 統計卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card p-4">
        <p class="text-sm text-secondary">全部任務</p>
        <p class="text-2xl font-bold mt-1 text-primary">
          {{ taskStats.total }}
        </p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-secondary">可認領</p>
        <p class="text-2xl font-bold mt-1 text-accent-primary">
          {{ taskStats.available }}
        </p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-secondary">進行中</p>
        <p class="text-2xl font-bold mt-1 text-blue-500">{{ taskStats.inProgress }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-secondary">已完成</p>
        <p class="text-2xl font-bold mt-1 text-green-500">{{ taskStats.completed }}</p>
      </div>
    </div>

    <!-- 快速篩選按鈕 -->
    <div class="flex items-center gap-3">
      <button
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
          showOnlyUnclaimed
            ? 'bg-indigo text-white'
            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
        ]"
        @click="toggleUnclaimedFilter"
      >
        只看待認領
      </button>
      <span class="text-sm text-muted"> 共 {{ filteredTasks.length }} 個任務 </span>
    </div>

    <!-- 篩選區域 -->
    <div class="card p-4">
      <div class="flex flex-wrap items-center gap-4">
        <!-- 搜尋 -->
        <div class="flex-1 min-w-[200px]">
          <div class="relative">
            <svg
              class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜尋任務名稱或描述..."
              class="input-field w-full pl-10"
            />
          </div>
        </div>

        <!-- 專案篩選 -->
        <select v-model="selectedProject" class="input-field cursor-pointer">
          <option value="">所有專案</option>
          <option v-for="project in projectStore.projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>

        <!-- 職能篩選 -->
        <select v-model="selectedFunction" class="input-field cursor-pointer">
          <option value="">所有職能</option>
          <option v-for="func in functionOptions" :key="func.value" :value="func.value">
            {{ func.label }}
          </option>
        </select>

        <!-- 部門篩選 -->
        <select v-model="selectedDepartment" class="input-field cursor-pointer">
          <option value="">所有部門</option>
          <option v-for="dept in departmentStore.departments" :key="dept.id" :value="dept.id">
            {{ dept.name }}
          </option>
        </select>

        <!-- 狀態篩選 -->
        <select
          v-model="selectedStatus"
          class="input-field cursor-pointer"
          :disabled="showOnlyUnclaimed"
        >
          <option value="">所有狀態</option>
          <option value="UNCLAIMED">待認領</option>
          <option value="IN_PROGRESS">進行中</option>
          <option value="DONE">已完成</option>
        </select>

        <!-- 清除篩選 -->
        <button
          v-if="
            selectedProject ||
            selectedDepartment ||
            selectedFunction ||
            selectedStatus ||
            searchQuery ||
            showOnlyUnclaimed
          "
          class="text-sm cursor-pointer transition-colors text-muted"
          @click="clearFilters"
        >
          清除篩選
        </button>
      </div>
    </div>

    <!-- 任務列表 -->
    <div class="space-y-4">
      <!-- Loading skeleton -->
      <template v-if="taskStore.loading.fetch">
        <div v-for="i in 3" :key="i" class="card p-5 animate-pulse">
          <div class="flex items-center gap-2 mb-3">
            <div class="h-5 w-16 bg-[var(--bg-tertiary)] rounded-full" />
            <div class="h-5 w-14 bg-[var(--bg-tertiary)] rounded-full" />
          </div>
          <div class="h-5 w-2/3 bg-[var(--bg-tertiary)] rounded mb-2" />
          <div class="h-4 w-full bg-[var(--bg-tertiary)] rounded" />
        </div>
      </template>

      <div v-else-if="filteredTasks.length === 0" class="card p-12 text-center">
        <svg
          class="w-16 h-16 mx-auto text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p class="mt-4 text-secondary">沒有符合條件的任務</p>
      </div>

      <template v-else>
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="card p-5 hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
          @click="viewTaskDetail(task)"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <!-- 標籤列 -->
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span
                  :class="[
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    getSourceClass(task.sourceType),
                  ]"
                >
                  {{ getSourceLabel(task.sourceType) }}
                </span>
                <span :class="['status-badge', getStatusClass(task.status)]">
                  {{ getStatusLabel(task.status) }}
                </span>
                <span class="text-xs text-muted">
                  {{ task.project?.name }}
                </span>
              </div>

              <!-- 任務名稱 -->
              <h3
                class="text-lg font-semibold group-hover:text-[var(--accent-primary)] transition-colors text-primary"
              >
                {{ task.title }}
              </h3>

              <!-- 描述 -->
              <p class="text-sm mt-1 line-clamp-2 text-secondary">
                {{ task.description }}
              </p>

              <!-- 底部資訊 -->
              <div class="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted">
                <!-- 負責人 -->
                <div v-if="task.assignee" class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span>{{ task.assignee.name }}</span>
                </div>

                <!-- 協作者 -->
                <div v-if="task.collaboratorNames?.length" class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>+{{ task.collaboratorNames.length }} 協作</span>
                </div>

                <!-- 日期 -->
                <div class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{{ task.startDate }} ~ {{ task.dueDate }}</span>
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
                <span class="text-2xl font-bold text-primary">{{ task.progress }}%</span>
                <div class="w-24 h-2 rounded-full mt-1 bg-elevated">
                  <div
                    class="h-full rounded-full transition-all duration-300 bg-[var(--accent-primary)]"
                    :style="{ width: `${task.progress}%` }"
                  ></div>
                </div>
              </div>

              <!-- 認領按鈕 -->
              <button
                v-if="task.status === 'UNCLAIMED'"
                class="btn-primary text-sm px-4 py-1.5"
                @click.stop="claimTask(task)"
              >
                認領任務
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.status-badge-unclaimed {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
}

.status-badge-in-progress {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.status-badge-done {
  background-color: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.status-badge-blocked {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
</style>
