import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      shared: resolve(__dirname, '../shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    env: {
      VITE_USE_MOCK: 'true',
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/composables/**', 'src/stores/**', 'src/constants/**', 'src/utils/**'],
      exclude: ['src/**/__tests__/**', 'src/**/index.ts'],
      thresholds: {
        'src/composables/**': {
          statements: 60,
          branches: 60,
          functions: 60,
          lines: 60,
        },
      },
    },
  },
})
