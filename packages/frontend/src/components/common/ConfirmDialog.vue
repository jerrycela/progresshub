<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'

// ============================================
// 確認對話框元件
// ROI 優化：替換原生 confirm()
// 此元件應在 App.vue 中掛載一次
// ============================================

const { state, handleConfirm, handleCancel } = useConfirm()

// 類型對應的圖示和顏色
const typeStyles = {
  info: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-700',
  },
  warning: {
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    buttonBg: 'bg-amber-600 hover:bg-amber-700',
  },
  danger: {
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonBg: 'bg-red-600 hover:bg-red-700',
  },
}
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="state.isOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        <!-- 背景遮罩 -->
        <div
          class="absolute inset-0 bg-black/50"
          @click="handleCancel"
        />

        <!-- 對話框 -->
        <div
          class="relative w-full max-w-sm rounded-xl shadow-xl overflow-hidden"
          style="background-color: var(--card-bg);"
        >
          <!-- 內容區 -->
          <div class="p-6">
            <!-- 圖示 -->
            <div class="flex justify-center mb-4">
              <div
                :class="[
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  typeStyles[state.type].iconBg,
                ]"
              >
                <!-- Info 圖示 -->
                <svg
                  v-if="state.type === 'info'"
                  :class="['w-6 h-6', typeStyles[state.type].iconColor]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <!-- Warning 圖示 -->
                <svg
                  v-else-if="state.type === 'warning'"
                  :class="['w-6 h-6', typeStyles[state.type].iconColor]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <!-- Danger 圖示 -->
                <svg
                  v-else
                  :class="['w-6 h-6', typeStyles[state.type].iconColor]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
            </div>

            <!-- 標題 -->
            <h3
              class="text-lg font-semibold text-center mb-2"
              style="color: var(--text-primary);"
            >
              {{ state.title }}
            </h3>

            <!-- 訊息 -->
            <p
              class="text-center"
              style="color: var(--text-secondary);"
            >
              {{ state.message }}
            </p>
          </div>

          <!-- 按鈕區 -->
          <div
            class="flex gap-3 p-4 border-t"
            style="border-color: var(--border-primary); background-color: var(--bg-secondary);"
          >
            <button
              class="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors"
              style="background-color: var(--bg-tertiary); color: var(--text-primary);"
              @click="handleCancel"
            >
              {{ state.cancelText }}
            </button>
            <button
              :class="[
                'flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-colors',
                typeStyles[state.type].buttonBg,
              ]"
              @click="handleConfirm"
            >
              {{ state.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}

.confirm-enter-active > div:last-child,
.confirm-leave-active > div:last-child {
  transition: transform 0.2s ease;
}

.confirm-enter-from > div:last-child,
.confirm-leave-to > div:last-child {
  transform: scale(0.95);
}
</style>
