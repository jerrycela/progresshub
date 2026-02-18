import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Modal from '../Modal.vue'

const globalStubs = {
  global: {
    stubs: {
      teleport: true,
      transition: true,
    },
  },
}

describe('Modal', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  // ------------------------------------------
  // 顯示與隱藏
  // ------------------------------------------
  describe('顯示與隱藏', () => {
    it('modelValue=false 時不渲染 Modal 內容', () => {
      const wrapper = mount(Modal, {
        props: { modelValue: false },
        ...globalStubs,
      })
      expect(wrapper.find('.fixed').exists()).toBe(false)
    })

    it('modelValue=true 時渲染 Modal 內容', () => {
      const wrapper = mount(Modal, {
        props: { modelValue: true },
        ...globalStubs,
      })
      expect(wrapper.find('.fixed').exists()).toBe(true)
    })
  })

  // ------------------------------------------
  // Title 顯示
  // ------------------------------------------
  describe('Title 顯示', () => {
    it('有 title 時渲染標題文字', () => {
      const wrapper = mount(Modal, {
        props: { modelValue: true, title: '確認刪除' },
        ...globalStubs,
      })
      expect(wrapper.find('h3').text()).toBe('確認刪除')
    })

    it('無 title 且無 header slot 時不渲染標頭區域', () => {
      const wrapper = mount(Modal, {
        props: { modelValue: true },
        ...globalStubs,
      })
      expect(wrapper.find('h3').exists()).toBe(false)
    })
  })

  // ------------------------------------------
  // 關閉按鈕（closable）
  // ------------------------------------------
  describe('關閉按鈕', () => {
    it('closable=true（預設）時顯示關閉按鈕', () => {
      const wrapper = mount(Modal, {
        props: { modelValue: true, title: '標題' },
        ...globalStubs,
      })
      // 關閉按鈕在標頭區域內，含有 svg
      const headerButtons = wrapper.findAll('button')
      expect(headerButtons.length).toBeGreaterThan(0)
    })

    it('closable=false 時不顯示關閉按鈕', () => {
      const wrapper = mount(Modal, {
        props: { modelValue: true, title: '標題', closable: false },
        ...globalStubs,
      })
      expect(wrapper.find('button').exists()).toBe(false)
    })

    it('點擊關閉按鈕觸發 update:modelValue(false) 和 close 事件', async () => {
      const wrapper = mount(Modal, {
        props: { modelValue: true, title: '標題' },
        ...globalStubs,
      })
      await wrapper.find('button').trigger('click')
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  // ------------------------------------------
  // Overlay 點擊
  // ------------------------------------------
  describe('Overlay 點擊', () => {
    it('closeOnOverlay=true（預設）時，點擊 overlay 觸發關閉', async () => {
      const wrapper = mount(Modal, {
        props: { modelValue: true, title: '標題' },
        ...globalStubs,
      })
      // overlay 是 .absolute.inset-0 的 div
      const overlay = wrapper.find('.absolute.inset-0')
      await overlay.trigger('click')
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    })

    it('closeOnOverlay=false 時，點擊 overlay 不觸發關閉', async () => {
      const wrapper = mount(Modal, {
        props: { modelValue: true, title: '標題', closeOnOverlay: false },
        ...globalStubs,
      })
      const overlay = wrapper.find('.absolute.inset-0')
      await overlay.trigger('click')
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })

  // ------------------------------------------
  // Slot 渲染
  // ------------------------------------------
  describe('Slot 渲染', () => {
    it('渲染 default slot 內容', () => {
      const wrapper = mount(Modal, {
        props: { modelValue: true },
        slots: { default: '<p>對話框內容</p>' },
        ...globalStubs,
      })
      expect(wrapper.find('p').text()).toBe('對話框內容')
    })

    it('header slot 覆蓋預設標題', () => {
      const wrapper = mount(Modal, {
        props: { modelValue: true, title: '原始' },
        slots: { header: '<span class="custom-header">自訂標頭</span>' },
        ...globalStubs,
      })
      expect(wrapper.find('.custom-header').exists()).toBe(true)
    })

    it('有 footer slot 時渲染底部區域', () => {
      const wrapper = mount(Modal, {
        props: { modelValue: true },
        slots: { default: '內容', footer: '<button>確定</button>' },
        ...globalStubs,
      })
      // footer 區域含有 border-t class
      const footerButton = wrapper.findAll('button').find(b => b.text() === '確定')
      expect(footerButton).toBeDefined()
    })

    it('無 footer slot 時不渲染底部區域', () => {
      const wrapper = mount(Modal, {
        props: { modelValue: true },
        slots: { default: '內容' },
        ...globalStubs,
      })
      // 不應有 rounded-b-xl 的 footer div
      expect(wrapper.find('.rounded-b-xl').exists()).toBe(false)
    })
  })

  // ------------------------------------------
  // Size 尺寸
  // ------------------------------------------
  describe('Size 尺寸', () => {
    it.each([
      ['sm', 'max-w-sm'],
      ['md', 'max-w-md'],
      ['lg', 'max-w-lg'],
      ['xl', 'max-w-xl'],
    ] as const)('size="%s" 套用 "%s" class', (size, expectedClass) => {
      const wrapper = mount(Modal, {
        props: { modelValue: true, size },
        ...globalStubs,
      })
      const contentDiv = wrapper.find('.relative.w-full')
      expect(contentDiv.classes()).toContain(expectedClass)
    })
  })

  // ------------------------------------------
  // ESC 鍵關閉
  // ------------------------------------------
  describe('ESC 鍵', () => {
    it('closable=true 時 ESC 鍵觸發關閉', async () => {
      // 先 mount 為 false，再切為 true，讓 watch 觸發註冊 keydown listener
      const wrapper = mount(Modal, {
        props: { modelValue: false, title: '標題', closable: true },
        ...globalStubs,
      })
      await wrapper.setProps({ modelValue: true })
      await nextTick()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await nextTick()

      expect(wrapper.emitted('close')).toHaveLength(1)
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    })
  })
})
