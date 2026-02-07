<script setup lang="ts">
import { useToast, type ToastItem, type ToastType } from '@/composables/useToast'
import { TRANSITIONS } from '@/constants/ui'

// ============================================
// Toast 通知元件 - Ralph Loop 迭代 7
// 全域 Toast 容器元件
// ============================================

const { toasts, removeToast } = useToast()

// Toast 樣式配置
const toastStyles: Record<ToastType, { bg: string; icon: string; iconColor: string }> = {
  success: {
    bg: 'bg-green-600',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: 'text-white',
  },
  error: {
    bg: 'bg-red-600',
    icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: 'text-white',
  },
  warning: {
    bg: 'bg-yellow-500',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    iconColor: 'text-white',
  },
  info: {
    bg: 'bg-blue-600',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: 'text-white',
  },
}

const getToastStyle = (type: ToastType) => toastStyles[type]

const handleClose = (toast: ToastItem) => {
  removeToast(toast.id)
}
</script>

<template>
  <!-- Toast 容器 - 固定於右下角 -->
  <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
    <TransitionGroup
      :enter-active-class="TRANSITIONS.TOAST_ENTER"
      :leave-active-class="TRANSITIONS.TOAST_LEAVE"
      enter-from-class="opacity-0 translate-y-4"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[280px] max-w-md',
          getToastStyle(toast.type).bg,
        ]"
        role="alert"
      >
        <!-- 圖示 -->
        <svg
          :class="['w-5 h-5 flex-shrink-0', getToastStyle(toast.type).iconColor]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            :d="getToastStyle(toast.type).icon"
          />
        </svg>

        <!-- 訊息 -->
        <span class="flex-1 text-white text-sm font-medium">
          {{ toast.message }}
        </span>

        <!-- 關閉按鈕 -->
        <button
          type="button"
          class="flex-shrink-0 text-white/80 hover:text-white transition-colors"
          @click="handleClose(toast)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
