<script setup lang="ts">
import type { ProgressLog } from 'shared/types'

// ============================================
// 進度歷程 Timeline 元件
// ============================================

const props = defineProps<{
  progressLogs: ProgressLog[]
}>()

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getProgressDelta = (log: ProgressLog, index: number): number => {
  if (index === props.progressLogs.length - 1) {
    return log.progress
  }
  const prevLog = props.progressLogs[index + 1]
  return log.progress - prevLog.progress
}
</script>

<template>
  <div class="card p-6">
    <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">進度歷程</h2>

    <div v-if="progressLogs.length === 0" class="text-center py-8">
      <svg
        class="w-12 h-12 mx-auto"
        style="color: var(--text-muted)"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="mt-3" style="color: var(--text-secondary)">尚無進度記錄</p>
    </div>

    <div v-else class="relative">
      <!-- Timeline 線條 -->
      <div
        class="absolute left-4 top-0 bottom-0 w-0.5"
        style="background-color: var(--border-primary)"
      ></div>

      <!-- Timeline 項目 -->
      <div class="space-y-6">
        <div v-for="(log, index) in progressLogs" :key="log.id" class="relative pl-10">
          <!-- Timeline 節點 -->
          <div
            class="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center"
            :style="{
              backgroundColor: index === 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
            }"
          >
            <svg
              class="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <!-- 內容 -->
          <div class="rounded-lg p-4" style="background-color: var(--bg-secondary)">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <span class="font-semibold" style="color: var(--text-primary)">
                  {{ log.progress }}%
                </span>
                <span
                  v-if="getProgressDelta(log, index) > 0"
                  class="text-sm"
                  style="color: #22c55e"
                >
                  +{{ getProgressDelta(log, index) }}%
                </span>
              </div>
              <span class="text-sm" style="color: var(--text-muted)">
                {{ formatDateTime(log.reportedAt) }}
              </span>
            </div>
            <p v-if="log.notes" style="color: var(--text-secondary)">
              {{ log.notes }}
            </p>
            <p class="text-sm mt-2" style="color: var(--text-muted)">
              回報者: {{ log.user?.name }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
