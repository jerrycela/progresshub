<script setup lang="ts">
// 標籤徽章元件 - 用於顯示狀態、職能等標籤
interface Props {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
  dot?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  dot: false,
})

// 樣式對照表
const variantClasses: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-purple-100 text-purple-700',
}

const dotClasses: Record<string, string> = {
  default: 'bg-gray-400',
  primary: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  info: 'bg-purple-500',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center font-medium rounded-full',
      variantClasses[variant],
      sizeClasses[size],
    ]"
  >
    <span
      v-if="dot"
      :class="['w-1.5 h-1.5 rounded-full mr-1.5', dotClasses[variant]]"
    />
    <slot />
  </span>
</template>
