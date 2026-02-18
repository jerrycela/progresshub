import { mount } from '@vue/test-utils'
import Button from '../Button.vue'

describe('Button', () => {
  // ------------------------------------------
  // 預設渲染
  // ------------------------------------------
  describe('預設渲染', () => {
    it('渲染帶有 default slot 內容的按鈕', () => {
      const wrapper = mount(Button, {
        slots: { default: '確認' },
      })
      expect(wrapper.text()).toContain('確認')
    })

    it('渲染為 button HTML 元素', () => {
      const wrapper = mount(Button, {
        slots: { default: '按鈕' },
      })
      expect(wrapper.element.tagName).toBe('BUTTON')
    })

    it('預設使用 primary variant 的 class', () => {
      const wrapper = mount(Button, {
        slots: { default: '按鈕' },
      })
      expect(wrapper.attributes('class')).toContain('from-indigo-500')
    })

    it('預設使用 md size 的 class', () => {
      const wrapper = mount(Button, {
        slots: { default: '按鈕' },
      })
      expect(wrapper.attributes('class')).toContain('px-4')
    })
  })

  // ------------------------------------------
  // Variant 樣式
  // ------------------------------------------
  describe('Variant 樣式', () => {
    it.each([
      ['primary', 'from-indigo-500'],
      ['secondary', 'from-gray-50'],
      ['success', 'from-emerald-500'],
      ['warning', 'from-amber-500'],
      ['danger', 'from-rose-500'],
      ['info', 'from-blue-500'],
      ['ghost', 'bg-transparent'],
      ['outline', 'text-indigo-600'],
    ] as const)('variant="%s" 套用包含 "%s" 的 class', (variant, expectedClass) => {
      const wrapper = mount(Button, {
        props: { variant },
        slots: { default: '按鈕' },
      })
      expect(wrapper.attributes('class')).toContain(expectedClass)
    })
  })

  // ------------------------------------------
  // Size 尺寸
  // ------------------------------------------
  describe('Size 尺寸', () => {
    it.each([
      ['xs', 'px-2.5'],
      ['sm', 'px-3'],
      ['md', 'px-4'],
      ['lg', 'px-5'],
      ['xl', 'px-7'],
    ] as const)('size="%s" 套用包含 "%s" 的 class', (size, expectedClass) => {
      const wrapper = mount(Button, {
        props: { size },
        slots: { default: '按鈕' },
      })
      expect(wrapper.attributes('class')).toContain(expectedClass)
    })
  })

  // ------------------------------------------
  // Disabled 狀態
  // ------------------------------------------
  describe('Disabled 狀態', () => {
    it('disabled 時按鈕帶有 disabled 屬性', () => {
      const wrapper = mount(Button, {
        props: { disabled: true },
        slots: { default: '按鈕' },
      })
      expect(wrapper.attributes('disabled')).toBeDefined()
    })

    it('disabled 時套用 opacity-60 class', () => {
      const wrapper = mount(Button, {
        props: { disabled: true },
        slots: { default: '按鈕' },
      })
      expect(wrapper.classes()).toContain('opacity-60')
    })

    it('disabled 時點擊不觸發 click 事件', async () => {
      const wrapper = mount(Button, {
        props: { disabled: true },
        slots: { default: '按鈕' },
      })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeUndefined()
    })
  })

  // ------------------------------------------
  // Loading 狀態
  // ------------------------------------------
  describe('Loading 狀態', () => {
    it('loading 時顯示 spinner（svg.animate-spin）', () => {
      const wrapper = mount(Button, {
        props: { loading: true },
        slots: { default: '按鈕' },
      })
      expect(wrapper.find('svg.animate-spin').exists()).toBe(true)
    })

    it('loading 時按鈕帶有 disabled 屬性', () => {
      const wrapper = mount(Button, {
        props: { loading: true },
        slots: { default: '按鈕' },
      })
      expect(wrapper.attributes('disabled')).toBeDefined()
    })

    it('loading 時點擊不觸發 click 事件', async () => {
      const wrapper = mount(Button, {
        props: { loading: true },
        slots: { default: '按鈕' },
      })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeUndefined()
    })

    it('非 loading 時不顯示 spinner', () => {
      const wrapper = mount(Button, {
        slots: { default: '按鈕' },
      })
      expect(wrapper.find('svg.animate-spin').exists()).toBe(false)
    })
  })

  // ------------------------------------------
  // Block 模式
  // ------------------------------------------
  describe('Block 模式', () => {
    it('block=true 時套用 w-full class', () => {
      const wrapper = mount(Button, {
        props: { block: true },
        slots: { default: '按鈕' },
      })
      expect(wrapper.classes()).toContain('w-full')
    })

    it('預設不套用 w-full class', () => {
      const wrapper = mount(Button, {
        slots: { default: '按鈕' },
      })
      expect(wrapper.classes()).not.toContain('w-full')
    })
  })

  // ------------------------------------------
  // Icon 模式
  // ------------------------------------------
  describe('Icon 模式', () => {
    it('icon=true 時使用正方形 padding class', () => {
      const wrapper = mount(Button, {
        props: { icon: true, size: 'md' },
        slots: { default: '按鈕' },
      })
      expect(wrapper.attributes('class')).toContain('p-2.5')
      expect(wrapper.attributes('class')).not.toContain('px-4')
    })
  })

  // ------------------------------------------
  // Click 事件
  // ------------------------------------------
  describe('Click 事件', () => {
    it('點擊時觸發 click 事件', async () => {
      const wrapper = mount(Button, {
        slots: { default: '按鈕' },
      })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })
})
