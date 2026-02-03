<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Types
interface TeamMember {
  id: string
  name: string
  avatar?: string
  actualHours: number
  standardHours: number
  utilizationRate: number
  projects: { name: string; percentage: number; color: string }[]
}

// State
const loading = ref(true)
const selectedMonth = ref('2026-01')
const selectedDepartment = ref('')
const selectedProject = ref('')
const teamMembers = ref<TeamMember[]>([])
const teamAvgUtilization = ref(0)
const standardMonthlyHours = ref(160)

// Mock data
onMounted(() => {
  setTimeout(() => {
    teamMembers.value = [
      {
        id: '1',
        name: 'David Chen',
        actualHours: 168,
        standardHours: 160,
        utilizationRate: 105,
        projects: [
          { name: 'ProgressHub', percentage: 60, color: 'bg-primary-500' },
          { name: '客戶系統', percentage: 40, color: 'bg-accent-500' },
        ]
      },
      {
        id: '2',
        name: 'Bob Wang',
        actualHours: 147,
        standardHours: 160,
        utilizationRate: 92,
        projects: [
          { name: 'ProgressHub', percentage: 80, color: 'bg-primary-500' },
          { name: '行動 App', percentage: 20, color: 'bg-success-500' },
        ]
      },
      {
        id: '3',
        name: 'Alice Lin',
        actualHours: 136,
        standardHours: 160,
        utilizationRate: 85,
        projects: [
          { name: '客戶系統', percentage: 70, color: 'bg-accent-500' },
          { name: 'ProgressHub', percentage: 30, color: 'bg-primary-500' },
        ]
      },
      {
        id: '4',
        name: 'Carol Wu',
        actualHours: 88,
        standardHours: 160,
        utilizationRate: 55,
        projects: [
          { name: '行動 App', percentage: 100, color: 'bg-success-500' },
        ]
      },
      {
        id: '5',
        name: 'Eric Liu',
        actualHours: 152,
        standardHours: 160,
        utilizationRate: 95,
        projects: [
          { name: 'ProgressHub', percentage: 50, color: 'bg-primary-500' },
          { name: '客戶系統', percentage: 30, color: 'bg-accent-500' },
          { name: '行動 App', percentage: 20, color: 'bg-success-500' },
        ]
      },
    ]
    teamAvgUtilization.value = 78
    loading.value = false
  }, 500)
})

// Computed
const sortedMembers = computed(() => {
  return [...teamMembers.value].sort((a, b) => b.utilizationRate - a.utilizationRate)
})

const overloadedCount = computed(() => {
  return teamMembers.value.filter(m => m.utilizationRate > 100).length
})

const underloadedCount = computed(() => {
  return teamMembers.value.filter(m => m.utilizationRate < 70).length
})

const optimalCount = computed(() => {
  return teamMembers.value.filter(m => m.utilizationRate >= 70 && m.utilizationRate <= 100).length
})

// Methods
const getUtilizationColor = (rate: number) => {
  if (rate > 100) return 'text-warning-600 dark:text-warning-400'
  if (rate >= 85) return 'text-success-600 dark:text-success-400'
  if (rate >= 70) return 'text-primary-600 dark:text-primary-400'
  return 'text-gray-500 dark:text-gray-400'
}

const getUtilizationBgColor = (rate: number) => {
  if (rate > 100) return 'bg-warning-500'
  if (rate >= 85) return 'bg-success-500'
  if (rate >= 70) return 'bg-primary-500'
  return 'bg-gray-400'
}

