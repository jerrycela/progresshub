import { ref, type Ref } from 'vue'
import type { ActionResult } from 'shared/types'
import { useToast } from './useToast'

/**
 * 統一管理 task 相關 modal 的開關、loading、執行邏輯
 * 適用於 claim/unclaim 等重複的 modal 模式
 */
export function useTaskModal<T>() {
  const show = ref(false)
  const task: Ref<T | null> = ref(null)
  const loading = ref(false)
  const { showSuccess, showError } = useToast()

  const open = (t: T) => {
    task.value = t
    show.value = true
  }

  const close = () => {
    show.value = false
    task.value = null
  }

  /**
   * 執行 modal 動作：自動管理 loading + 成功關閉 + 錯誤提示
   */
  const execute = async (
    action: (t: T) => Promise<ActionResult<unknown>>,
    successMessage: string,
    errorFallback: string,
  ) => {
    if (!task.value) return
    loading.value = true
    try {
      const result = await action(task.value)
      if (result.success) {
        showSuccess(successMessage)
        close()
      } else {
        showError(result.error?.message || errorFallback)
      }
    } catch {
      showError(errorFallback)
    } finally {
      loading.value = false
    }
  }

  return { show, task, loading, open, close, execute }
}
