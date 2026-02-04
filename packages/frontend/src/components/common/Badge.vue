<script setup lang="ts">
// ============================================
// 標籤徽章元件 - ProgressHub 設計系統
// 用於顯示狀態、職能等標籤
// ============================================

interface Props {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'paused'
  size?: 'sm' | 'md'
  dot?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  dot: false,
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center font-medium rounded-md transition-colors duration-150',
      // Size classes
      {
        'px-1.5 py-0.5 text-xs': size === 'sm',
        'px-2 py-0.5 text-xs': size === 'md',
      },
      // Variant classes - 使用透明度實現精緻感
      {
        // Default: 金屬灰
        'bg-metal-light text-ink-cool dark:bg-metal-obsidian/50 dark:text-ink-muted': variant === 'default',
        // Primary: 品牌靛藍
        'bg-indigo/10 text-indigo dark:bg-indigo-light/20 dark:text-indigo-light': variant === 'primary',
        // Success: 翡翠綠
        'bg-success/10 text-success dark:bg-success-light/20 dark:text-success-light': variant === 'success',
        // Warning: 琥珀橙
        'bg-warning/10 text-warning dark:bg-warning-light/20 dark:text-warning-light': variant === 'warning',
        // Danger: 危險紅
        'bg-danger/10 text-danger dark:bg-danger-light/20 dark:text-danger-light': variant === 'danger',
        // Info: 資訊藍
        'bg-info/10 text-info dark:bg-info-light/20 dark:text-info-light': variant === 'info',
        // Paused: 暫停橙黃色
        'bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400': variant === 'paused',
      },
    ]"
  >
    <span
      v-if="dot"
      :class="[
        'w-1.5 h-1.5 rounded-full mr-1.5',
        {
          'bg-ink-muted dark:bg-ink-medium': variant === 'default',
          'bg-indigo dark:bg-indigo-light': variant === 'primary',
          'bg-success dark:bg-success-light': variant === 'success',
          'bg-warning dark:bg-warning-light': variant === 'warning',
          'bg-danger dark:bg-danger-light': variant === 'danger',
          'bg-info dark:bg-info-light': variant === 'info',
          'bg-amber-500 dark:bg-amber-400': variant === 'paused',
        },
      ]"
    />
    <slot />
  </span>
</template>
