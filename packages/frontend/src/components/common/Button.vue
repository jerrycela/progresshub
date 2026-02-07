<script setup lang="ts">
// ============================================
// 按鈕元件 - ProgressHub 設計系統 v2.0
// 精緻固態風格：漸層背景 + 多層陰影 + 微動效
// ============================================

import { computed } from 'vue'

interface Props {
  variant?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'ghost'
    | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  loading?: boolean
  block?: boolean
  icon?: boolean // 純圖示按鈕（正方形）
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  block: false,
  icon: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (event: MouseEvent): void => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}

// ============================================
// Variant 樣式對照表
// ============================================
const variantClasses = computed(() => {
  const variants: Record<string, string> = {
    // Primary: 品牌靛藍 - 漸層 + 光澤邊框
    primary: `
      bg-gradient-to-b from-indigo-500 to-indigo-600
      text-white border-indigo-600
      shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(79,70,229,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]
      hover:from-indigo-400 hover:to-indigo-500 hover:border-indigo-500
      hover:shadow-[0_2px_4px_rgba(0,0,0,0.12),0_4px_8px_rgba(79,70,229,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]
      hover:-translate-y-0.5
      focus-visible:ring-indigo-500/50
      dark:from-indigo-500 dark:to-indigo-600 dark:border-indigo-500
      dark:hover:from-indigo-400 dark:hover:to-indigo-500
    `,

    // Secondary: 金屬灰 - 玻璃質感
    secondary: `
      bg-gradient-to-b from-gray-50 to-gray-100
      text-gray-700 border-gray-200
      shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]
      hover:from-gray-100 hover:to-gray-200 hover:border-gray-300
      hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]
      hover:-translate-y-0.5 hover:text-gray-900
      focus-visible:ring-gray-400/50
      dark:from-gray-700 dark:to-gray-800
      dark:text-gray-200 dark:border-gray-600
      dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]
      dark:hover:from-gray-600 dark:hover:to-gray-700 dark:hover:border-gray-500 dark:hover:text-white
    `,

    // Success: 翡翠綠
    success: `
      bg-gradient-to-b from-emerald-500 to-emerald-600
      text-white border-emerald-600
      shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]
      hover:from-emerald-400 hover:to-emerald-500 hover:border-emerald-500
      hover:shadow-[0_2px_4px_rgba(0,0,0,0.12),0_4px_8px_rgba(16,185,129,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]
      hover:-translate-y-0.5
      focus-visible:ring-emerald-500/50
    `,

    // Warning: 琥珀橙
    warning: `
      bg-gradient-to-b from-amber-500 to-amber-600
      text-white border-amber-600
      shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(245,158,11,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]
      hover:from-amber-400 hover:to-amber-500 hover:border-amber-500
      hover:shadow-[0_2px_4px_rgba(0,0,0,0.12),0_4px_8px_rgba(245,158,11,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]
      hover:-translate-y-0.5
      focus-visible:ring-amber-500/50
    `,

    // Danger: 玫瑰紅
    danger: `
      bg-gradient-to-b from-rose-500 to-rose-600
      text-white border-rose-600
      shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(244,63,94,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]
      hover:from-rose-400 hover:to-rose-500 hover:border-rose-500
      hover:shadow-[0_2px_4px_rgba(0,0,0,0.12),0_4px_8px_rgba(244,63,94,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]
      hover:-translate-y-0.5
      focus-visible:ring-rose-500/50
    `,

    // Info: 天藍色
    info: `
      bg-gradient-to-b from-blue-500 to-blue-600
      text-white border-blue-600
      shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]
      hover:from-blue-400 hover:to-blue-500 hover:border-blue-500
      hover:shadow-[0_2px_4px_rgba(0,0,0,0.12),0_4px_8px_rgba(59,130,246,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]
      hover:-translate-y-0.5
      focus-visible:ring-blue-500/50
    `,

    // Ghost: 幽靈按鈕 - 純文字
    ghost: `
      bg-transparent
      text-gray-600 border-transparent shadow-none
      hover:bg-gray-100 hover:text-gray-900
      focus-visible:ring-gray-400/50
      dark:text-gray-400
      dark:hover:bg-gray-800 dark:hover:text-gray-100
    `,

    // Outline: 邊框按鈕 - 精緻線條
    outline: `
      bg-transparent
      text-indigo-600 border-indigo-300
      shadow-[0_1px_2px_rgba(0,0,0,0.05)]
      hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700
      hover:shadow-[0_2px_4px_rgba(79,70,229,0.1)]
      hover:-translate-y-0.5
      focus-visible:ring-indigo-500/50
      dark:text-indigo-400 dark:border-indigo-500/50
      dark:hover:bg-indigo-950 dark:hover:border-indigo-400 dark:hover:text-indigo-300
    `,
  }

  return variants[props.variant] || variants.primary
})

// ============================================
// Size 尺寸對照表
// ============================================
const sizeClasses = computed(() => {
  if (props.icon) {
    // 純圖示按鈕（正方形）
    const iconSizes: Record<string, string> = {
      xs: 'p-1.5',
      sm: 'p-2',
      md: 'p-2.5',
      lg: 'p-3',
      xl: 'p-3.5',
    }
    return iconSizes[props.size] || iconSizes.md
  }

  const sizes: Record<string, string> = {
    xs: 'px-2.5 py-1.5 text-xs gap-1.5',
    sm: 'px-3 py-2 text-sm gap-2',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-5 py-3 text-base gap-2.5',
    xl: 'px-7 py-3.5 text-lg gap-3',
  }
  return sizes[props.size] || sizes.md
})

// Spinner 尺寸
const spinnerSize = computed(() => {
  const sizes: Record<string, string> = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-5 h-5',
  }
  return sizes[props.size] || sizes.md
})
</script>

<template>
  <button
    :class="[
      // 基礎樣式 - 精緻固態設計
      'inline-flex items-center justify-center font-semibold',
      'rounded-lg border transition-all duration-200 ease-out',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'active:scale-[0.98] cursor-pointer select-none',
      // Size
      sizeClasses,
      // Variant
      variantClasses,
      // States
      {
        'opacity-60 cursor-not-allowed pointer-events-none': disabled || loading,
        'w-full': block,
      },
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <!-- Loading Spinner -->
    <svg
      v-if="loading"
      class="animate-spin shrink-0"
      :class="spinnerSize"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
      <path
        class="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>

    <!-- Button Content -->
    <span v-if="!loading || !icon" class="truncate">
      <slot />
    </span>
  </button>
</template>
