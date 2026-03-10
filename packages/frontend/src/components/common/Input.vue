<script setup lang="ts">
import { computed } from 'vue'
// ============================================
// 輸入框元件 - SG-Arts 精品金屬質感設計
// 統一的文字輸入框樣式 + Dark mode
// ============================================

interface Props {
  /** v-model 綁定值 */
  modelValue?: string | number
  /** 輸入類型 */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date'
  /** 佔位文字 */
  placeholder?: string
  /** 標籤文字 */
  label?: string
  /** 是否必填 */
  required?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 錯誤訊息 */
  error?: string
  /** 輔助文字 */
  hint?: string
  /** 輸入框 ID */
  id?: string
  /** 最大字元數（啟用後顯示字元計數器） */
  maxlength?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  label: '',
  required: false,
  disabled: false,
  error: '',
  hint: '',
  id: '',
  maxlength: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const handleInput = (event: Event): void => {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}

const inputId = props.id || `input-${Math.random().toString(36).slice(2, 9)}`

const currentLength = computed(() => String(props.modelValue ?? '').length)
const showCounter = computed(() => props.maxlength !== undefined && props.maxlength > 0)
</script>

<template>
  <div class="space-y-1.5">
    <!-- 標籤 -->
    <label
      v-if="props.label"
      :for="inputId"
      class="block text-sm font-medium"
      style="color: var(--text-secondary)"
    >
      {{ props.label }}
      <span v-if="props.required" class="text-samurai">*</span>
    </label>

    <!-- 輸入框 -->
    <input
      :id="inputId"
      :type="props.type"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :required="props.required"
      :maxlength="props.maxlength"
      class="input"
      :class="{
        'opacity-60 cursor-not-allowed': props.disabled,
        'border-danger focus:ring-danger/30 focus:border-danger': props.error,
      }"
      :style="{
        backgroundColor: props.disabled ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
      }"
      @input="handleInput"
    />

    <!-- 字元計數器 + 錯誤/輔助文字 -->
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <p v-if="props.error" class="text-sm text-danger">{{ props.error }}</p>
        <p v-else-if="props.hint" class="text-sm" style="color: var(--text-muted)">
          {{ props.hint }}
        </p>
      </div>
      <span v-if="showCounter" class="text-xs ml-2 flex-shrink-0" style="color: var(--text-muted)">
        {{ currentLength }}/{{ props.maxlength }}
      </span>
    </div>
  </div>
</template>
