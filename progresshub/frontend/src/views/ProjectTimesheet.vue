<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Types
interface TaskTimeEntry {
  taskId: string
  taskName: string
  assignee: string
  estimatedHours: number
  actualHours: number
  variance: number
  status: string
}

interface MemberTimeEntry {
  memberId: string
  memberName: string
  hours: number
  percentage: number
}

interface CategoryTimeEntry {
  category: string
  hours: number
  percentage: number
  color: string
}

// State
const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string
const loading = ref(true)
const projectName = ref('')
const totalHours = ref(0)
const budgetHours = ref(0)
const budgetUsage = ref(0)
const estimateAccuracy = ref(0)
const taskEntries = ref<TaskTimeEntry[]>([])
const memberEntries = ref<MemberTimeEntry[]>([])
const categoryEntries = ref<CategoryTimeEntry[]>([])
const dateRange = ref({ start: '2026-01-01', end: '2026-02-02' })
const sortBy = ref<'hours' | 'name' | 'variance'>('hours')

// Mock data
onMounted(() => {
  setTimeout(() => {
    projectName.value = 'ProgressHub 開發專案'
    totalHours.value = 248.5
    budgetHours.value = 320
    budgetUsage.value = 78
    estimateAccuracy.value = -12

    taskEntries.value = [
      { taskId: '1', taskName: '登入功能', assignee: 'Alice', estimatedHours: 24, actualHours: 28, variance: 17, status: 'COMPLETED' },
      { taskId: '2', taskName: '首頁 UI', assignee: 'Bob', estimatedHours: 40, actualHours: 35, variance: -12, status: 'COMPLETED' },
      { taskId: '3', taskName: 'API 開發', assignee: 'Carol', estimatedHours: 32, actualHours: 42, variance: 31, status: 'IN_PROGRESS' },
      { taskId: '4', taskName: '單元測試', assignee: 'David', estimatedHours: 16, actualHours: 12, variance: -25, status: 'IN_PROGRESS' },
      { taskId: '5', taskName: '整合測試', assignee: 'Alice', estimatedHours: 20, actualHours: 18, variance: -10, status: 'NOT_STARTED' },
    ]

    memberEntries.value = [
      { memberId: '1', memberName: 'Alice', hours: 98, percentage: 39.4 },
      { memberId: '2', memberName: 'Bob', hours: 85, percentage: 34.2 },
      { memberId: '3', memberName: 'Carol', hours: 42, percentage: 16.9 },
      { memberId: '4', memberName: 'David', hours: 23.5, percentage: 9.5 },
    ]

    categoryEntries.value = [
      { category: '開發', hours: 145, percentage: 58, color: 'bg-blue-500' },
      { category: '測試', hours: 52, percentage: 21, color: 'bg-green-500' },
      { category: '會議', hours: 28, percentage: 11, color: 'bg-yellow-500' },
      { category: 'Code Review', hours: 18, percentage: 7, color: 'bg-orange-500' },
      { category: '其他', hours: 5.5, percentage: 3, color: 'bg-gray-500' },
    ]

    loading.value = false
  }, 500)
})

// Computed
const sortedTasks = computed(() => {
  const tasks = [...taskEntries.value]
  switch (sortBy.value) {
    case 'hours':
      return tasks.sort((a, b) => b.actualHours - a.actualHours)
    case 'name':
      return tasks.sort((a, b) => a.taskName.localeCompare(b.taskName))
    case 'variance':
      return tasks.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
    default:
      return tasks
  }
})

const remainingHours = computed(() => budgetHours.value - totalHours.value)

// Methods
const goBack = () => {
  router.push(`/projects/${projectId}`)
}

