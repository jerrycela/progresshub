<script setup lang="ts">
import { computed } from 'vue'

// 進度條元件 - 顯示任務完成進度
interface Props {
  value: number // 0-100
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'auto'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showLabel: true,
  color: 'auto',
})

// 根據進度自動決定顏色
const barColor = computed(() => {
  if (props.color !== 'auto') {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
    }
    return colorMap[props.color]
  }

  // 自動模式：根據進度決定顏色
  if (props.value >= 100) return 'bg-green-500'
  if (props.value >= 70) return 'bg-blue-500'
  if (props.value >= 30) return 'bg-yellow-500'
  return 'bg-red-500'
})

const sizeClasses: Record<string, { bar: string; text: string }> = {
  sm: { bar: 'h-1.5', text: 'text-xs' },
  md: { bar: 'h-2.5', text: 'text-sm' },
  lg: { bar: 'h-4', text: 'text-base' },
}

// 確保進度值在 0-100 之間
const normalizedValue = computed(() => Math.min(100, Math.max(0, props.value)))
</script>

<template>
  <div class="w-full">
    <div
      v-if="showLabel"
      class="flex justify-between items-center mb-1"
    >
      <slot name="label" />
      <span :class="['font-medium text-gray-700', sizeClasses[size].text]">
        {{ normalizedValue }}%
      </span>
    </div>
    <div
      :class="[
        'w-full bg-gray-200 rounded-full overflow-hidden',
        sizeClasses[size].bar,
      ]"
    >
      <div
        :class="['h-full rounded-full transition-all duration-300', barColor]"
        :style="{ width: `${normalizedValue}%` }"
      />
    </div>
  </div>
</template>
