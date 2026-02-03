<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Types
interface TimeEntry {
  id: string
  employeeId: string
  employeeName: string
  projectName: string
  taskName?: string
  weekRange: string
  totalHours: number
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  entries: { date: string; hours: number; description?: string }[]
}

// State
const loading = ref(true)
const filter = ref<'all' | 'pending' | 'approved' | 'rejected'>('pending')
const selectedEntries = ref<string[]>([])
const timeEntries = ref<TimeEntry[]>([])
const showRejectModal = ref(false)
const rejectingEntryId = ref<string | null>(null)
const rejectReason = ref('')
const expandedEntryId = ref<string | null>(null)

// Mock data
onMounted(() => {
  setTimeout(() => {
    timeEntries.value = [
      {
        id: '1',
        employeeId: '1',
        employeeName: 'Alice Lin',
        projectName: 'ProgressHub 開發',
        weekRange: '1/27 - 2/2',
        totalHours: 40,
        status: 'pending',
        submittedAt: '2026-02-02 09:30',
        entries: [
          { date: '1/27', hours: 8, description: '完成登入功能開發' },
          { date: '1/28', hours: 8, description: 'Code review 與 bug 修復' },
          { date: '1/29', hours: 8, description: '工時系統 UI 設計' },
          { date: '1/30', hours: 8, description: '前端頁面實作' },
          { date: '1/31', hours: 8, description: '整合測試' },
        ]
      },
      {
        id: '2',
        employeeId: '2',
        employeeName: 'Bob Wang',
        projectName: '客戶管理系統',
        weekRange: '1/27 - 2/2',
        totalHours: 38,
        status: 'pending',
        submittedAt: '2026-02-02 10:15',
        entries: [
          { date: '1/27', hours: 7, description: 'API 開發' },
          { date: '1/28', hours: 8, description: '資料庫設計' },
          { date: '1/29', hours: 7, description: '後端測試' },
          { date: '1/30', hours: 8, description: '文件撰寫' },
          { date: '1/31', hours: 8, description: '部署準備' },
        ]
      },
      {
        id: '3',
        employeeId: '3',
        employeeName: 'Carol Wu',
        projectName: '行動 App 專案',
        taskName: 'UI 重構',
        weekRange: '1/27 - 2/2',
        totalHours: 45,
        status: 'pending',
        submittedAt: '2026-02-01 18:00',
        entries: [
          { date: '1/27', hours: 9, description: '緊急修復上線問題' },
          { date: '1/28', hours: 10, description: '繼續修復與測試' },
          { date: '1/29', hours: 8, description: 'UI 重構' },
          { date: '1/30', hours: 9, description: '效能優化' },
          { date: '1/31', hours: 9, description: '整合測試' },
        ]
      },
      {
        id: '4',
        employeeId: '1',
        employeeName: 'Alice Lin',
        projectName: 'ProgressHub 開發',
        weekRange: '1/20 - 1/26',
        totalHours: 40,
        status: 'approved',
        submittedAt: '2026-01-26 17:00',
        entries: []
      },
      {
        id: '5',
        employeeId: '4',
        employeeName: 'David Chen',
        projectName: '客戶管理系統',
        weekRange: '1/20 - 1/26',
        totalHours: 32,
        status: 'rejected',
        submittedAt: '2026-01-26 16:30',
        entries: []
      },
    ]
    loading.value = false
  }, 500)
})

// Computed
const filteredEntries = computed(() => {
  if (filter.value === 'all') return timeEntries.value
  return timeEntries.value.filter(e => e.status === filter.value)
})

const pendingCount = computed(() => timeEntries.value.filter(e => e.status === 'pending').length)

const isAllSelected = computed(() => {
  const pendingIds = filteredEntries.value.filter(e => e.status === 'pending').map(e => e.id)
  return pendingIds.length > 0 && pendingIds.every(id => selectedEntries.value.includes(id))
})

// Methods
const toggleSelectAll = () => {
  const pendingIds = filteredEntries.value.filter(e => e.status === 'pending').map(e => e.id)
  if (isAllSelected.value) {
    selectedEntries.value = []
  } else {
    selectedEntries.value = pendingIds
  }
}

const toggleSelect = (id: string) => {
  const index = selectedEntries.value.indexOf(id)
  if (index > -1) {
    selectedEntries.value.splice(index, 1)
  } else {
    selectedEntries.value.push(id)
  }
}

const toggleExpand = (id: string) => {
  expandedEntryId.value = expandedEntryId.value === id ? null : id
}

const approveEntry = (id: string) => {
  const entry = timeEntries.value.find(e => e.id === id)
  if (entry) {
    entry.status = 'approved'
    selectedEntries.value = selectedEntries.value.filter(eid => eid !== id)
  }
}

const approveSelected = () => {
  selectedEntries.value.forEach(id => {
    const entry = timeEntries.value.find(e => e.id === id)
    if (entry && entry.status === 'pending') {
      entry.status = 'approved'
    }
  })
  selectedEntries.value = []
}

const openRejectModal = (id: string) => {
  rejectingEntryId.value = id
  rejectReason.value = ''
  showRejectModal.value = true
}

