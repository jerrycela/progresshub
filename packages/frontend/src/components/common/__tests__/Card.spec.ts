import { mount } from '@vue/test-utils'
import Card from '../Card.vue'

describe('Card', () => {
  // ------------------------------------------
  // 預設渲染
  // ------------------------------------------
  describe('預設渲染', () => {
    it('渲染帶有 card class 的容器', () => {
      const wrapper = mount(Card, {
        slots: { default: '內容' },
      })
      expect(wrapper.classes()).toContain('card')
    })

    it('渲染 default slot 內容', () => {
      const wrapper = mount(Card, {
        slots: { default: '<p>卡片內容</p>' },
      })
      expect(wrapper.find('p').text()).toBe('卡片內容')
    })

    it('僅有 default slot 時不渲染標頭和底部', () => {
      const wrapper = mount(Card, {
        slots: { default: '內容' },
      })
      // 標頭有 border-bottom style，底部有 border-top style
      expect(wrapper.find('h3').exists()).toBe(false)
      expect(wrapper.findAll('[style*="border-top"]')).toHaveLength(0)
    })
  })

  // ------------------------------------------
  // Title 和 Subtitle
  // ------------------------------------------
  describe('Title 和 Subtitle', () => {
    it('有 title 時渲染標題文字', () => {
      const wrapper = mount(Card, {
        props: { title: '任務列表' },
        slots: { default: '內容' },
      })
      expect(wrapper.find('h3').text()).toBe('任務列表')
    })

    it('有 subtitle 時渲染副標題', () => {
      const wrapper = mount(Card, {
        props: { title: '任務列表', subtitle: '共 5 筆' },
        slots: { default: '內容' },
      })
      expect(wrapper.find('p').text()).toBe('共 5 筆')
    })

    it('僅有 subtitle 無 title 時不渲染標頭', () => {
      const wrapper = mount(Card, {
        props: { subtitle: '副標題' },
        slots: { default: '內容' },
      })
      // v-if="title || $slots.header" — subtitle alone 不滿足條件
      expect(wrapper.find('h3').exists()).toBe(false)
    })
  })

  // ------------------------------------------
  // Header Slot
  // ------------------------------------------
  describe('Header Slot', () => {
    it('header slot 覆蓋預設的 title/subtitle 渲染', () => {
      const wrapper = mount(Card, {
        props: { title: '原始' },
        slots: {
          default: '內容',
          header: '<div class="custom-header">自訂標頭</div>',
        },
      })
      expect(wrapper.find('.custom-header').exists()).toBe(true)
      expect(wrapper.find('h3').exists()).toBe(false)
    })

    it('header-actions slot 渲染在標題旁', () => {
      const wrapper = mount(Card, {
        props: { title: '任務' },
        slots: {
          default: '內容',
          'header-actions': '<button>新增</button>',
        },
      })
      expect(wrapper.find('button').text()).toBe('新增')
    })
  })

  // ------------------------------------------
  // Footer Slot
  // ------------------------------------------
  describe('Footer Slot', () => {
    it('有 footer slot 時渲染底部區域', () => {
      const wrapper = mount(Card, {
        slots: {
          default: '內容',
          footer: '<span>底部</span>',
        },
      })
      expect(wrapper.find('span').text()).toBe('底部')
    })

    it('無 footer slot 時不渲染底部區域', () => {
      const wrapper = mount(Card, {
        slots: { default: '內容' },
      })
      const footerDiv = wrapper.findAll('[style*="border-top"]')
      expect(footerDiv).toHaveLength(0)
    })
  })

  // ------------------------------------------
  // noPadding 模式
  // ------------------------------------------
  describe('noPadding 模式', () => {
    it('預設內容區域有 p-5 class', () => {
      const wrapper = mount(Card, {
        slots: { default: '內容' },
      })
      // 找到包裹 default slot 的 div（沒有標頭時是第一個 child div）
      const contentDiv = wrapper.find('.card > div')
      expect(contentDiv.classes()).toContain('p-5')
    })

    it('noPadding=true 時內容區域沒有 p-5 class', () => {
      const wrapper = mount(Card, {
        props: { noPadding: true },
        slots: { default: '內容' },
      })
      const contentDiv = wrapper.find('.card > div')
      expect(contentDiv.classes()).not.toContain('p-5')
    })
  })

  // ------------------------------------------
  // Hoverable 模式
  // ------------------------------------------
  describe('Hoverable 模式', () => {
    it('hoverable=true 時套用 hover shadow 相關 class', () => {
      const wrapper = mount(Card, {
        props: { hoverable: true },
        slots: { default: '內容' },
      })
      expect(wrapper.classes()).toContain('cursor-pointer')
    })

    it('預設不套用 cursor-pointer class', () => {
      const wrapper = mount(Card, {
        slots: { default: '內容' },
      })
      expect(wrapper.classes()).not.toContain('cursor-pointer')
    })
  })
})