const getStatusBadge = (rate: number) => {
  if (rate > 100) return { text: '過載', class: 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400' }
  if (rate < 70) return { text: '低載', class: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' }
  return null
}

const exportExcel = () => {
  alert('匯出 Excel 報表')
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Page Header -->
    <div class="page-header">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-success-50 dark:bg-success-900/30 text-success-600 dark:text-success-400 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <h1 class="page-title">團隊利用率報表</h1>
          <p class="page-subtitle">查看團隊成員的工作負載</p>
        </div>
      </div>
      <button @click="exportExcel" class="btn btn-secondary">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        匯出 Excel
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-4 mb-6">
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-600 dark:text-gray-400">部門:</label>
        <select v-model="selectedDepartment" class="form-select w-40">
          <option value="">所有部門</option>
          <option value="dev">開發部</option>
          <option value="design">設計部</option>
          <option value="qa">QA 部</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-600 dark:text-gray-400">專案:</label>
        <select v-model="selectedProject" class="form-select w-40">
          <option value="">所有專案</option>
          <option value="1">ProgressHub</option>
          <option value="2">客戶系統</option>
          <option value="3">行動 App</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-600 dark:text-gray-400">日期:</label>
        <input type="month" v-model="selectedMonth" class="form-input w-40" />
      </div>
    </div>

    <!-- Summary Cards -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div v-for="i in 4" :key="i" class="card">
        <div class="skeleton h-6 w-24 mb-2"></div>
        <div class="skeleton h-8 w-16"></div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="card">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">團隊平均利用率</p>
        <p :class="['text-2xl font-bold', getUtilizationColor(teamAvgUtilization)]">{{ teamAvgUtilization }}%</p>
        <div class="mt-2 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            :class="['h-full rounded-full', getUtilizationBgColor(teamAvgUtilization)]"
            :style="{ width: `${Math.min(teamAvgUtilization, 100)}%` }"
          ></div>
        </div>
      </div>

      <div class="card">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">最佳負載</p>
        <p class="text-2xl font-bold text-success-600 dark:text-success-400">{{ optimalCount }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">70-100% 利用率</p>
      </div>

      <div class="card">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">過載成員</p>
        <p class="text-2xl font-bold text-warning-600 dark:text-warning-400">{{ overloadedCount }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">&gt;100% 利用率</p>
      </div>

      <div class="card">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">低載成員</p>
        <p class="text-2xl font-bold text-gray-600 dark:text-gray-400">{{ underloadedCount }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">&lt;70% 利用率</p>
      </div>
    </div>

    <!-- Optimal Range Indicator -->
    <div class="card mb-6 bg-gradient-to-r from-success-50 to-primary-50 dark:from-success-900/20 dark:to-primary-900/20 border-success-200 dark:border-success-800">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-success-100 dark:bg-success-900/50 flex items-center justify-center">
          <svg class="w-5 h-5 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p class="font-medium text-gray-900 dark:text-gray-100">最佳利用率區間: 70% - 85%</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">標準工時: {{ standardMonthlyHours }}h/月</p>
        </div>
      </div>
    </div>

    <!-- Member Details Table -->
    <div v-if="loading" class="card">
      <div class="space-y-4">
        <div class="skeleton h-10 w-full"></div>
        <div v-for="i in 5" :key="i" class="skeleton h-16"></div>
      </div>
    </div>

    <div v-else class="card overflow-hidden">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">成員明細</h3>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">成員</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">實際工時</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">標準工時</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">利用率</th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-64">專案分布</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="member in sortedMembers"
              :key="member.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="py-4 px-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold">
                    {{ member.name.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-gray-100">{{ member.name }}</p>
                    <span
                      v-if="getStatusBadge(member.utilizationRate)"
                      :class="['text-xs px-2 py-0.5 rounded-full', getStatusBadge(member.utilizationRate)?.class]"
                    >
                      {{ getStatusBadge(member.utilizationRate)?.text }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="py-4 px-4 text-right font-medium text-gray-900 dark:text-gray-100">
                {{ member.actualHours }}h
              </td>
              <td class="py-4 px-4 text-right text-gray-600 dark:text-gray-400">
                {{ member.standardHours }}h
              </td>
              <td class="py-4 px-4 text-right">
                <span :class="['font-bold', getUtilizationColor(member.utilizationRate)]">
                  {{ member.utilizationRate }}%
                </span>
              </td>
              <td class="py-4 px-4">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                    <div
                      v-for="project in member.projects"
                      :key="project.name"
                      :class="['h-full', project.color]"
                      :style="{ width: `${project.percentage}%` }"
                      :title="`${project.name}: ${project.percentage}%`"
                    ></div>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2 mt-1">
                  <span
                    v-for="project in member.projects"
                    :key="project.name"
                    class="text-xs text-gray-500 dark:text-gray-400"
                  >
                    <span :class="['inline-block w-2 h-2 rounded mr-1', project.color]"></span>
                    {{ project.name }} {{ project.percentage }}%
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Suggestions -->
    <div v-if="!loading && underloadedCount > 0" class="mt-6 card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <div>
          <p class="font-medium text-blue-900 dark:text-blue-100">建議</p>
          <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
            {{ teamMembers.filter(m => m.utilizationRate < 70).map(m => m.name).join('、') }} 有較多可用產能，可考慮分配更多任務。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
