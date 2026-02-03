import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(getStoredTheme())
  const isDark = ref(false)

  function getStoredTheme(): Theme {
    if (typeof window === 'undefined') return 'system'
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
    return 'system'
  }

  function getSystemTheme(): boolean {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  function updateDarkMode() {
    if (theme.value === 'system') {
      isDark.value = getSystemTheme()
    } else {
      isDark.value = theme.value === 'dark'
    }

    // Update document class
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function setTheme(newTheme: Theme) {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    updateDarkMode()
  }

  function toggleTheme() {
    if (theme.value === 'light') {
      setTheme('dark')
    } else if (theme.value === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  function cycleTheme() {
    const themes: Theme[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme.value)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  // Initialize
  updateDarkMode()

  // Watch for system theme changes
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value === 'system') {
        updateDarkMode()
      }
    })
  }

  // Watch theme changes
  watch(theme, () => {
    updateDarkMode()
  })

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
    cycleTheme,
  }
})
