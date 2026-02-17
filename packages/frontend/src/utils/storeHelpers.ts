import type { ActionResult, ErrorCode } from 'shared/types'

/**
 * 包裝非同步 store action，統一 try/catch + ActionResult 錯誤處理
 * 適用於簡單的 fetch/create 操作（無樂觀更新）
 */
export async function storeAction<T>(
  action: () => Promise<T>,
  errorMessage: string,
  errorCode: ErrorCode = 'UNKNOWN_ERROR',
): Promise<ActionResult<T>> {
  try {
    const data = await action()
    return { success: true, data }
  } catch (e) {
    return {
      success: false,
      error: {
        code: errorCode,
        message: e instanceof Error ? e.message : errorMessage,
      },
    }
  }
}
