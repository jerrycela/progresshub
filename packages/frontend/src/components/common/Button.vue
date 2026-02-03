<script setup lang="ts">
// 按鈕元件 - 支援多種樣式變體
interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost'
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

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}

// 樣式對照表 - UI/UX Pro Max 設計系統
const variantClasses: Record<string, string> = {
  primary: 'bg-primary-700 hover:bg-primary-800 text-white border-transparent',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-primary-950 border-gray-200',
  success: 'bg-success hover:bg-success-dark text-white border-transparent',
  warning: 'bg-warning hover:bg-warning-dark text-white border-transparent',
  danger: 'bg-danger hover:bg-danger-dark text-white border-transparent',
  ghost: 'bg-transparent hover:bg-primary-50 text-primary-700 border-transparent',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
}
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center font-medium rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer',
      variantClasses[variant],
      sizeClasses[size],
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
