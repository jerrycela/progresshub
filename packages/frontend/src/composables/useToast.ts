import { ref, readonly } from 'vue'
import { TOAST } from '@/constants/pageSettings'

// ============================================
// Toast 通知 Composable - Ralph Loop 迭代 7
// 全域 Toast 狀態管理
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration: number
}

// 全域狀態（單例模式）
const toasts = ref<ToastItem[]>([])

// 生成唯一 ID
const generateId = (): string => `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

// 移除 Toast
const removeToast = (id: string): void => {
  const index = toasts.value.findIndex((t: ToastItem) => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// 新增 Toast
const addToast = (type: ToastType, message: string, duration?: number): string => {
  const id = generateId()
  const toast: ToastItem = {
    id,
    type,
    message,
    duration: duration ?? TOAST.DURATION,
  }

  toasts.value.push(toast)

  // 自動移除
  if (toast.duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, toast.duration)
  }

  return id
}

export function useToast() {
  // 快捷方法
  const showSuccess = (message: string, duration?: number): string => {
    return addToast('success', message, duration)
  }

  const showError = (message: string, duration?: number): string => {
    return addToast('error', message, duration ?? TOAST.ERROR_DURATION)
  }

  const showWarning = (message: string, duration?: number): string => {
    return addToast('warning', message, duration)
  }

  const showInfo = (message: string, duration?: number): string => {
    return addToast('info', message, duration)
  }

  // 清除所有 Toast
  const clearAll = (): void => {
    toasts.value = []
  }

  return {
    toasts: readonly(toasts),
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
    clearAll,
  }
}
