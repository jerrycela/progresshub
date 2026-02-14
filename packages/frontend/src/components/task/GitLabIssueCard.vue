<script setup lang="ts">
import type { GitLabIssue } from 'shared/types'

// ============================================
// GitLab Issue 資訊卡元件
// ============================================

defineProps<{
  gitlabIssue: GitLabIssue | undefined
}>()

const emit = defineEmits<{
  link: []
  edit: []
  open: [url: string]
}>()
</script>

<template>
  <div class="card p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <!-- GitLab 圖示 -->
        <svg class="w-5 h-5" style="color: #fc6d26" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="m23.6 9.593-.033-.086L20.3.98a.851.851 0 0 0-.336-.405.87.87 0 0 0-.507-.164.865.865 0 0 0-.508.152.861.861 0 0 0-.336.405l-2.2 6.748H7.587L5.387.968a.861.861 0 0 0-.336-.405.87.87 0 0 0-.507-.164.865.865 0 0 0-.508.152.861.861 0 0 0-.336.405L.433 9.507l-.033.086a6.066 6.066 0 0 0 2.012 7.01l.01.008.028.02 4.97 3.722 2.458 1.86 1.497 1.132a1.014 1.014 0 0 0 1.224 0l1.497-1.131 2.458-1.86 4.998-3.743.012-.01a6.068 6.068 0 0 0 2.008-7.008z"
          />
        </svg>
        <h3 class="text-lg font-semibold" style="color: var(--text-primary)">GitLab Issue</h3>
      </div>
    </div>

    <!-- 已關聯 Issue -->
    <div v-if="gitlabIssue" class="rounded-lg p-4" style="background-color: var(--bg-secondary)">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium" style="color: var(--accent-primary)">
              #{{ gitlabIssue.id }}
            </span>
            <span
              :class="[
                'px-2 py-0.5 text-xs font-medium rounded-full',
                gitlabIssue.state === 'opened'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
              ]"
            >
              {{ gitlabIssue.state === 'opened' ? '開啟' : '已關閉' }}
            </span>
          </div>
          <p class="text-sm font-medium truncate" style="color: var(--text-primary)">
            {{ gitlabIssue.title }}
          </p>
          <p class="text-xs mt-1 truncate" style="color: var(--text-muted)">
            {{ gitlabIssue.url }}
          </p>
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="flex gap-2 mt-4">
        <button class="btn-ghost text-sm" @click="emit('edit')">編輯</button>
        <button class="btn-primary text-sm" @click="emit('open', gitlabIssue.url)">
          開啟 Issue
        </button>
      </div>
    </div>

    <!-- 尚未關聯 -->
    <div v-else class="rounded-lg p-4 text-center" style="background-color: var(--bg-secondary)">
      <svg
        class="w-10 h-10 mx-auto mb-2"
        style="color: var(--text-muted)"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
      <p class="text-sm mb-3" style="color: var(--text-secondary)">尚未關聯 GitLab Issue</p>
      <button
        class="btn-secondary text-sm opacity-50 cursor-not-allowed"
        disabled
        title="GitLab 整合尚未啟用"
      >
        關聯 Issue
      </button>
    </div>
  </div>
</template>
