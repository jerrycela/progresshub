<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Types
interface ProjectCost {
  projectId: string
  projectName: string
  totalHours: number
  billableHours: number
  totalCost: number
  budget: number
  budgetUsage: number
  status: 'under' | 'warning' | 'over'
}

interface MemberCost {
  memberId: string
  memberName: string
  role: string
  hourlyRate: number
  totalHours: number
  billableHours: number
  totalCost: number
}

interface MonthlyCost {
  month: string
  cost: number
  hours: number
}

// State
const loading = ref(true)
const selectedMonth = ref('2026-01')
const projectCosts = ref<ProjectCost[]>([])
const memberCosts = ref<MemberCost[]>([])
const monthlyCosts = ref<MonthlyCost[]>([])
const totalCost = ref(0)
const totalBudget = ref(0)
const totalHours = ref(0)
const avgHourlyRate = ref(0)

// Mock data
onMounted(() => {
  setTimeout(() => {
    projectCosts.value = [
      { projectId: '1', projectName: 'ProgressHub 開發', totalHours: 248.5, billableHours: 220, totalCost: 440000, budget: 600000, budgetUsage: 73, status: 'under' },
      { projectId: '2', projectName: '客戶管理系統', totalHours: 180, billableHours: 165, totalCost: 330000, budget: 350000, budgetUsage: 94, status: 'warning' },
      { projectId: '3', projectName: '行動 App 專案', totalHours: 120, billableHours: 100, totalCost: 200000, budget: 180000, budgetUsage: 111, status: 'over' },
    ]

    memberCosts.value = [
      { memberId: '1', memberName: 'Alice Lin', role: 'Senior Developer', hourlyRate: 2500, totalHours: 168, billableHours: 150, totalCost: 375000 },
      { memberId: '2', memberName: 'Bob Wang', role: 'Developer', hourlyRate: 2000, totalHours: 160, billableHours: 145, totalCost: 290000 },
      { memberId: '3', memberName: 'Carol Wu', role: 'Designer', hourlyRate: 1800, totalHours: 140, billableHours: 120, totalCost: 216000 },
      { memberId: '4', memberName: 'David Chen', role: 'QA Engineer', hourlyRate: 1500, totalHours: 80, billableHours: 70, totalCost: 105000 },
    ]

    monthlyCosts.value = [
      { month: '2025-10', cost: 850000, hours: 480 },
      { month: '2025-11', cost: 920000, hours: 520 },
      { month: '2025-12', cost: 780000, hours: 440 },
      { month: '2026-01', cost: 970000, hours: 548.5 },
    ]

    totalCost.value = 970000
    totalBudget.value = 1130000
    totalHours.value = 548.5
    avgHourlyRate.value = 1768

    loading.value = false
  }, 500)
})

// Computed
const budgetUsagePercentage = computed(() => Math.round((totalCost.value / totalBudget.value) * 100))
const maxMonthlyCost = computed(() => Math.max(...monthlyCosts.value.map(m => m.cost)))

