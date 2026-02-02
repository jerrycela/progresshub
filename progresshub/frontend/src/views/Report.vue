<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { tasksApi, progressApi } from '@/api'
import type { Task } from '@/types'

const loading = ref(true)
const submitting = ref(false)
const tasks = ref<Task[]>([])
const selectedTaskId = ref('')
const progressPercentage = ref(0)
const notes = ref('')
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const selectedTask = computed(() =>
  tasks.value.find((t) => t.id === selectedTaskId.value)
)

onMounted(async () => {
  try {
    const response = await tasksApi.getMy()
    tasks.value = response.data.tasks.filter((t) => t.status !== 'COMPLETED')
  } catch (error) {
    console.error('Failed to load tasks:', error)
  } finally {
    loading.value = false
  }
})

const handleSubmit = async () => {
  if (!selectedTaskId.value) {
    message.value = { type: 'error', text: '請選擇任務' }
    return
  }

  submitting.value = true
  message.value = null

  try {
    await progressApi.submit({
      taskId: selectedTaskId.value,
      progressPercentage: progressPercentage.value,
      notes: notes.value || undefined,
    })

    message.value = { type: 'success', text: '進度回報成功！' }

    // Update local task data
    const task = tasks.value.find((t) => t.id === selectedTaskId.value)
    if (task) {
      task.progressPercentage = progressPercentage.value
      if (progressPercentage.value === 100) {
        tasks.value = tasks.value.filter((t) => t.id !== selectedTaskId.value)
      }
    }

    // Reset form
    selectedTaskId.value = ''
    progressPercentage.value = 0
    notes.value = ''
  } catch (error) {
    message.value = { type: 'error', text: '回報失敗，請重試' }
  } finally {
    submitting.value = false
  }
}

const handleTaskChange = () => {
  if (selectedTask.value) {
    progressPercentage.value = selectedTask.value.progressPercentage
  }
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
        <div class="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div>
          <h1 class="page-title">進度回報</h1>
          <p class="page-subtitle">回報您的任務進度</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="max-w-xl">
      <div class="card">
        <div class="space-y-6">
          <div class="skeleton h-10 rounded-lg"></div>
          <div class="skeleton h-24 rounded-lg"></div>
          <div class="skeleton h-16 rounded-lg"></div>
          <div class="skeleton h-24 rounded-lg"></div>
          <div class="skeleton h-12 rounded-lg"></div>
        </div>
      </div>
    </div>

    <div v-else class="max-w-xl">
      <!-- All Tasks Completed -->
      <div v-if="tasks.length === 0" class="card">
        <div class="empty-state py-12">
          <div class="w-16 h-16 rounded-2xl bg-success-50 text-success-600 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="empty-state-title">太棒了！</p>
          <p class="empty-state-description">所有任務已完成，沒有需要回報的進度</p>
        </div>
      </div>

      <!-- Report Form -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Message Toast -->
        <div
          v-if="message"
          :class="[
            'flex items-center gap-3 p-4 rounded-xl border animate-slide-up',
            message.type === 'success'
              ? 'bg-success-50 text-success-700 border-success-200'
              : 'bg-danger-50 text-danger-700 border-danger-200'
          ]"
        >
          <svg v-if="message.type === 'success'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-medium">{{ message.text }}</span>
        </div>

        <div class="card space-y-6">
          <!-- Task Selection -->
          <div>
            <label class="form-label">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                選擇任務
              </span>
            </label>
            <select
              v-model="selectedTaskId"
              @change="handleTaskChange"
              class="form-select"
              required
            >
              <option value="">請選擇要回報的任務</option>
              <option v-for="task in tasks" :key="task.id" :value="task.id">
                {{ task.project?.name }} - {{ task.name }}
              </option>
            </select>
          </div>

          <!-- Task Info Card -->
          <div
            v-if="selectedTask"
            class="p-4 bg-gray-50/80 rounded-xl border border-gray-100 animate-fade-in"
          >
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span class="font-medium text-gray-900">任務資訊</span>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-500">專案</span>
                <p class="font-medium text-gray-900 mt-0.5">{{ selectedTask.project?.name }}</p>
              </div>
              <div>
                <span class="text-gray-500">截止日期</span>
                <p class="font-medium text-gray-900 mt-0.5">
                  {{ new Date(selectedTask.plannedEndDate).toLocaleDateString('zh-TW') }}
                </p>
              </div>
              <div class="col-span-2">
                <span class="text-gray-500">目前進度</span>
                <div class="flex items-center gap-3 mt-1">
                  <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500 bg-gradient-to-r"
                      :class="getProgressColor(selectedTask.progressPercentage)"
                      :style="{ width: `${selectedTask.progressPercentage}%` }"
                    ></div>
                  </div>
                  <span class="font-semibold text-gray-900">{{ selectedTask.progressPercentage }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Progress Input -->
          <div>
            <label class="form-label">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                更新後進度
              </span>
            </label>
            <div class="flex items-center gap-4">
              <input
                type="range"
                v-model.number="progressPercentage"
                min="0"
                max="100"
                step="5"
                class="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-600
                       [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
              />
              <div class="relative">
                <input
                  type="number"
                  v-model.number="progressPercentage"
                  min="0"
                  max="100"
                  class="form-input w-24 text-center pr-7 font-semibold"
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
            </div>
            <div class="mt-3 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300 bg-gradient-to-r"
                :class="getProgressColor(progressPercentage)"
                :style="{ width: `${progressPercentage}%` }"
              ></div>
            </div>
            <div class="flex justify-between mt-2 text-xs text-gray-400">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="form-label">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                備註
                <span class="text-gray-400 font-normal">（選填）</span>
              </span>
            </label>
            <textarea
              v-model="notes"
              rows="3"
              class="form-input resize-none"
              placeholder="補充說明今日工作內容、遇到的問題或需要的協助..."
            ></textarea>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="submitting || !selectedTaskId"
            class="btn-primary w-full py-3"
          >
            <template v-if="submitting">
              <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              提交中...
            </template>
            <template v-else>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              提交回報
            </template>
          </button>
        </div>

        <!-- Slack Tip -->
        <div class="flex items-start gap-3 p-4 bg-primary-50/50 rounded-xl border border-primary-100">
          <div class="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="text-sm">
            <p class="font-medium text-primary-900">快速回報提示</p>
            <p class="text-primary-700 mt-0.5">
              您也可以在 Slack 中使用
              <code class="bg-primary-100 text-primary-800 px-1.5 py-0.5 rounded font-mono text-xs">/report</code>
              指令快速回報進度
            </p>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
