<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Types
interface WeeklyStats {
  weekNum: number
  weekRange: string
  hours: number
  target: number
}

interface ProjectStats {
  projectId: string
  projectName: string
  hours: number
  percentage: number
  color: string
}

interface CategoryStats {
  category: string
  hours: number
  percentage: number
  color: string
}

// State
const loading = ref(true)
const selectedPeriod = ref<'week' | 'month' | 'quarter'>('month')
const weeklyStats = ref<WeeklyStats[]>([])
const projectStats = ref<ProjectStats[]>([])
const categoryStats = ref<CategoryStats[]>([])
const totalHours = ref(0)
const avgDaily = ref(0)
const utilizationRate = ref(0)

// Mock data for demo
onMounted(() => {
  setTimeout(() => {
    weeklyStats.value = [
      { weekNum: 1, weekRange: '1/6-1/12', hours: 38, target: 40 },
      { weekNum: 2, weekRange: '1/13-1/19', hours: 42, target: 40 },
      { weekNum: 3, weekRange: '1/20-1/26', hours: 36, target: 40 },
      { weekNum: 4, weekRange: '1/27-2/2', hours: 40, target: 40 },
    ]
    projectStats.value = [
      { projectId: '1', projectName: 'ProgressHub 開發', hours: 98, percentage: 62.8, color: 'bg-primary-500' },
      { projectId: '2', projectName: '客戶管理系統', hours: 42, percentage: 26.9, color: 'bg-accent-500' },
      { projectId: '3', projectName: '行動 App 專案', hours: 16, percentage: 10.3, color: 'bg-success-500' },
    ]
    categoryStats.value = [
      { category: '開發', hours: 92, percentage: 59, color: 'bg-blue-500' },
      { category: '測試', hours: 28, percentage: 18, color: 'bg-green-500' },
      { category: '會議', hours: 18, percentage: 11.5, color: 'bg-yellow-500' },
      { category: 'Code Review', hours: 12, percentage: 7.7, color: 'bg-orange-500' },
      { category: '其他', hours: 6, percentage: 3.8, color: 'bg-gray-500' },
    ]
    totalHours.value = 156
    avgDaily.value = 7.8
    utilizationRate.value = 97.5
    loading.value = false
  }, 500)
})

// Computed
const maxWeeklyHours = computed(() => {
  return Math.max(...weeklyStats.value.map(w => Math.max(w.hours, w.target)), 40)
})

// Methods
const getBarHeight = (hours: number) => {
  return (hours / maxWeeklyHours.value) * 100
}

const getUtilizationColor = (rate: number) => {
  if (rate > 100) return 'text-warning-600 dark:text-warning-400'
  if (rate >= 85) return 'text-success-600 dark:text-success-400'
  if (rate >= 70) return 'text-primary-600 dark:text-primary-400'
  return 'text-gray-600 dark:text-gray-400'
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Page Header -->
    <div class="page-header">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h1 class="page-title">我的工時統計</h1>
          <p class="page-subtitle">分析您的工作時間分布</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-for="period in ['week', 'month', 'quarter'] as const"
          :key="period"
          @click="selectedPeriod = period"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
            selectedPeriod === period
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          ]"
        >
          {{ period === 'week' ? '本週' : period === 'month' ? '本月' : '本季' }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div v-for="i in 3" :key="i" class="card">
        <div class="skeleton h-6 w-20 mb-2"></div>
        <div class="skeleton h-10 w-32"></div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">總工時</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ totalHours }}h</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">本月累計</p>
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
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">平均每日</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ avgDaily }}h</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">工作日平均</p>
          </div>
          <div class="w-14 h-14 rounded-2xl bg-accent-50 dark:bg-accent-900/30 flex items-center justify-center">
            <svg class="w-7 h-7 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">利用率</p>
            <p :class="['text-3xl font-bold', getUtilizationColor(utilizationRate)]">{{ utilizationRate }}%</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">目標 160h/月</p>
          </div>
          <div class="w-14 h-14 rounded-2xl bg-success-50 dark:bg-success-900/30 flex items-center justify-center">
            <svg class="w-7 h-7 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Grid -->
    <div v-if="!loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Weekly Trend Chart -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">週工時趨勢</h3>
        <div class="h-48 flex items-end justify-between gap-4">
          <div
            v-for="week in weeklyStats"
            :key="week.weekNum"
            class="flex-1 flex flex-col items-center gap-2"
          >
            <div class="w-full h-40 flex items-end justify-center gap-1">
              <!-- Actual hours bar -->
              <div
                class="w-8 rounded-t-lg transition-all duration-500 bg-gradient-to-t from-primary-600 to-primary-400"
                :style="{ height: `${getBarHeight(week.hours)}%` }"
              ></div>
              <!-- Target line indicator -->
              <div
                class="w-8 rounded-t-lg bg-gray-200 dark:bg-gray-700 opacity-50"
                :style="{ height: `${getBarHeight(week.target)}%` }"
              ></div>
            </div>
            <div class="text-center">
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ week.hours }}h</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ week.weekRange }}</p>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <span class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span class="w-3 h-3 rounded bg-primary-500"></span>
            實際工時
          </span>
          <span class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span class="w-3 h-3 rounded bg-gray-300 dark:bg-gray-600"></span>
            目標工時
          </span>
        </div>
      </div>

      <!-- Project Distribution -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">專案分布</h3>
        <div class="space-y-4">
          <div
            v-for="project in projectStats"
            :key="project.projectId"
            class="group"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ project.projectName }}</span>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ project.hours }}h ({{ project.percentage }}%)</span>
            </div>
            <div class="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                :class="['h-full rounded-full transition-all duration-500', project.color]"
                :style="{ width: `${project.percentage}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Distribution -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">工作類別</h3>
        <div class="flex items-center gap-6">
          <!-- Donut Chart Placeholder -->
          <div class="relative w-36 h-36">
            <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
              <circle
                v-for="(cat, index) in categoryStats"
                :key="cat.category"
                cx="50"
                cy="50"
                r="40"
                fill="none"
                :stroke="cat.color.replace('bg-', 'var(--color-')"
                stroke-width="20"
                :stroke-dasharray="`${cat.percentage * 2.51} 251`"
                :stroke-dashoffset="-categoryStats.slice(0, index).reduce((sum, c) => sum + c.percentage * 2.51, 0)"
                :class="cat.color.replace('bg-', 'stroke-')"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ totalHours }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">總時數</span>
            </div>
          </div>
          <!-- Legend -->
          <div class="flex-1 space-y-2">
            <div
              v-for="cat in categoryStats"
              :key="cat.category"
              class="flex items-center justify-between"
            >
              <span class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span :class="['w-3 h-3 rounded', cat.color]"></span>
                {{ cat.category }}
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ cat.hours }}h</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">快速操作</h3>
        <div class="space-y-3">
          <RouterLink
            to="/timesheet"
            class="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
          >
            <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900 dark:text-gray-100">登記工時</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">記錄今日工作時間</p>
            </div>
            <svg class="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </RouterLink>

          <button
            class="w-full flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group text-left"
          >
            <div class="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
              <svg class="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900 dark:text-gray-100">匯出報表</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">下載 CSV 或 Excel 格式</p>
            </div>
            <svg class="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
