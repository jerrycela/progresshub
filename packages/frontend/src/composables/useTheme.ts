// ============================================
// useTheme - 主題切換 Composable
// 支援 Light/Dark mode，並記憶使用者偏好
// ============================================

import { ref, computed } from 'vue'

type Theme = 'light' | 'dark' | 'system'

// 全域狀態，確保所有元件共用同一個主題狀態
// 預設使用 light mode，避免因系統偏好導致非預期的深色模式
const currentTheme = ref<Theme>('light')
const isDark = ref(false)

// 初始化狀態使用 ref，確保 HMR 時可正確重置
const isInitialized = ref(false)
// 全域 mediaQuery 監聽器引用（用於 cleanup）
const mediaQueryHandler = ref<((e: MediaQueryListEvent) => void) | null>(null)
const mediaQueryRef = ref<MediaQueryList | null>(null)

/**
 * 主題切換 Composable
 *
 * @example
 * ```vue
 * <script setup>
 * import { useTheme } from '@/composables/useTheme'
 *
 * const { isDark, currentTheme, toggleTheme, setTheme } = useTheme()
 * </script>
 *
 * <template>
 *   <button @click="toggleTheme">
 *     {{ isDark ? '🌙' : '☀️' }}
 *   </button>
 * </template>
 * ```
 */
export function useTheme() {
  /**
   * 應用主題到 DOM
   */
  const applyTheme = (dark: boolean): void => {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    isDark.value = dark
  }

  /**
   * 根據系統偏好判斷是否使用深色模式
   */
  const getSystemPreference = (): boolean => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  /**
   * 更新實際顯示的主題
   */
  const updateTheme = (): void => {
    if (currentTheme.value === 'system') {
      applyTheme(getSystemPreference())
    } else {
      applyTheme(currentTheme.value === 'dark')
    }
  }

  /**
   * 設定主題
   */
  const setTheme = (theme: Theme): void => {
    currentTheme.value = theme
    localStorage.setItem('progresshub-theme', theme)
    updateTheme()
  }

  /**
   * 切換 Light/Dark 模式
   * 如果目前是 system 模式，會切換到與系統相反的模式
   */
  const toggleTheme = (): void => {
    if (currentTheme.value === 'system') {
      // 從 system 模式切換，改為與系統相反
      setTheme(getSystemPreference() ? 'light' : 'dark')
    } else {
      // 在 light/dark 之間切換
      setTheme(isDark.value ? 'light' : 'dark')
    }
  }

  /**
   * 初始化主題
   */
  const initTheme = (): void => {
    if (isInitialized.value) return
    isInitialized.value = true

    // 防止初始化時的閃爍
    document.documentElement.classList.add('no-transition')

    // 讀取儲存的偏好
    const savedTheme = localStorage.getItem('progresshub-theme') as Theme | null
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      currentTheme.value = savedTheme
    }

    updateTheme()

    // 移除 no-transition class
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('no-transition')
      })
    })

    // 監聽系統主題變化（具名函式以便 cleanup）
    if (typeof window !== 'undefined') {
      mediaQueryRef.value = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQueryHandler.value = (e: MediaQueryListEvent) => {
        if (currentTheme.value === 'system') {
          applyTheme(e.matches)
        }
      }
      mediaQueryRef.value.addEventListener('change', mediaQueryHandler.value)
    }
  }

  // 主題選項
  const themeOptions = computed(() => [
    { value: 'light' as Theme, label: '淺色模式', icon: 'sun' },
    { value: 'dark' as Theme, label: '深色模式', icon: 'moon' },
    { value: 'system' as Theme, label: '跟隨系統', icon: 'computer' },
  ])

  // 當前主題的標籤
  const currentThemeLabel = computed((): string => {
    const option = themeOptions.value.find(
      (opt: { value: Theme; label: string }) => opt.value === currentTheme.value,
    )
    return option?.label || '跟隨系統'
  })

  return {
    // 狀態
    isDark,
    currentTheme,

    // 計算屬性
    themeOptions,
    currentThemeLabel,

    // 方法
    toggleTheme,
    setTheme,
    initTheme,
  }
}

// 導出類型
export type { Theme }
