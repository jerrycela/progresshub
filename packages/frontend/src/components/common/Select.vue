<script setup lang="ts">
// ============================================
// 下拉選擇元件 - Ralph Loop 迭代 11
// 統一的下拉選擇框樣式
// ============================================

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface Props {
  /** v-model 綁定值 */
  modelValue?: string | number
  /** 選項列表 */
  options: SelectOption[]
  /** 標籤文字 */
  label?: string
  /** 佔位文字（第一個空選項） */
  placeholder?: string
  /** 是否必填 */
  required?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 錯誤訊息 */
  error?: string
  /** 選擇框 ID */
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  required: false,
  disabled: false,
  error: '',
  id: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}

const selectId = props.id || `select-${Math.random().toString(36).slice(2, 9)}`
</script>

<template>
  <div class="space-y-1">
    <!-- 標籤 -->
    <label
      v-if="props.label"
      :for="selectId"
      class="block text-sm font-medium"
      style="color: var(--text-secondary)"
    >
      {{ props.label }}
      <span v-if="props.required" class="text-danger">*</span>
    </label>

    <!-- 選擇框 -->
    <select
      :id="selectId"
      :value="props.modelValue"
      :disabled="props.disabled"
      :required="props.required"
      class="input cursor-pointer"
      :class="[
        props.disabled ? 'opacity-50 cursor-not-allowed' : '',
        props.error ? '!border-danger' : '',
      ]"
      @change="handleChange"
    >
      <!-- 佔位選項 -->
      <option v-if="props.placeholder" value="" disabled>
        {{ props.placeholder }}
      </option>

      <!-- 選項列表 -->
      <option
        v-for="option in props.options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>

    <!-- 錯誤訊息 -->
    <p v-if="props.error" class="text-sm text-danger">{{ props.error }}</p>
  </div>
</template>