const confirmReject = () => {
  if (!rejectReason.value.trim()) {
    alert('請填寫駁回原因')
    return
  }
  const entry = timeEntries.value.find(e => e.id === rejectingEntryId.value)
  if (entry) {
    entry.status = 'rejected'
    selectedEntries.value = selectedEntries.value.filter(eid => eid !== entry.id)
  }
  showRejectModal.value = false
  rejectingEntryId.value = null
  rejectReason.value = ''
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return { text: '待審核', class: 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400' }
    case 'approved':
      return { text: '已核准', class: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' }
    case 'rejected':
      return { text: '已駁回', class: 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400' }
    default:
      return { text: status, class: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400' }
  }
}

const isOvertime = (hours: number) => hours > 40
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Page Header -->
    <div class="page-header">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-warning-50 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 class="page-title">工時審核</h1>
          <p class="page-subtitle">審核團隊成員的工時記錄</p>
        </div>
      </div>
      <div v-if="selectedEntries.length > 0" class="flex items-center gap-3">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          已選擇 {{ selectedEntries.length }} 筆
        </span>
        <button @click="approveSelected" class="btn btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          批次核准
        </button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex items-center gap-2 mb-6">
      <button
        v-for="f in ['pending', 'approved', 'rejected', 'all'] as const"
        :key="f"
        @click="filter = f"
        :class="[
          'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
          filter === f
            ? 'bg-primary-600 text-white shadow-md'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        ]"
      >
        {{ f === 'pending' ? '待審核' : f === 'approved' ? '已核准' : f === 'rejected' ? '已駁回' : '全部' }}
        <span
          v-if="f === 'pending' && pendingCount > 0"
          class="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/20"
        >
          {{ pendingCount }}
        </span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="card">
      <div class="space-y-4">
        <div v-for="i in 3" :key="i" class="skeleton h-20 rounded-lg"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredEntries.length === 0" class="card">
      <div class="empty-state py-12">
        <svg class="empty-state-icon w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="empty-state-title">沒有待審核的工時</p>
        <p class="empty-state-description">目前沒有需要審核的工時記錄</p>
      </div>
    </div>

    <!-- Entries List -->
    <div v-else class="space-y-4">
      <!-- Select All (only for pending) -->
      <div v-if="filter === 'pending' || filter === 'all'" class="flex items-center gap-3 px-4">
        <input
          type="checkbox"
          :checked="isAllSelected"
          @change="toggleSelectAll"
          class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
        />
        <span class="text-sm text-gray-600 dark:text-gray-400">全選待審核項目</span>
      </div>

      <!-- Entry Cards -->
      <div
        v-for="entry in filteredEntries"
        :key="entry.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex items-start gap-4">
          <!-- Checkbox (only for pending) -->
          <div v-if="entry.status === 'pending'" class="pt-1">
            <input
              type="checkbox"
              :checked="selectedEntries.includes(entry.id)"
              @change="toggleSelect(entry.id)"
              class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
            />
          </div>

          <!-- Avatar -->
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg">
            {{ entry.employeeName.charAt(0) }}
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ entry.employeeName }}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ entry.projectName }}
                  <span v-if="entry.taskName" class="text-gray-400 dark:text-gray-500"> / {{ entry.taskName }}</span>
                </p>
              </div>
              <span :class="['text-xs px-2.5 py-1 rounded-full font-medium', getStatusBadge(entry.status).class]">
                {{ getStatusBadge(entry.status).text }}
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ entry.weekRange }}
              </span>
              <span class="flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span :class="isOvertime(entry.totalHours) ? 'text-warning-600 dark:text-warning-400 font-medium' : ''">
                  {{ entry.totalHours }}h
                </span>
                <span v-if="isOvertime(entry.totalHours)" class="text-xs text-warning-600 dark:text-warning-400">(超時)</span>
              </span>
              <span class="text-gray-400 dark:text-gray-500">
                提交於 {{ entry.submittedAt }}
              </span>
            </div>

            <!-- Expandable Details -->
            <div v-if="entry.entries.length > 0">
              <button
                @click="toggleExpand(entry.id)"
                class="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
              >
                <svg
                  :class="['w-4 h-4 transition-transform', expandedEntryId === entry.id ? 'rotate-180' : '']"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
                {{ expandedEntryId === entry.id ? '收起明細' : '查看明細' }}
              </button>

              <div v-if="expandedEntryId === entry.id" class="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div class="space-y-2">
                  <div
                    v-for="(detail, index) in entry.entries"
                    :key="index"
                    class="flex items-center justify-between text-sm"
                  >
                    <span class="text-gray-600 dark:text-gray-400">{{ detail.date }}</span>
                    <span class="flex-1 mx-4 text-gray-700 dark:text-gray-300">{{ detail.description }}</span>
                    <span class="font-medium text-gray-900 dark:text-gray-100">{{ detail.hours }}h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions (only for pending) -->
          <div v-if="entry.status === 'pending'" class="flex items-center gap-2">
            <button
              @click="approveEntry(entry.id)"
              class="p-2 rounded-lg text-success-600 hover:bg-success-50 dark:hover:bg-success-900/30 transition-colors"
              title="核准"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              @click="openRejectModal(entry.id)"
              class="p-2 rounded-lg text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 transition-colors"
              title="駁回"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <Teleport to="body">
      <div
        v-if="showRejectModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/50"
          @click="showRejectModal = false"
        ></div>
        <div class="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">駁回工時</h3>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              駁回原因 <span class="text-danger-500">*</span>
            </label>
            <textarea
              v-model="rejectReason"
              rows="3"
              class="form-textarea w-full"
              placeholder="請輸入駁回原因..."
            ></textarea>
          </div>
          <div class="flex items-center justify-end gap-3">
            <button
              @click="showRejectModal = false"
              class="btn btn-secondary"
            >
              取消
            </button>
            <button
              @click="confirmReject"
              class="btn bg-danger-600 hover:bg-danger-700 text-white"
            >
              確認駁回
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
