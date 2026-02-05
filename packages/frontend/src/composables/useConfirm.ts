// ============================================
// 確認對話框 Composable
// ROI 優化：替換原生 confirm()
// ============================================

import { ref, readonly, type Ref } from 'vue'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'danger'
}

export interface ConfirmState {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  type: 'info' | 'warning' | 'danger'
  resolve: ((value: boolean) => void) | null
}

// 全域狀態
const state = ref<ConfirmState>({
  isOpen: false,
  title: '確認',
  message: '',
  confirmText: '確定',
  cancelText: '取消',
  type: 'info',
  resolve: null,
})

/**
 * 確認對話框 Composable
 * 提供非阻塞式的確認對話框，替代原生 confirm()
 */
export const useConfirm = () => {
  /**
   * 顯示確認對話框
   * @param options 對話框選項
   * @returns Promise<boolean> 使用者點擊確定返回 true，取消返回 false
   */
  const showConfirm = (options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options

      state.value = {
        isOpen: true,
        title: opts.title || '確認',
        message: opts.message,
        confirmText: opts.confirmText || '確定',
        cancelText: opts.cancelText || '取消',
        type: opts.type || 'info',
        resolve,
      }
    })
  }

  /**
   * 處理確認
   */
  const handleConfirm = () => {
    if (state.value.resolve) {
      state.value.resolve(true)
    }
    closeDialog()
  }

  /**
   * 處理取消
   */
  const handleCancel = () => {
    if (state.value.resolve) {
      state.value.resolve(false)
    }
    closeDialog()
  }

  /**
   * 關閉對話框
   */
  const closeDialog = () => {
    state.value = {
      ...state.value,
      isOpen: false,
      resolve: null,
    }
  }

  return {
    state: readonly(state) as Readonly<Ref<Omit<ConfirmState, 'resolve'>>>,
    showConfirm,
    handleConfirm,
    handleCancel,
  }
}

export default useConfirm
