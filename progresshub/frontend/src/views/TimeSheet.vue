<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Types
interface TimeEntry {
  id: string
  projectId: string
  projectName: string
  taskId?: string
  taskName?: string
  hours: Record<string, number>
}

interface Project {
  id: string
  name: string
}

// State
const loading = ref(true)
const viewMode = ref<'daily' | 'weekly'>('weekly')
const currentWeekStart = ref(getWeekStart(new Date()))
const entries = ref<TimeEntry[]>([])
const projects = ref<Project[]>([])
const showAddProject = ref(false)
const selectedProjectId = ref('')

// Mock data for demo
onMounted(() => {
  setTimeout(() => {
    projects.value = [
      { id: '1', name: 'ProgressHub 開發' },
      { id: '2', name: '客戶管理系統' },
      { id: '3', name: '行動 App 專案' },
    ]
    entries.value = [
      {
        id: '1',
        projectId: '1',
        projectName: 'ProgressHub 開發',
        hours: { '0': 4, '1': 6, '2': 8, '3': 4, '4': 2 }
      },
      {
        id: '2',
        projectId: '2',
        projectName: '客戶管理系統',
        hours: { '0': 4, '1': 2, '3': 4, '4': 6 }
      },
    ]
    loading.value = false
  }, 500)
})

// Computed
const weekDays = computed(() => {
  const days = []
  const start = new Date(currentWeekStart.value)
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    days.push({
      index: i,
      dayName: ['週一', '週二', '週三', '週四', '週五', '週六', '週日'][i],
      date: date,
      dateStr: `${date.getMonth() + 1}/${date.getDate()}`,
      isWeekend: i >= 5
    })
  }
  return days
})

const weekRangeText = computed(() => {
  const start = new Date(currentWeekStart.value)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const year = start.getFullYear()
  const weekNum = getWeekNumber(start)
  return `${year}年 第${weekNum}週 (${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()})`
})

const dailyTotals = computed(() => {
  const totals: Record<string, number> = {}
  for (let i = 0; i < 7; i++) {
    totals[i] = entries.value.reduce((sum, entry) => sum + (entry.hours[i] || 0), 0)
  }
  return totals
})

const weeklyTotal = computed(() => {
  return Object.values(dailyTotals.value).reduce((sum, val) => sum + val, 0)
})

const getEntryTotal = (entry: TimeEntry) => {
  return Object.values(entry.hours).reduce((sum, val) => sum + val, 0)
}

// Methods
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function prevWeek() {
  const newStart = new Date(currentWeekStart.value)
  newStart.setDate(newStart.getDate() - 7)
  currentWeekStart.value = newStart
}

function nextWeek() {
  const newStart = new Date(currentWeekStart.value)
  newStart.setDate(newStart.getDate() + 7)
  currentWeekStart.value = newStart
}

function updateHours(entryId: string, dayIndex: number, value: string) {
  const entry = entries.value.find(e => e.id === entryId)
  if (entry) {
    const hours = parseFloat(value) || 0
    entry.hours[dayIndex] = Math.min(Math.max(hours, 0), 12)
  }
}

function addProject() {
  if (!selectedProjectId.value) return
  const project = projects.value.find(p => p.id === selectedProjectId.value)
  if (!project) return

  // Check if already exists
  if (entries.value.some(e => e.projectId === project.id)) {
    showAddProject.value = false
    selectedProjectId.value = ''
    return
  }

  entries.value.push({
    id: Date.now().toString(),
    projectId: project.id,
    projectName: project.name,
    hours: {}
  })
  showAddProject.value = false
  selectedProjectId.value = ''
}

function removeEntry(entryId: string) {
  entries.value = entries.value.filter(e => e.id !== entryId)
}

function copyLastWeek() {
  // Mock: just show notification
  alert('已複製上週工時記錄')
}

