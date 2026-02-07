import { getErrorMessage, useErrorHandler } from '../useErrorHandler'

// Mock useToast
const mockShowError = vi.fn()

vi.mock('../useToast', () => ({
  useToast: () => ({
    showError: mockShowError,
  }),
}))

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 模擬生產環境，避免 console.error 干擾
    vi.stubGlobal('import', { meta: { env: { DEV: false } } })
  })

  // ------------------------------------------
  // getErrorMessage
  // ------------------------------------------
  describe('getErrorMessage', () => {
    it('回傳已知錯誤代碼的對應訊息', () => {
      expect(getErrorMessage('NETWORK_ERROR')).toBe('網路連線異常，請檢查網路狀態')
    })

    it('回傳 UNAUTHORIZED 的訊息', () => {
      expect(getErrorMessage('UNAUTHORIZED')).toBe('登入已過期，請重新登入')
    })

    it('回傳 FORBIDDEN 的訊息', () => {
      expect(getErrorMessage('FORBIDDEN')).toBe('您沒有權限執行此操作')
    })

    it('回傳 NOT_FOUND 的訊息', () => {
      expect(getErrorMessage('NOT_FOUND')).toBe('找不到請求的資源')
    })

    it('回傳 VALIDATION_ERROR 的訊息', () => {
      expect(getErrorMessage('VALIDATION_ERROR')).toBe('輸入資料有誤，請檢查後重試')
    })

    it('回傳 SERVER_ERROR 的訊息', () => {
      expect(getErrorMessage('SERVER_ERROR')).toBe('伺服器發生錯誤，請稍後再試')
    })

    it('回傳 TIMEOUT_ERROR 的訊息', () => {
      expect(getErrorMessage('TIMEOUT_ERROR')).toBe('請求超時，請稍後再試')
    })

    it('回傳 ALREADY_CLAIMED 的訊息', () => {
      expect(getErrorMessage('ALREADY_CLAIMED')).toBe('此任務已被其他人認領')
    })

    it('未知錯誤代碼回傳預設訊息', () => {
      expect(getErrorMessage('NONEXISTENT_CODE')).toBe('發生未知錯誤，請稍後再試')
    })

    it('空字串回傳預設訊息', () => {
      expect(getErrorMessage('')).toBe('發生未知錯誤，請稍後再試')
    })
  })

  // ------------------------------------------
  // handleError - 網路錯誤
  // ------------------------------------------
  describe('handleError - 網路錯誤', () => {
    it('識別 Network Error 訊息', () => {
      const { handleError } = useErrorHandler()
      const error = new Error('Network Error')

      const message = handleError(error)

      expect(message).toBe('網路連線異常，請檢查網路狀態')
      expect(mockShowError).toHaveBeenCalledWith('網路連線異常，請檢查網路狀態')
    })

    it('識別 Failed to fetch 訊息', () => {
      const { handleError } = useErrorHandler()
      const error = new Error('Failed to fetch')

      const message = handleError(error)

      expect(message).toBe('網路連線異常，請檢查網路狀態')
    })

    it('識別 NetworkError name', () => {
      const { handleError } = useErrorHandler()
      const error = new Error('some network issue')
      error.name = 'NetworkError'

      const message = handleError(error)

      expect(message).toBe('網路連線異常，請檢查網路狀態')
    })
  })

  // ------------------------------------------
  // handleError - 超時錯誤
  // ------------------------------------------
  describe('handleError - 超時錯誤', () => {
    it('識別 timeout 訊息', () => {
      const { handleError } = useErrorHandler()
      const error = new Error('Request timeout')

      const message = handleError(error)

      expect(message).toBe('請求超時，請稍後再試')
    })

    it('識別 TimeoutError name', () => {
      const { handleError } = useErrorHandler()
      const error = new Error('timed out')
      error.name = 'TimeoutError'

      const message = handleError(error)

      expect(message).toBe('請求超時，請稍後再試')
    })

    it('識別 ETIMEDOUT 訊息', () => {
      const { handleError } = useErrorHandler()
      const error = new Error('connect ETIMEDOUT')

      const message = handleError(error)

      expect(message).toBe('請求超時，請稍後再試')
    })
  })

  // ------------------------------------------
  // handleError - Axios 錯誤
  // ------------------------------------------
  describe('handleError - Axios 回應錯誤', () => {
    it('處理帶有 response 的 Axios 錯誤', () => {
      const { handleError } = useErrorHandler()
      const error = Object.assign(new Error('Request failed'), {
        response: {
          status: 401,
          data: {
            code: 'UNAUTHORIZED',
            message: '登入已過期，請重新登入',
          },
        },
      })

      const message = handleError(error)

      expect(message).toBe('登入已過期，請重新登入')
    })

    it('使用 HTTP 狀態碼推導錯誤代碼', () => {
      const { handleError } = useErrorHandler()
      const error = Object.assign(new Error('Request failed'), {
        response: {
          status: 403,
          data: {},
        },
      })

      const message = handleError(error)

      expect(message).toBe('您沒有權限執行此操作')
    })

    it('處理 404 狀態碼', () => {
      const { handleError } = useErrorHandler()
      const error = Object.assign(new Error('Not Found'), {
        response: {
          status: 404,
          data: {},
        },
      })

      const message = handleError(error)

      expect(message).toBe('找不到請求的資源')
    })

    it('處理 500 狀態碼', () => {
      const { handleError } = useErrorHandler()
      const error = Object.assign(new Error('Server Error'), {
        response: {
          status: 500,
          data: {},
        },
      })

      const message = handleError(error)

      expect(message).toBe('伺服器發生錯誤，請稍後再試')
    })

    it('處理 503 狀態碼', () => {
      const { handleError } = useErrorHandler()
      const error = Object.assign(new Error('Service Unavailable'), {
        response: {
          status: 503,
          data: {},
        },
      })

      const message = handleError(error)

      expect(message).toBe('服務暫時無法使用，請稍後再試')
    })

    it('處理未知的 HTTP 狀態碼', () => {
      const { handleError } = useErrorHandler()
      const error = Object.assign(new Error('Unknown'), {
        response: {
          status: 418,
          data: {},
        },
      })

      const message = handleError(error)

      expect(message).toBe('發生未知錯誤，請稍後再試')
    })

    it('優先使用 response.data.message', () => {
      const { handleError } = useErrorHandler()
      const error = Object.assign(new Error('Request failed'), {
        response: {
          status: 400,
          data: {
            message: '自訂後端錯誤訊息',
          },
        },
      })

      const message = handleError(error)

      expect(message).toBe('自訂後端錯誤訊息')
    })
  })

  // ------------------------------------------
  // handleError - 字串錯誤
  // ------------------------------------------
  describe('handleError - 字串錯誤', () => {
    it('直接使用字串作為錯誤訊息', () => {
      const { handleError } = useErrorHandler()

      const message = handleError('直接的錯誤文字')

      expect(message).toBe('直接的錯誤文字')
    })
  })

  // ------------------------------------------
  // handleError - 物件錯誤
  // ------------------------------------------
  describe('handleError - 物件錯誤', () => {
    it('處理含 message 屬性的物件', () => {
      const { handleError } = useErrorHandler()

      const message = handleError({ message: '物件錯誤訊息' })

      expect(message).toBe('物件錯誤訊息')
    })

    it('處理含 message 和 code 屬性的物件', () => {
      const { handleError } = useErrorHandler()

      const message = handleError({ message: '訊息', code: 'CUSTOM_CODE' })

      expect(message).toBe('訊息')
    })

    it('無法辨識的錯誤回傳預設訊息', () => {
      const { handleError } = useErrorHandler()

      const message = handleError(12345)

      expect(message).toBe('發生未知錯誤，請稍後再試')
    })

    it('null 錯誤回傳預設訊息', () => {
      const { handleError } = useErrorHandler()

      const message = handleError(null)

      expect(message).toBe('發生未知錯誤，請稍後再試')
    })
  })

  // ------------------------------------------
  // handleError - 選項
  // ------------------------------------------
  describe('handleError - 選項', () => {
    it('showToast 預設為 true', () => {
      const { handleError } = useErrorHandler()

      handleError(new Error('錯誤'))

      expect(mockShowError).toHaveBeenCalledTimes(1)
    })

    it('showToast 為 false 時不顯示 Toast', () => {
      const { handleError } = useErrorHandler()

      handleError(new Error('錯誤'), { showToast: false })

      expect(mockShowError).not.toHaveBeenCalled()
    })

    it('customMessage 覆蓋預設訊息', () => {
      const { handleError } = useErrorHandler()

      const message = handleError(new Error('原始錯誤'), {
        customMessage: '自訂訊息',
      })

      expect(message).toBe('自訂訊息')
      expect(mockShowError).toHaveBeenCalledWith('自訂訊息')
    })

    it('onError 回調被呼叫', () => {
      const { handleError } = useErrorHandler()
      const onError = vi.fn()
      const error = new Error('測試錯誤')

      handleError(error, { onError })

      expect(onError).toHaveBeenCalledWith(error, expect.any(String))
    })

    it('onError 回調接收正確的錯誤訊息', () => {
      const { handleError } = useErrorHandler()
      const onError = vi.fn()

      handleError('字串錯誤', { onError })

      expect(onError).toHaveBeenCalledWith('字串錯誤', '字串錯誤')
    })
  })

  // ------------------------------------------
  // withErrorHandler
  // ------------------------------------------
  describe('withErrorHandler', () => {
    it('成功時回傳函數結果', async () => {
      const { withErrorHandler } = useErrorHandler()
      const fn = async () => '成功結果'

      const wrapped = withErrorHandler(fn)
      const result = await wrapped()

      expect(result).toBe('成功結果')
    })

    it('失敗時回傳 null', async () => {
      const { withErrorHandler } = useErrorHandler()
      const fn = async () => {
        throw new Error('失敗')
      }

      const wrapped = withErrorHandler(fn)
      const result = await wrapped()

      expect(result).toBeNull()
    })

    it('失敗時呼叫 handleError', async () => {
      const { withErrorHandler } = useErrorHandler()
      const fn = async () => {
        throw new Error('失敗')
      }

      const wrapped = withErrorHandler(fn)
      await wrapped()

      expect(mockShowError).toHaveBeenCalled()
    })

    it('傳遞參數給原始函數', async () => {
      const { withErrorHandler } = useErrorHandler()
      const fn = vi.fn(async (a: number, b: string) => `${a}-${b}`)

      const wrapped = withErrorHandler(fn)
      const result = await wrapped(42, 'hello')

      expect(result).toBe('42-hello')
      expect(fn).toHaveBeenCalledWith(42, 'hello')
    })

    it('支援自訂錯誤處理選項', async () => {
      const { withErrorHandler } = useErrorHandler()
      const fn = async () => {
        throw new Error('失敗')
      }
      const onError = vi.fn()

      const wrapped = withErrorHandler(fn, { onError, showToast: false })
      await wrapped()

      expect(mockShowError).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalled()
    })
  })

  // ------------------------------------------
  // handleApiError
  // ------------------------------------------
  describe('handleApiError', () => {
    it('成功結果回傳 true', () => {
      const { handleApiError } = useErrorHandler()

      const result = handleApiError({ success: true })

      expect(result).toBe(true)
      expect(mockShowError).not.toHaveBeenCalled()
    })

    it('失敗結果回傳 false', () => {
      const { handleApiError } = useErrorHandler()

      const result = handleApiError({
        success: false,
        error: { code: 'NOT_FOUND', message: '找不到資源' },
      })

      expect(result).toBe(false)
    })

    it('失敗時顯示 Toast', () => {
      const { handleApiError } = useErrorHandler()

      handleApiError({
        success: false,
        error: { message: '錯誤訊息' },
      })

      expect(mockShowError).toHaveBeenCalledWith('錯誤訊息')
    })

    it('使用 error.code 查找對應訊息', () => {
      const { handleApiError } = useErrorHandler()

      handleApiError({
        success: false,
        error: { code: 'UNAUTHORIZED' },
      })

      expect(mockShowError).toHaveBeenCalledWith('登入已過期，請重新登入')
    })

    it('customMessage 覆蓋 error.message', () => {
      const { handleApiError } = useErrorHandler()

      handleApiError(
        {
          success: false,
          error: { message: '原始訊息' },
        },
        { customMessage: '自訂訊息' },
      )

      expect(mockShowError).toHaveBeenCalledWith('自訂訊息')
    })

    it('showToast 為 false 時不顯示 Toast', () => {
      const { handleApiError } = useErrorHandler()

      handleApiError(
        {
          success: false,
          error: { message: '錯誤' },
        },
        { showToast: false },
      )

      expect(mockShowError).not.toHaveBeenCalled()
    })

    it('呼叫 onError 回調', () => {
      const { handleApiError } = useErrorHandler()
      const onError = vi.fn()

      handleApiError(
        {
          success: false,
          error: { message: '錯誤訊息' },
        },
        { onError },
      )

      expect(onError).toHaveBeenCalled()
    })

    it('success: false 但無 error 時回傳 true', () => {
      const { handleApiError } = useErrorHandler()

      const result = handleApiError({ success: false })

      expect(result).toBe(true)
    })
  })
})