// Methods
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(value)
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'under':
      return { text: '預算內', class: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' }
    case 'warning':
      return { text: '接近預算', class: 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400' }
    case 'over':
      return { text: '超出預算', class: 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400' }
    default:
      return { text: status, class: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' }
  }
}

const getBarHeight = (cost: number) => {
  return (cost / maxMonthlyCost.value) * 100
}

const exportPDF = () => {
  alert('匯出 PDF 報表')
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
        <div class="w-10 h-10 rounded-xl bg-danger-50 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 class="page-title">成本分析報表</h1>
          <p class="page-subtitle">查看專案人力成本與預算分析</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="exportExcel" class="btn btn-secondary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel
        </button>
        <button @click="exportPDF" class="btn btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          PDF
        </button>
      </div>
    </div>

    <!-- Date Filter -->
    <div class="flex items-center gap-4 mb-6">
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-600 dark:text-gray-400">報表月份:</label>
        <input type="month" v-model="selectedMonth" class="form-input w-40" />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div v-for="i in 4" :key="i" class="card">
        <div class="skeleton h-5 w-20 mb-2"></div>
        <div class="skeleton h-8 w-28"></div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="card">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">總成本</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ formatCurrency(totalCost) }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">本月累計</p>
      </div>

      <div class="card">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">預算使用率</p>
        <p :class="['text-2xl font-bold', budgetUsagePercentage > 100 ? 'text-danger-600 dark:text-danger-400' : budgetUsagePercentage > 85 ? 'text-warning-600 dark:text-warning-400' : 'text-success-600 dark:text-success-400']">
          {{ budgetUsagePercentage }}%
        </p>
        <div class="mt-2 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            :class="['h-full rounded-full', budgetUsagePercentage > 100 ? 'bg-danger-500' : budgetUsagePercentage > 85 ? 'bg-warning-500' : 'bg-success-500']"
            :style="{ width: `${Math.min(budgetUsagePercentage, 100)}%` }"
          ></div>
        </div>
      </div>

      <div class="card">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">總計費工時</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ totalHours }}h</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">本月累計</p>
      </div>

      <div class="card">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">平均時薪</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ formatCurrency(avgHourlyRate) }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">團隊平均</p>
      </div>
    </div>

    <!-- Charts Row -->
    <div v-if="!loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Monthly Trend -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">月度成本趨勢</h3>
        <div class="h-48 flex items-end justify-between gap-4">
          <div
            v-for="month in monthlyCosts"
            :key="month.month"
            class="flex-1 flex flex-col items-center gap-2"
          >
            <div class="w-full flex justify-center">
              <div
                class="w-12 rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400 transition-all duration-500"
                :style="{ height: `${getBarHeight(month.cost)}%`, minHeight: '20px' }"
              ></div>
            </div>
            <div class="text-center">
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ (month.cost / 10000).toFixed(0) }}萬</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ month.month.slice(5) }}月</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Project Cost Breakdown -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">專案成本分布</h3>
        <div class="space-y-4">
          <div v-for="project in projectCosts" :key="project.projectId">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ project.projectName }}</span>
                <span :class="['text-xs px-2 py-0.5 rounded-full', getStatusBadge(project.status).class]">
                  {{ getStatusBadge(project.status).text }}
                </span>
              </div>
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ formatCurrency(project.totalCost) }}</span>
            </div>
            <div class="relative h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                :class="['h-full rounded-full transition-all', project.status === 'over' ? 'bg-danger-500' : project.status === 'warning' ? 'bg-warning-500' : 'bg-success-500']"
                :style="{ width: `${Math.min(project.budgetUsage, 100)}%` }"
              ></div>
              <!-- Budget line indicator -->
              <div class="absolute top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-600" style="left: 100%"></div>
            </div>
            <div class="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{{ project.billableHours }}h 計費</span>
              <span>預算 {{ formatCurrency(project.budget) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Member Cost Table -->
    <div v-if="!loading" class="card overflow-hidden">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">成員成本明細</h3>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">成員</th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">職位</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">時薪</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">總工時</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">計費工時</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">總成本</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="member in memberCosts"
              :key="member.memberId"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="py-4 px-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-medium">
                    {{ member.memberName.charAt(0) }}
                  </div>
                  <span class="font-medium text-gray-900 dark:text-gray-100">{{ member.memberName }}</span>
                </div>
              </td>
              <td class="py-4 px-4 text-gray-600 dark:text-gray-400">{{ member.role }}</td>
              <td class="py-4 px-4 text-right text-gray-600 dark:text-gray-400">{{ formatCurrency(member.hourlyRate) }}/h</td>
              <td class="py-4 px-4 text-right text-gray-600 dark:text-gray-400">{{ member.totalHours }}h</td>
              <td class="py-4 px-4 text-right text-gray-600 dark:text-gray-400">{{ member.billableHours }}h</td>
              <td class="py-4 px-4 text-right font-semibold text-gray-900 dark:text-gray-100">{{ formatCurrency(member.totalCost) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="bg-gray-50 dark:bg-gray-800/80 font-semibold">
              <td colspan="3" class="py-3 px-4 text-gray-700 dark:text-gray-300">合計</td>
              <td class="py-3 px-4 text-right text-gray-900 dark:text-gray-100">{{ totalHours }}h</td>
              <td class="py-3 px-4 text-right text-gray-900 dark:text-gray-100">{{ memberCosts.reduce((sum, m) => sum + m.billableHours, 0) }}h</td>
              <td class="py-3 px-4 text-right text-primary-600 dark:text-primary-400">{{ formatCurrency(totalCost) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>
