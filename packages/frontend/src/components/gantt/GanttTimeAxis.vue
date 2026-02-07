<script setup lang="ts">
defineProps<{
  timeAxisMarks: Array<{ position: number; label: string; isMain: boolean; isWeekend?: boolean }>
  todayPosition: number
  dateRange: { start: Date; end: Date }
  formatDate: (date: Date) => string
}>()
</script>

<template>
  <!-- 行動裝置時間軸 -->
  <div class="sm:hidden flex justify-between text-xs px-2 mb-2" style="color: var(--text-tertiary)">
    <span>{{ formatDate(dateRange.start) }}</span>
    <span class="text-danger font-medium">今天</span>
    <span>{{ formatDate(dateRange.end) }}</span>
  </div>

  <!-- 桌面時間軸 -->
  <div
    class="hidden sm:block relative h-8 mb-2"
    style="border-bottom: 1px solid var(--border-primary)"
  >
    <div
      v-for="mark in timeAxisMarks"
      :key="mark.label"
      class="absolute text-xs transform -translate-x-1/2"
      :style="{
        left: `${mark.position}%`,
        top: '2px',
        fontWeight: mark.isMain ? '600' : '400',
        color: mark.isWeekend ? 'var(--text-muted)' : 'var(--text-tertiary)',
      }"
    >
      {{ mark.label }}
      <div
        class="absolute left-1/2 transform -translate-x-1/2"
        :style="{
          top: '16px',
          width: '1px',
          height: mark.isMain ? '8px' : '4px',
          backgroundColor: mark.isMain ? 'var(--text-tertiary)' : 'var(--border-primary)',
        }"
      />
    </div>
    <!-- 今日標記 -->
    <div
      class="absolute top-0 bottom-0 w-0.5 bg-danger z-10"
      :style="{ left: `${todayPosition}%` }"
    >
      <div class="absolute -top-0 left-1 text-xs text-danger font-semibold whitespace-nowrap">
        今天
      </div>
    </div>
  </div>
</template>
