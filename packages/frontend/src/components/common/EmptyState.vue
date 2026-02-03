<script setup lang="ts">
// ============================================
// 空狀態元件 - Ralph Loop 迭代 11
// 用於顯示無資料時的提示訊息
// ============================================

interface Props {
  /** 圖示路徑 (SVG path d 屬性) */
  icon?: string
  /** 標題文字 */
  title?: string
  /** 描述文字 */
  description?: string
  /** 圖示尺寸 */
  iconSize?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  title: '沒有資料',
  description: '',
  iconSize: 'md',
})

const iconSizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
}
</script>

<template>
  <div class="text-center py-8">
    <svg
      :class="['mx-auto mb-3 text-gray-300', iconSizeClasses[props.iconSize]]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        :d="props.icon"
      />
    </svg>
    <p class="text-gray-500 font-medium">{{ props.title }}</p>
    <p v-if="props.description" class="text-gray-400 text-sm mt-1">{{ props.description }}</p>
    <slot />
  </div>
</template>