const getVarianceClass = (variance: number) => {
  if (variance > 20) return 'text-danger-600 dark:text-danger-400'
  if (variance > 0) return 'text-warning-600 dark:text-warning-400'
  return 'text-success-600 dark:text-success-400'
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return { text: '已完成', class: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' }
    case 'IN_PROGRESS':
      return { text: '進行中', class: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' }
    default:
      return { text: '未開始', class: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' }
  }
}

const exportCSV = () => {
  alert('匯出 CSV 報表')
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Page Header -->
    <div class="page-header">
      <div class="flex items-center gap-3">
        <button
          @click="goBack"
          class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div class="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h1 class="page-title">{{ projectName }} - 工時報表</h1>
          <p class="page-subtitle">查看專案工時分布與成本分析</p>
        </div>
      </div>
      <button @click="exportCSV" class="btn btn-secondary">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        匯出 CSV
      </button>
    </div>

    <!-- Date Range Filter -->
    <div class="flex items-center gap-4 mb-6">
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-600 dark:text-gray-400">日期範圍:</label>
        <input type="date" v-model="dateRange.start" class="form-input w-40" />
        <span class="text-gray-400">~</span>
        <input type="date" v-model="dateRange.end" class="form-input w-40" />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div v-for="i in 3" :key="i" class="card">
        <div class="skeleton h-6 w-24 mb-2"></div>
        <div class="skeleton h-10 w-32"></div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">總工時</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ totalHours }}h</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">預算: {{ budgetHours }}h</p>
          </div>
          <div class="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
            <svg class="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">預算使用率</p>
            <p :class="['text-3xl font-bold', budgetUsage > 90 ? 'text-warning-600 dark:text-warning-400' : 'text-success-600 dark:text-success-400']">
              {{ budgetUsage }}%
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">剩餘: {{ remainingHours }}h</p>
          </div>
          <div class="w-14 h-14 rounded-2xl bg-success-50 dark:bg-success-900/30 flex items-center justify-center">
            <svg class="w-7 h-7 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <div class="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            :class="['h-full rounded-full transition-all', budgetUsage > 90 ? 'bg-warning-500' : 'bg-success-500']"
            :style="{ width: `${Math.min(budgetUsage, 100)}%` }"
          ></div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">預估準確度</p>
            <p :class="['text-3xl font-bold', getVarianceClass(Math.abs(estimateAccuracy))]">
              {{ estimateAccuracy > 0 ? '+' : '' }}{{ estimateAccuracy }}%
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ estimateAccuracy < 0 ? '預估更保守' : '實際超出預估' }}
            </p>
          </div>
          <div class="w-14 h-14 rounded-2xl bg-accent-50 dark:bg-accent-900/30 flex items-center justify-center">
            <svg class="w-7 h-7 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Distribution Charts -->
    <div v-if="!loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- By Category -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">依類別分布</h3>
        <div class="space-y-3">
          <div v-for="cat in categoryEntries" :key="cat.category">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ cat.category }}</span>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ cat.hours }}h ({{ cat.percentage }}%)</span>
            </div>
            <div class="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div :class="['h-full rounded-full', cat.color]" :style="{ width: `${cat.percentage}%` }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- By Member -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">依成員分布</h3>
        <div class="space-y-3">
          <div v-for="member in memberEntries" :key="member.memberId" class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-medium">
              {{ member.memberName.charAt(0) }}
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ member.memberName }}</span>
                <span class="text-sm text-gray-500 dark:text-gray-400">{{ member.hours }}h</span>
              </div>
              <div class="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-primary-500" :style="{ width: `${member.percentage}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Details Table -->
    <div v-if="!loading" class="card overflow-hidden">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">任務明細</h3>
        <select v-model="sortBy" class="form-select w-40">
          <option value="hours">依工時排序</option>
          <option value="name">依名稱排序</option>
          <option value="variance">依差異排序</option>
        </select>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">任務</th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">負責人</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">預估</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">實際</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">差異</th>
              <th class="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">狀態</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="task in sortedTasks"
              :key="task.taskId"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{{ task.taskName }}</td>
              <td class="py-3 px-4 text-gray-600 dark:text-gray-400">{{ task.assignee }}</td>
              <td class="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{{ task.estimatedHours }}h</td>
              <td class="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">{{ task.actualHours }}h</td>
              <td :class="['py-3 px-4 text-right font-medium', getVarianceClass(task.variance)]">
                {{ task.variance > 0 ? '+' : '' }}{{ task.variance }}%
              </td>
              <td class="py-3 px-4 text-center">
                <span :class="['text-xs px-2.5 py-1 rounded-full font-medium', getStatusBadge(task.status).class]">
                  {{ getStatusBadge(task.status).text }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
