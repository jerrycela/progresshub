import { useConfirm } from '../useConfirm'
import type { ConfirmOptions } from '../useConfirm'

describe('useConfirm', () => {
  // 每次測試前重置狀態
  beforeEach(() => {
    const { handleCancel } = useConfirm()
    // 確保前一次測試的 dialog 已關閉
    handleCancel()
  })

  // ------------------------------------------
  // showConfirm - 字串參數
  // ------------------------------------------
  describe('showConfirm - 字串參數', () => {
    it('接受字串作為訊息', () => {
      const { showConfirm, state } = useConfirm()

      showConfirm('確定要刪除嗎？')

      expect(state.value.isOpen).toBe(true)
      expect(state.value.message).toBe('確定要刪除嗎？')
    })

    it('字串參數使用預設標題', () => {
      const { showConfirm, state } = useConfirm()

      showConfirm('測試訊息')

      expect(state.value.title).toBe('確認')
    })

    it('字串參數使用預設確認和取消文字', () => {
      const { showConfirm, state } = useConfirm()

      showConfirm('測試')

      expect(state.value.confirmText).toBe('確定')
      expect(state.value.cancelText).toBe('取消')
    })

    it('字串參數使用預設類型 info', () => {
      const { showConfirm, state } = useConfirm()

      showConfirm('測試')

      expect(state.value.type).toBe('info')
    })
  })

  // ------------------------------------------
  // showConfirm - 物件參數
  // ------------------------------------------
  describe('showConfirm - 物件參數', () => {
    it('接受完整的 ConfirmOptions 物件', () => {
      const { showConfirm, state } = useConfirm()

      const options: ConfirmOptions = {
        title: '刪除確認',
        message: '此操作無法復原',
        confirmText: '刪除',
        cancelText: '返回',
        type: 'danger',
      }

      showConfirm(options)

      expect(state.value.isOpen).toBe(true)
      expect(state.value.title).toBe('刪除確認')
      expect(state.value.message).toBe('此操作無法復原')
      expect(state.value.confirmText).toBe('刪除')
      expect(state.value.cancelText).toBe('返回')
      expect(state.value.type).toBe('danger')
    })

    it('只提供必要的 message 欄位，其他使用預設值', () => {
      const { showConfirm, state } = useConfirm()

      showConfirm({ message: '確定嗎？' })

      expect(state.value.title).toBe('確認')
      expect(state.value.confirmText).toBe('確定')
      expect(state.value.cancelText).toBe('取消')
      expect(state.value.type).toBe('info')
    })

    it('支援 warning 類型', () => {
      const { showConfirm, state } = useConfirm()

      showConfirm({ message: '警告', type: 'warning' })

      expect(state.value.type).toBe('warning')
    })

    it('支援自訂標題', () => {
      const { showConfirm, state } = useConfirm()

      showConfirm({ title: '自訂標題', message: '內容' })

      expect(state.value.title).toBe('自訂標題')
    })
  })

  // ------------------------------------------
  // handleConfirm
  // ------------------------------------------
  describe('handleConfirm', () => {
    it('點擊確認時 Promise 解析為 true', async () => {
      const { showConfirm, handleConfirm } = useConfirm()

      const promise = showConfirm('確定嗎？')
      handleConfirm()

      const result = await promise
      expect(result).toBe(true)
    })

    it('確認後對話框關閉', () => {
      const { showConfirm, handleConfirm, state } = useConfirm()

      showConfirm('確定嗎？')
      expect(state.value.isOpen).toBe(true)

      handleConfirm()
      expect(state.value.isOpen).toBe(false)
    })
  })

  // ------------------------------------------
  // handleCancel
  // ------------------------------------------
  describe('handleCancel', () => {
    it('點擊取消時 Promise 解析為 false', async () => {
      const { showConfirm, handleCancel } = useConfirm()

      const promise = showConfirm('確定嗎？')
      handleCancel()

      const result = await promise
      expect(result).toBe(false)
    })

    it('取消後對話框關閉', () => {
      const { showConfirm, handleCancel, state } = useConfirm()

      showConfirm('確定嗎？')
      expect(state.value.isOpen).toBe(true)

      handleCancel()
      expect(state.value.isOpen).toBe(false)
    })
  })

  // ------------------------------------------
  // 對話框狀態管理
  // ------------------------------------------
  describe('對話框狀態管理', () => {
    it('初始狀態為關閉', () => {
      const { state } = useConfirm()

      expect(state.value.isOpen).toBe(false)
    })

    it('showConfirm 後狀態為開啟', () => {
      const { showConfirm, state } = useConfirm()

      showConfirm('測試')

      expect(state.value.isOpen).toBe(true)
    })

    it('連續開啟多個對話框時，後者覆蓋前者', () => {
      const { showConfirm, state } = useConfirm()

      showConfirm('第一個')
      showConfirm('第二個')

      expect(state.value.message).toBe('第二個')
    })

    it('handleConfirm 在沒有 resolve 時不會報錯', () => {
      const { handleConfirm } = useConfirm()

      expect(() => handleConfirm()).not.toThrow()
    })

    it('handleCancel 在沒有 resolve 時不會報錯', () => {
      const { handleCancel } = useConfirm()

      expect(() => handleCancel()).not.toThrow()
    })
  })

  // ------------------------------------------
  // 全域狀態
  // ------------------------------------------
  describe('全域狀態', () => {
    it('不同呼叫共用相同的狀態', () => {
      const instance1 = useConfirm()
      const instance2 = useConfirm()

      instance1.showConfirm('來自 instance1')

      expect(instance2.state.value.message).toBe('來自 instance1')
      expect(instance2.state.value.isOpen).toBe(true)
    })

    it('一個實例確認後另一個實例也看到關閉', () => {
      const instance1 = useConfirm()
      const instance2 = useConfirm()

      instance1.showConfirm('共用')
      instance2.handleConfirm()

      expect(instance1.state.value.isOpen).toBe(false)
    })
  })

  // ------------------------------------------
  // 非同步流程
  // ------------------------------------------
  describe('非同步流程', () => {
    it('完整的確認流程', async () => {
      const { showConfirm, handleConfirm } = useConfirm()

      let resolved = false
      const promise = showConfirm('確定要儲存嗎？').then(result => {
        resolved = true
        return result
      })

      expect(resolved).toBe(false)

      handleConfirm()

      const result = await promise
      expect(resolved).toBe(true)
      expect(result).toBe(true)
    })

    it('完整的取消流程', async () => {
      const { showConfirm, handleCancel } = useConfirm()

      let resolved = false
      const promise = showConfirm('確定要取消嗎？').then(result => {
        resolved = true
        return result
      })

      expect(resolved).toBe(false)

      handleCancel()

      const result = await promise
      expect(resolved).toBe(true)
      expect(result).toBe(false)
    })
  })
})
