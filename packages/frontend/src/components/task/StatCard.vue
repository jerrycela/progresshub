<script setup lang="ts">
// 統計卡片元件 - 用於儀表板顯示各類數據統計
interface Props {
  title: string
  value: number | string
  icon?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'
}

withDefaults(defineProps<Props>(), {
  color: 'blue',
})

defineExpose({})

// 顏色對照
const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    icon: 'bg-blue-100 text-blue-600',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    icon: 'bg-green-100 text-green-600',
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    icon: 'bg-yellow-100 text-yellow-600',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    icon: 'bg-red-100 text-red-600',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    icon: 'bg-purple-100 text-purple-600',
  },
  gray: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    icon: 'bg-gray-100 text-gray-600',
  },
}

// 預設圖示 SVG paths
const defaultIcons: Record<string, string> = {
  tasks: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  progress: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
}
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
    <div class="flex items-center justify-between">
      <!-- 左側：數值與標題 -->
      <div>
        <p class="text-sm font-medium text-gray-500">{{ title }}</p>
        <p class="mt-1 text-3xl font-bold text-gray-900">{{ value }}</p>

        <!-- 趨勢指標 -->
        <div v-if="trend" class="mt-2 flex items-center gap-1">
          <span
            :class="[
              'inline-flex items-center text-sm font-medium',
              trend.isPositive ? 'text-green-600' : 'text-red-600',
            ]"
          >
            <svg
              class="w-4 h-4 mr-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                :d="trend.isPositive ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'"
              />
            </svg>
            {{ Math.abs(trend.value) }}%
          </span>
          <span class="text-sm text-gray-500">較上週</span>
        </div>
      </div>

      <!-- 右側：圖示 -->
      <div :class="['p-3 rounded-xl', colorClasses[color].icon]">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            :d="icon || defaultIcons.tasks"
          />
        </svg>
      </div>
    </div>
  </div>
</template>