function submitForApproval() {
  // Mock: just show notification
  alert('已提交審核')
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Page Header -->
    <div class="page-header">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 class="page-title">工時登記</h1>
          <p class="page-subtitle">記錄您的工作時間</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button @click="copyLastWeek" class="btn btn-secondary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          複製上週
        </button>
        <button @click="submitForApproval" class="btn btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          提交審核
        </button>
      </div>
    </div>

    <!-- View Mode Toggle & Week Navigation -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-2">
        <button
          @click="viewMode = 'daily'"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
            viewMode === 'daily'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          ]"
        >
          每日模式
        </button>
        <button
          @click="viewMode = 'weekly'"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
            viewMode === 'weekly'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          ]"
        >
          週報模式
        </button>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="prevWeek"
          class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[200px] text-center">
          {{ weekRangeText }}
        </span>
        <button
          @click="nextWeek"
          class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="card">
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <div class="skeleton h-5 w-32"></div>
          <div v-for="i in 7" :key="i" class="skeleton h-5 w-16"></div>
        </div>
        <div v-for="i in 3" :key="i" class="skeleton h-14 rounded-lg"></div>
      </div>
    </div>

    <!-- Timesheet Table -->
    <div v-else class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-48">
                專案
              </th>
              <th
                v-for="day in weekDays"
                :key="day.index"
                :class="[
                  'text-center py-3 px-2 text-sm font-semibold w-20',
                  day.isWeekend ? 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50' : 'text-gray-700 dark:text-gray-300'
                ]"
              >
                <div>{{ day.dayName }}</div>
                <div class="text-xs font-normal text-gray-500 dark:text-gray-400">{{ day.dateStr }}</div>
              </th>
              <th class="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-20">
                小計
              </th>
              <th class="w-12"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="entry in entries"
              :key="entry.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-primary-500"></div>
                  <span class="font-medium text-gray-900 dark:text-gray-100">{{ entry.projectName }}</span>
                </div>
                <div v-if="entry.taskName" class="text-xs text-gray-500 dark:text-gray-400 ml-4">
                  {{ entry.taskName }}
                </div>
              </td>
              <td
                v-for="day in weekDays"
                :key="day.index"
                :class="[
                  'py-2 px-1 text-center',
                  day.isWeekend ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                ]"
              >
                <input
                  type="number"
                  :value="entry.hours[day.index] || ''"
                  @input="updateHours(entry.id, day.index, ($event.target as HTMLInputElement).value)"
                  min="0"
                  max="12"
                  step="0.25"
                  class="w-16 h-9 text-center text-sm rounded-lg border border-gray-200 dark:border-gray-700
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                         hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  placeholder="-"
                />
              </td>
              <td class="py-3 px-4 text-center">
                <span class="font-semibold text-gray-900 dark:text-gray-100">
                  {{ getEntryTotal(entry) }}h
                </span>
              </td>
              <td class="py-3 px-2">
                <button
                  @click="removeEntry(entry.id)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>

            <!-- Add Project Row -->
            <tr v-if="showAddProject" class="bg-primary-50 dark:bg-primary-900/20">
              <td colspan="10" class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <select
                    v-model="selectedProjectId"
                    class="form-select flex-1 max-w-xs"
                  >
                    <option value="">選擇專案...</option>
                    <option v-for="project in projects" :key="project.id" :value="project.id">
                      {{ project.name }}
                    </option>
                  </select>
                  <button @click="addProject" class="btn btn-primary btn-sm">
                    新增
                  </button>
                  <button @click="showAddProject = false; selectedProjectId = ''" class="btn btn-secondary btn-sm">
                    取消
                  </button>
                </div>
              </td>
            </tr>

            <!-- Add Project Button -->
            <tr v-if="!showAddProject">
              <td colspan="10" class="py-3 px-4">
                <button
                  @click="showAddProject = true"
                  class="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  新增專案
                </button>
              </td>
            </tr>

            <!-- Daily Totals -->
            <tr class="bg-gray-50 dark:bg-gray-800/80 font-semibold">
              <td class="py-3 px-4 text-gray-700 dark:text-gray-300">每日合計</td>
              <td
                v-for="day in weekDays"
                :key="day.index"
                :class="[
                  'py-3 px-2 text-center',
                  day.isWeekend ? 'bg-gray-100 dark:bg-gray-700/50' : '',
                  dailyTotals[day.index] > 8 ? 'text-warning-600 dark:text-warning-400' : 'text-gray-900 dark:text-gray-100'
                ]"
              >
                {{ dailyTotals[day.index] || '-' }}
              </td>
              <td class="py-3 px-4 text-center text-primary-600 dark:text-primary-400 text-lg">
                {{ weeklyTotal }}h
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Week Summary -->
    <div class="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-gray-400"></span>
          草稿
        </span>
        <span class="mx-2">|</span>
        <span>週目標: 40h</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-sm">
          <span class="text-gray-500 dark:text-gray-400">本週進度:</span>
          <span :class="[
            'ml-2 font-semibold',
            weeklyTotal >= 40 ? 'text-success-600 dark:text-success-400' : 'text-gray-900 dark:text-gray-100'
          ]">
            {{ weeklyTotal }} / 40h
          </span>
        </div>
        <div class="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500 bg-gradient-to-r"
            :class="weeklyTotal >= 40 ? 'from-success-500 to-success-600' : 'from-primary-500 to-primary-600'"
            :style="{ width: `${Math.min((weeklyTotal / 40) * 100, 100)}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
