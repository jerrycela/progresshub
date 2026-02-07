<script setup lang="ts">
import type { TaskNote } from 'shared/types'
import { getRoleBadgeClass } from '@/composables/useStatusUtils'

// ============================================
// 任務註記區塊元件
// ============================================

defineProps<{
  taskNotes: TaskNote[]
  canAddNote: boolean
}>()

const emit = defineEmits<{
  addNote: []
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

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'PM':
      return 'PM'
    case 'PRODUCER':
      return '製作人'
    case 'MANAGER':
      return '部門主管'
    default:
      return '同仁'
  }
}
</script>

<template>
  <div class="card p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold" style="color: var(--text-primary)">註記</h2>
      <button
        v-if="canAddNote"
        class="btn-secondary text-sm flex items-center gap-1"
        @click="emit('addNote')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        新增註記
      </button>
    </div>

    <div v-if="taskNotes.length === 0" class="text-center py-6">
      <svg
        class="w-10 h-10 mx-auto"
        style="color: var(--text-muted)"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
        />
      </svg>
      <p class="mt-2 text-sm" style="color: var(--text-secondary)">尚無註記</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="note in taskNotes"
        :key="note.id"
        class="rounded-lg p-4"
        style="background-color: var(--bg-secondary)"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm" style="color: var(--text-primary)">
              {{ note.authorName }}
            </span>
            <span
              :class="[
                'px-2 py-0.5 text-xs font-medium rounded-full',
                getRoleBadgeClass(note.authorRole),
              ]"
            >
              {{ getRoleLabel(note.authorRole) }}
            </span>
          </div>
          <span class="text-xs" style="color: var(--text-muted)">
            {{ formatDateTime(note.createdAt) }}
          </span>
        </div>
        <p class="text-sm" style="color: var(--text-secondary)">
          {{ note.content }}
        </p>
      </div>
    </div>
  </div>
</template>
