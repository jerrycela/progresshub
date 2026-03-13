<script lang="ts">
// Module-level counter to track how many modals are open simultaneously
let openModalCount = 0
</script>

<script setup lang="ts">
import { watch, onUnmounted, ref, nextTick } from 'vue'

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

// Ref to the dialog element for focus trap
const dialogRef = ref<HTMLElement | null>(null)
// Previously focused element, restored on close
let previouslyFocused: HTMLElement | null = null

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const getFocusableElements = (): HTMLElement[] => {
  if (!dialogRef.value) return []
  return Array.from(dialogRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS))
}

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close()
  }
}

// ESC 鍵 + Tab focus trap 處理
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.closable) {
    close()
    return
  }

  if (e.key === 'Tab') {
    const focusable = getFocusableElements()
    if (focusable.length === 0) {
      e.preventDefault()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      // Shift+Tab: if on first element, wrap to last
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      // Tab: if on last element, wrap to first
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }
}

// 監聽開關 + 管理背景滾動 + focus 管理（支援多個 modal 同時開啟）
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      previouslyFocused = document.activeElement as HTMLElement
      document.addEventListener('keydown', handleKeydown)
      openModalCount++
      document.body.style.overflow = 'hidden'
      // Focus first focusable element in dialog after render
      nextTick(() => {
        const focusable = getFocusableElements()
        if (focusable.length > 0) {
          focusable[0].focus()
        } else {
          dialogRef.value?.focus()
        }
      })
    } else {
      document.removeEventListener('keydown', handleKeydown)
      openModalCount = Math.max(0, openModalCount - 1)
      if (openModalCount === 0) {
        document.body.style.overflow = ''
      }
      // Restore focus to the element that triggered the modal
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
)

// 元件卸載時確保清理
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (props.modelValue) {
    openModalCount = Math.max(0, openModalCount - 1)
    if (openModalCount === 0) {
      document.body.style.overflow = ''
    }
  }
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
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? 'modal-title' : undefined"
          tabindex="-1"
          :class="[
            'relative w-full rounded-xl shadow-xl flex flex-col max-h-[calc(100vh-2rem)]',
            sizeClasses[size],
          ]"
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
          <div class="px-6 py-4 overflow-y-auto flex-1 min-h-0">
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
