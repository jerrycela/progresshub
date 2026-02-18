<script setup lang="ts">
import { watch, onUnmounted } from 'vue'

// 對話框元件 - 用於顯示彈出視窗
interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closable?: boolean
  closeOnOverlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
  closeOnOverlay: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close()
  }
}

// ESC 鍵處理函式（提取為具名函式以便正確 cleanup）
const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.closable) {
    close()
  }
}

// 監聽 ESC 鍵關閉 + 管理背景滾動
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  },
)

// 元件卸載時確保清理
onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
  document.body.style.overflow = ''
})

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-black/50" @click="handleOverlayClick" />

        <!-- 對話框內容 -->
        <div
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? 'modal-title' : undefined"
          :class="['relative w-full rounded-xl shadow-xl', sizeClasses[size]]"
          style="background-color: var(--card-bg)"
        >
          <!-- 標頭 -->
          <div
            v-if="title || $slots.header"
            class="flex items-center justify-between px-6 py-4 border-b"
            style="border-color: var(--border-primary)"
          >
            <slot name="header">
              <h3 id="modal-title" class="text-lg font-semibold" style="color: var(--text-primary)">
                {{ title }}
              </h3>
            </slot>
            <button
              v-if="closable"
              aria-label="關閉"
              class="p-1 rounded-lg transition-colors hover-bg"
              style="color: var(--text-muted)"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- 內容 -->
          <div class="px-6 py-4">
            <slot />
          </div>

          <!-- 底部 -->
          <div
            v-if="$slots.footer"
            class="flex items-center justify-end gap-3 px-6 py-4 border-t rounded-b-xl"
            style="border-color: var(--border-primary); background-color: var(--bg-secondary)"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform 0.2s ease;
}

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
}
</style>
