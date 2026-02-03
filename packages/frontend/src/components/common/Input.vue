<script setup lang="ts">
// ============================================
// 輸入框元件 - Ralph Loop 迭代 11
// 統一的文字輸入框樣式
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
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}

const inputId = props.id || `input-${Math.random().toString(36).slice(2, 9)}`
</script>

<template>
  <div class="space-y-1">
    <!-- 標籤 -->
    <label
      v-if="props.label"
      :for="inputId"
      class="block text-sm font-medium text-gray-700"
    >
      {{ props.label }}
      <span v-if="props.required" class="text-danger">*</span>
    </label>

    <!-- 輸入框 -->
    <input
      :id="inputId"
      :type="props.type"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :required="props.required"
      :class="[
        'w-full px-3 py-2 border rounded-lg transition-colors duration-200',
        'focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none',
        props.disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
        props.error ? 'border-danger' : 'border-gray-300',
      ]"
      @input="handleInput"
    >

    <!-- 錯誤訊息 -->
    <p v-if="props.error" class="text-sm text-danger">{{ props.error }}</p>

    <!-- 輔助文字 -->
    <p v-else-if="props.hint" class="text-sm text-gray-500">{{ props.hint }}</p>
  </div>
</template>
