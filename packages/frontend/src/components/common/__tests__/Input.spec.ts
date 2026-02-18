import { mount } from '@vue/test-utils'
import Input from '../Input.vue'

describe('Input', () => {
  // ------------------------------------------
  // 預設渲染
  // ------------------------------------------
  describe('預設渲染', () => {
    it('渲染 input 元素', () => {
      const wrapper = mount(Input)
      expect(wrapper.find('input').exists()).toBe(true)
    })

    it('預設 type 為 text', () => {
      const wrapper = mount(Input)
      expect(wrapper.find('input').attributes('type')).toBe('text')
    })

    it('不帶 label 時不渲染 label 元素', () => {
      const wrapper = mount(Input)
      expect(wrapper.find('label').exists()).toBe(false)
    })
  })

  // ------------------------------------------
  // v-model 雙向綁定
  // ------------------------------------------
  describe('v-model 雙向綁定', () => {
    it('modelValue 傳入後反映在 input 的 value 上', () => {
      const wrapper = mount(Input, {
        props: { modelValue: '初始值' },
      })
      expect((wrapper.find('input').element as HTMLInputElement).value).toBe('初始值')
    })

    it('輸入文字時觸發 update:modelValue 事件', async () => {
      const wrapper = mount(Input)
      await wrapper.find('input').setValue('新值')
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['新值'])
    })
  })

  // ------------------------------------------
  // Label 和 Required 星號
  // ------------------------------------------
  describe('Label 和 Required 星號', () => {
    it('有 label 時渲染 label 元素', () => {
      const wrapper = mount(Input, {
        props: { label: '使用者名稱' },
      })
      expect(wrapper.find('label').text()).toContain('使用者名稱')
    })

    it('label 的 for 屬性與 input 的 id 對應', () => {
      const wrapper = mount(Input, {
        props: { label: '欄位', id: 'my-input' },
      })
      expect(wrapper.find('label').attributes('for')).toBe('my-input')
      expect(wrapper.find('input').attributes('id')).toBe('my-input')
    })

    it('required=true 時顯示紅色星號', () => {
      const wrapper = mount(Input, {
        props: { label: '姓名', required: true },
      })
      const star = wrapper.find('label span')
      expect(star.exists()).toBe(true)
      expect(star.text()).toBe('*')
    })

    it('required=false 時不顯示星號', () => {
      const wrapper = mount(Input, {
        props: { label: '姓名', required: false },
      })
      expect(wrapper.find('label span').exists()).toBe(false)
    })
  })

  // ------------------------------------------
  // Error 和 Hint 訊息
  // ------------------------------------------
  describe('Error 和 Hint 訊息', () => {
    it('有 error 時顯示錯誤訊息', () => {
      const wrapper = mount(Input, {
        props: { error: '此欄位必填' },
      })
      expect(wrapper.find('.text-danger').text()).toBe('此欄位必填')
    })

    it('有 error 時 input 套用錯誤邊框 class', () => {
      const wrapper = mount(Input, {
        props: { error: '錯誤' },
      })
      expect(wrapper.find('input').classes()).toContain('border-danger')
    })

    it('有 hint 且無 error 時顯示輔助文字', () => {
      const wrapper = mount(Input, {
        props: { hint: '請輸入 6-20 個字元' },
      })
      const hintEl = wrapper.findAll('p').find(p => p.text() === '請輸入 6-20 個字元')
      expect(hintEl).toBeDefined()
    })

    it('同時有 error 和 hint 時，error 優先顯示', () => {
      const wrapper = mount(Input, {
        props: { error: '錯誤訊息', hint: '提示文字' },
      })
      expect(wrapper.text()).toContain('錯誤訊息')
      expect(wrapper.text()).not.toContain('提示文字')
    })
  })

  // ------------------------------------------
  // Disabled 狀態
  // ------------------------------------------
  describe('Disabled 狀態', () => {
    it('disabled 時 input 帶有 disabled 屬性', () => {
      const wrapper = mount(Input, {
        props: { disabled: true },
      })
      expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    })

    it('disabled 時套用 opacity-60 class', () => {
      const wrapper = mount(Input, {
        props: { disabled: true },
      })
      expect(wrapper.find('input').classes()).toContain('opacity-60')
    })
  })

  // ------------------------------------------
  // Type 屬性
  // ------------------------------------------
  describe('Type 屬性', () => {
    it.each(['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date'] as const)(
      'type="%s" 正確傳遞到 input 元素',
      type => {
        const wrapper = mount(Input, {
          props: { type },
        })
        expect(wrapper.find('input').attributes('type')).toBe(type)
      },
    )
  })

  // ------------------------------------------
  // ID 屬性
  // ------------------------------------------
  describe('ID 屬性', () => {
    it('手動指定 id 時使用指定值', () => {
      const wrapper = mount(Input, {
        props: { id: 'custom-id' },
      })
      expect(wrapper.find('input').attributes('id')).toBe('custom-id')
    })

    it('未指定 id 時自動生成以 input- 為前綴的 ID', () => {
      const wrapper = mount(Input)
      expect(wrapper.find('input').attributes('id')).toMatch(/^input-/)
    })
  })
})
