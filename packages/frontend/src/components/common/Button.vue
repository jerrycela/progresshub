<script setup lang="ts">
// ============================================
// 按鈕元件 - ProgressHub 設計系統
// 支援多種樣式變體 + Dark mode
// ============================================

interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  block: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (event: MouseEvent): void => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    :class="[
      // 基礎樣式
      'inline-flex items-center justify-center font-medium rounded-md border transition-all duration-150',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer',
      // Size classes
      {
        'px-2.5 py-1.5 text-xs': size === 'sm',
        'px-3.5 py-2 text-sm': size === 'md',
        'px-5 py-2.5 text-base': size === 'lg',
      },
      // Variant classes - ProgressHub 配色
      {
        // Primary: 品牌靛藍 - CTA 按鈕
        'bg-indigo hover:bg-indigo-dark text-white border-transparent focus:ring-indigo/50 dark:bg-indigo-light dark:hover:bg-indigo dark:focus:ring-indigo-light/50': variant === 'primary',
        // Secondary: 金屬灰 - 次要按鈕
        'bg-metal-light hover:bg-metal-silver text-ink-carbon border-metal-silver dark:bg-metal-obsidian/80 dark:hover:bg-metal-obsidian dark:text-metal-pearl dark:border-metal-obsidian focus:ring-metal-silver/50': variant === 'secondary',
        // Success: 翡翠綠 - 完成
        'bg-success hover:bg-success-dark text-white border-transparent focus:ring-success/50': variant === 'success',
        // Warning: 琥珀橙 - 卡關/警告
        'bg-warning hover:bg-warning-dark text-white border-transparent focus:ring-warning/50': variant === 'warning',
        // Danger: 危險紅
        'bg-danger hover:bg-danger-dark text-white border-transparent focus:ring-danger/50': variant === 'danger',
        // Info: 藍色 - 進行中/繼續
        'bg-info hover:bg-info-dark text-white border-transparent focus:ring-info/50 dark:bg-info-light dark:hover:bg-info dark:focus:ring-info-light/50': variant === 'info',
        // Ghost: 透明背景
        'bg-transparent hover:bg-metal-light text-ink-cool border-transparent dark:hover:bg-metal-obsidian/50 dark:text-ink-muted focus:ring-metal-silver/50': variant === 'ghost',
      },
      // 狀態類
      {
        'opacity-50 cursor-not-allowed': disabled || loading,
        'w-full': block,
      },
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <!-- 載入中動畫 -->
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <slot />
  </button>
</template>
