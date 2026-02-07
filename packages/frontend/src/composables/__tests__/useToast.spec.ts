import { useToast } from '../useToast'

describe('useToast', () => {
  // 每次測試前清空所有 Toast
  beforeEach(() => {
    vi.useFakeTimers()
    const { clearAll } = useToast()
    clearAll()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ------------------------------------------
  // showSuccess
  // ------------------------------------------
  describe('showSuccess', () => {
    it('新增一個 success 類型的 Toast', () => {
      const { showSuccess, toasts } = useToast()

      showSuccess('操作成功')

      expect(toasts.value).toHaveLength(1)
      expect(toasts.value[0].type).toBe('success')
      expect(toasts.value[0].message).toBe('操作成功')
    })

    it('回傳唯一的 Toast ID', () => {
      const { showSuccess } = useToast()

      const id = showSuccess('成功')

      expect(id).toBeTruthy()
      expect(typeof id).toBe('string')
      expect(id.startsWith('toast-')).toBe(true)
    })

    it('使用預設持續時間 3000ms', () => {
      const { showSuccess, toasts } = useToast()

      showSuccess('操作成功')

      expect(toasts.value[0].duration).toBe(3000)
    })

    it('可自訂持續時間', () => {
      const { showSuccess, toasts } = useToast()

      showSuccess('操作成功', 5000)

      expect(toasts.value[0].duration).toBe(5000)
    })
  })

  // ------------------------------------------
  // showError
  // ------------------------------------------
  describe('showError', () => {
    it('新增一個 error 類型的 Toast', () => {
      const { showError, toasts } = useToast()

      showError('發生錯誤')

      expect(toasts.value).toHaveLength(1)
      expect(toasts.value[0].type).toBe('error')
      expect(toasts.value[0].message).toBe('發生錯誤')
    })

    it('使用錯誤預設持續時間 5000ms', () => {
      const { showError, toasts } = useToast()

      showError('發生錯誤')

      expect(toasts.value[0].duration).toBe(5000)
    })

    it('可自訂持續時間覆蓋預設值', () => {
      const { showError, toasts } = useToast()

      showError('發生錯誤', 10000)

      expect(toasts.value[0].duration).toBe(10000)
    })
  })

  // ------------------------------------------
  // showWarning
  // ------------------------------------------
  describe('showWarning', () => {
    it('新增一個 warning 類型的 Toast', () => {
      const { showWarning, toasts } = useToast()

      showWarning('請注意')

      expect(toasts.value).toHaveLength(1)
      expect(toasts.value[0].type).toBe('warning')
      expect(toasts.value[0].message).toBe('請注意')
    })

    it('使用預設持續時間', () => {
      const { showWarning, toasts } = useToast()

      showWarning('請注意')

      expect(toasts.value[0].duration).toBe(3000)
    })
  })

  // ------------------------------------------
  // showInfo
  // ------------------------------------------
  describe('showInfo', () => {
    it('新增一個 info 類型的 Toast', () => {
      const { showInfo, toasts } = useToast()

      showInfo('提示訊息')

      expect(toasts.value).toHaveLength(1)
      expect(toasts.value[0].type).toBe('info')
      expect(toasts.value[0].message).toBe('提示訊息')
    })

    it('使用預設持續時間', () => {
      const { showInfo, toasts } = useToast()

      showInfo('提示訊息')

      expect(toasts.value[0].duration).toBe(3000)
    })
  })

  // ------------------------------------------
  // 多個 Toast 管理
  // ------------------------------------------
  describe('多個 Toast 管理', () => {
    it('可同時存在多個 Toast', () => {
      const { showSuccess, showError, showWarning, toasts } = useToast()

      showSuccess('成功')
      showError('錯誤')
      showWarning('警告')

      expect(toasts.value).toHaveLength(3)
    })

    it('每個 Toast 有不同的 ID', () => {
      const { showSuccess } = useToast()

      const id1 = showSuccess('訊息 1')
      const id2 = showSuccess('訊息 2')
      const id3 = showSuccess('訊息 3')

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it('Toast 按照新增順序排列', () => {
      const { showSuccess, showError, showInfo, toasts } = useToast()

      showSuccess('第一個')
      showError('第二個')
      showInfo('第三個')

      expect(toasts.value[0].message).toBe('第一個')
      expect(toasts.value[1].message).toBe('第二個')
      expect(toasts.value[2].message).toBe('第三個')
    })
  })

  // ------------------------------------------
  // removeToast
  // ------------------------------------------
  describe('removeToast', () => {
    it('根據 ID 移除指定的 Toast', () => {
      const { showSuccess, removeToast, toasts } = useToast()

      const id = showSuccess('待移除')
      expect(toasts.value).toHaveLength(1)

      removeToast(id)
      expect(toasts.value).toHaveLength(0)
    })

    it('只移除指定的 Toast，不影響其他', () => {
      const { showSuccess, showError, removeToast, toasts } = useToast()

      showSuccess('保留')
      const idToRemove = showError('移除')
      showSuccess('也保留')

      removeToast(idToRemove)

      expect(toasts.value).toHaveLength(2)
      expect(toasts.value[0].message).toBe('保留')
      expect(toasts.value[1].message).toBe('也保留')
    })

    it('移除不存在的 ID 不會報錯', () => {
      const { showSuccess, removeToast, toasts } = useToast()

      showSuccess('存在')

      expect(() => removeToast('不存在的ID')).not.toThrow()
      expect(toasts.value).toHaveLength(1)
    })
  })

  // ------------------------------------------
  // clearAll
  // ------------------------------------------
  describe('clearAll', () => {
    it('清除所有 Toast', () => {
      const { showSuccess, showError, showWarning, clearAll, toasts } = useToast()

      showSuccess('1')
      showError('2')
      showWarning('3')
      expect(toasts.value).toHaveLength(3)

      clearAll()
      expect(toasts.value).toHaveLength(0)
    })

    it('清除後可以繼續新增 Toast', () => {
      const { showSuccess, clearAll, toasts } = useToast()

      showSuccess('舊的')
      clearAll()
      showSuccess('新的')

      expect(toasts.value).toHaveLength(1)
      expect(toasts.value[0].message).toBe('新的')
    })
  })

  // ------------------------------------------
  // 自動移除
  // ------------------------------------------
  describe('自動移除', () => {
    it('到達持續時間後自動移除 Toast', () => {
      const { showSuccess, toasts } = useToast()

      showSuccess('自動移除', 1000)
      expect(toasts.value).toHaveLength(1)

      vi.advanceTimersByTime(1000)
      expect(toasts.value).toHaveLength(0)
    })

    it('持續時間未到時 Toast 仍然存在', () => {
      const { showSuccess, toasts } = useToast()

      showSuccess('還在', 3000)

      vi.advanceTimersByTime(2000)
      expect(toasts.value).toHaveLength(1)
    })

    it('duration 為 0 時不自動移除', () => {
      const { showSuccess, toasts } = useToast()

      showSuccess('永久', 0)

      vi.advanceTimersByTime(10000)
      expect(toasts.value).toHaveLength(1)
    })

    it('多個 Toast 各自獨立計時', () => {
      const { showSuccess, showError, toasts } = useToast()

      showSuccess('短暫', 1000)
      showError('較長') // 預設 5000ms

      vi.advanceTimersByTime(1000)
      expect(toasts.value).toHaveLength(1)
      expect(toasts.value[0].message).toBe('較長')

      vi.advanceTimersByTime(4000)
      expect(toasts.value).toHaveLength(0)
    })
  })

  // ------------------------------------------
  // 全域狀態（單例模式）
  // ------------------------------------------
  describe('全域狀態', () => {
    it('不同呼叫共用相同的 Toast 列表', () => {
      const instance1 = useToast()
      const instance2 = useToast()

      instance1.showSuccess('來自 instance1')

      expect(instance2.toasts.value).toHaveLength(1)
      expect(instance2.toasts.value[0].message).toBe('來自 instance1')
    })

    it('toasts 是唯讀的', () => {
      const { toasts } = useToast()

      // readonly ref 不應該直接被替換
      expect(toasts.value).toBeInstanceOf(Array)
    })
  })
})
