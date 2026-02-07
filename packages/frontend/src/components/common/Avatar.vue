<script setup lang="ts">
// ============================================
// 頭像元件 - Ralph Loop 迭代 11
// 支援圖片 URL 或根據名稱生成預設頭像
// ============================================

interface Props {
  /** 圖片 URL */
  src?: string
  /** 使用者名稱（用於 alt 和生成預設頭像） */
  name?: string
  /** 頭像尺寸 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** 自訂 CSS 類別 */
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  name: 'User',
  size: 'md',
})

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
}

// 使用 DiceBear API 生成預設頭像
const avatarSrc = () => {
  if (props.src) return props.src
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(props.name)}`
}
</script>

<template>
  <img
    :src="avatarSrc()"
    :alt="props.name"
    :class="['rounded-full bg-gray-100 object-cover', sizeClasses[props.size], props.class]"
  />
</template>
