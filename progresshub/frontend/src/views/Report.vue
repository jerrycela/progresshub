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
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">進度回報</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>

    <div v-else class="max-w-lg">
      <div v-if="tasks.length === 0" class="card text-center py-8">
        <svg class="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="mt-4 text-gray-600">所有任務已完成，沒有需要回報的進度！</p>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="card space-y-6">
        <!-- 訊息提示 -->
        <div
          v-if="message"
          :class="[
            'p-4 rounded-lg',
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          ]"
        >
          {{ message.text }}
        </div>

        <!-- 任務選擇 -->
        <div>
          <label class="form-label">選擇任務</label>
          <select
            v-model="selectedTaskId"
            @change="handleTaskChange"
            class="form-select"
            required
          >
            <option value="">請選擇任務</option>
            <option v-for="task in tasks" :key="task.id" :value="task.id">
              {{ task.project?.name }} - {{ task.name }}
            </option>
          </select>
        </div>

        <!-- 任務資訊 -->
        <div v-if="selectedTask" class="p-4 bg-gray-50 rounded-lg">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">專案：</span>
              <span class="font-medium">{{ selectedTask.project?.name }}</span>
            </div>
            <div>
              <span class="text-gray-500">截止日期：</span>
              <span class="font-medium">
                {{ new Date(selectedTask.plannedEndDate).toLocaleDateString('zh-TW') }}
              </span>
            </div>
            <div>
              <span class="text-gray-500">目前進度：</span>
              <span class="font-medium">{{ selectedTask.progressPercentage }}%</span>
            </div>
          </div>
        </div>

        <!-- 進度輸入 -->
        <div>
          <label class="form-label">今日進度 (%)</label>
          <div class="flex items-center gap-4">
            <input
              type="range"
              v-model.number="progressPercentage"
              min="0"
              max="100"
              step="5"
              class="flex-1"
            />
            <input
              type="number"
              v-model.number="progressPercentage"
              min="0"
              max="100"
              class="form-input w-20 text-center"
            />
          </div>
          <div class="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-primary-600 transition-all"
              :style="{ width: `${progressPercentage}%` }"
            ></div>
          </div>
        </div>

        <!-- 備註 -->
        <div>
          <label class="form-label">備註（選填）</label>
          <textarea
            v-model="notes"
            rows="3"
            class="form-input"
            placeholder="補充說明今日工作內容..."
          ></textarea>
        </div>

        <!-- 提交按鈕 -->
        <button
          type="submit"
          :disabled="submitting || !selectedTaskId"
          class="btn btn-primary w-full"
        >
          <span v-if="submitting">提交中...</span>
          <span v-else>提交回報</span>
        </button>
      </form>

      <div class="mt-6 p-4 bg-blue-50 rounded-lg">
        <p class="text-sm text-blue-800">
          <strong>提示：</strong>您也可以在 Slack 中使用 <code class="bg-blue-100 px-1 rounded">/report</code> 指令快速回報進度。
        </p>
      </div>
    </div>
  </div>
</template>
