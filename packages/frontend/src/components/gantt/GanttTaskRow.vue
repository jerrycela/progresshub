<script setup lang="ts">
import Badge from '@/components/common/Badge.vue'
import { getStatusLabel } from '@/composables/useStatusUtils'
import { useFormatDate } from '@/composables/useFormatDate'
import { STATUS_COLORS } from '@/constants/ui'
import type { Task } from 'shared/types'

defineProps<{
  task: Task
  index: number
  treeConnectors?: string[]
  getTaskPosition: (task: { startDate?: string; dueDate?: string }) => {
    left: number
    width: number
  }
  isTaskOverdue: (task: Task) => boolean
  getTaskDuration: (task: Task) => number
  getDaysRemaining: (task: Task) => number | null
  getAssigneeName: (task: Task) => string
  getProjectName?: (projectId: string) => string | undefined
  showProject?: boolean
}>()

const emit = defineEmits<{
  click: [taskId: string]
}>()

const { formatShort } = useFormatDate()
const statusColors = STATUS_COLORS
</script>

<template>
  <div
    :data-task-id="task.id"
    class="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded cursor-pointer transition-colors duration-150 hover-bg relative"
    :class="index % 2 === 1 ? 'bg-black/[0.02] dark:bg-white/[0.02]' : 'bg-transparent'"
    @click="emit('click', task.id)"
  >
    <!-- 樹狀連接線 (絕對定位，跨越整行高度) -->
    <div
      v-if="treeConnectors && treeConnectors.length > 0"
      class="absolute top-0 bottom-0 flex pointer-events-none"
      style="left: 8px"
    >
      <div
        v-for="(type, i) in treeConnectors"
        :key="i"
        class="w-4 relative"
        :class="`tree-${type}`"
      />
    </div>

    <!-- 任務資訊 -->
    <div class="w-28 sm:w-40 flex-shrink-0 pr-2">
      <div
        :style="treeConnectors?.length ? { paddingLeft: `${treeConnectors.length * 16}px` } : {}"
      >
        <div class="text-xs sm:text-sm font-medium truncate" style="color: var(--text-primary)">
          {{ task.title }}
        </div>
        <div class="flex items-center gap-1 mt-0.5">
          <Badge v-if="isTaskOverdue(task)" variant="danger" size="sm">逾期</Badge>
          <span class="text-xs truncate" style="color: var(--text-tertiary)">
            {{ getAssigneeName(task) }}
          </span>
        </div>
        <div
          v-if="showProject && getProjectName"
          class="text-xs truncate mt-0.5"
          style="color: var(--text-muted)"
        >
          {{ getProjectName(task.projectId) }}
        </div>
        <!-- 行動裝置日期 -->
        <div class="sm:hidden text-xs mt-0.5" style="color: var(--text-muted)">
          {{ formatShort(task.startDate) }} - {{ formatShort(task.dueDate) }}
        </div>
      </div>
    </div>

    <!-- 甘特條 -->
    <div class="flex-1 relative h-7 hidden sm:block">
      <div
        class="absolute top-0.5 h-6 rounded-md flex items-center justify-center text-xs text-white font-medium transition-all cursor-pointer group"
        :class="[
          isTaskOverdue(task)
            ? 'ring-2 ring-danger/50 bg-danger'
            : statusColors[task.status] || 'bg-gray-500',
          task.status === 'PAUSED' && !isTaskOverdue(task) ? 'bg-stripes' : '',
        ]"
        :style="{
          left: `${getTaskPosition(task).left}%`,
          width: `${getTaskPosition(task).width}%`,
          minWidth: '24px',
        }"
      >
        <!-- 暫停圖示 -->
        <svg
          v-if="task.status === 'PAUSED'"
          class="w-3 h-3 mr-0.5"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
        <!-- 逾期圖示 -->
        <svg
          v-else-if="isTaskOverdue(task)"
          class="w-3 h-3 mr-0.5"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <!-- 進度文字 -->
        <span class="truncate px-1">
          {{ task.progress > 0 ? `${task.progress}%` : getStatusLabel(task.status) }}
        </span>

        <!-- Tooltip -->
        <div
          class="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20 pointer-events-none"
        >
          <div
            class="p-2 rounded-lg shadow-lg text-xs whitespace-nowrap"
            style="background-color: var(--bg-tooltip); color: var(--text-on-tooltip, #fff)"
          >
            <div class="font-medium">{{ task.title }}</div>
            <div class="mt-1 opacity-80">
              {{ formatShort(task.startDate) }} → {{ formatShort(task.dueDate) }} ({{
                getTaskDuration(task)
              }}天)
            </div>
            <div class="opacity-80">
              狀態：{{ getStatusLabel(task.status) }}
              <span v-if="task.progress > 0"> | 進度：{{ task.progress }}%</span>
            </div>
            <div
              v-if="getDaysRemaining(task) !== null"
              :class="getDaysRemaining(task)! < 0 ? 'text-danger' : 'text-success'"
            >
              {{
                getDaysRemaining(task)! < 0
                  ? `逾期 ${Math.abs(getDaysRemaining(task)!)} 天`
                  : `剩餘 ${getDaysRemaining(task)} 天`
              }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-stripes {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4px,
    rgba(255, 255, 255, 0.15) 4px,
    rgba(255, 255, 255, 0.15) 8px
  );
}

/* Tree connector: vertical pass-through line */
.tree-line::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 0;
  bottom: 0;
  width: 1.5px;
  background-color: var(--text-muted);
  opacity: 0.35;
}

/* Tree connector: branch (has more siblings below) */
.tree-branch::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 0;
  bottom: 0;
  width: 1.5px;
  background-color: var(--text-muted);
  opacity: 0.35;
}

.tree-branch::after {
  content: '';
  position: absolute;
  left: 7px;
  top: 50%;
  width: 8px;
  height: 1.5px;
  background-color: var(--text-muted);
  opacity: 0.35;
}

/* Tree connector: last child branch */
.tree-last::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 0;
  height: 50%;
  width: 1.5px;
  background-color: var(--text-muted);
  opacity: 0.35;
}

.tree-last::after {
  content: '';
  position: absolute;
  left: 7px;
  top: 50%;
  width: 8px;
  height: 1.5px;
  background-color: var(--text-muted);
  opacity: 0.35;
}
</style>
