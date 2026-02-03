<script setup lang="ts">
// 卡片元件 - 可自訂標題、內容與操作區
interface Props {
  title?: string
  subtitle?: string
  noPadding?: boolean
  hoverable?: boolean
}

withDefaults(defineProps<Props>(), {
  noPadding: false,
  hoverable: false,
})
</script>

<template>
  <div
    :class="[
      'bg-white rounded-xl border border-gray-200 shadow-sm',
      {
        'hover:shadow-md hover:border-gray-300 transition-shadow duration-200': hoverable,
      },
    ]"
  >
    <!-- 卡片標頭 -->
    <div
      v-if="title || $slots.header"
      class="px-5 py-4 border-b border-gray-100"
    >
      <slot name="header">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
            <p v-if="subtitle" class="text-sm text-gray-500 mt-0.5">{{ subtitle }}</p>
          </div>
          <slot name="header-actions" />
        </div>
      </slot>
    </div>

    <!-- 卡片內容 -->
    <div :class="{ 'p-5': !noPadding }">
      <slot />
    </div>

    <!-- 卡片底部 -->
    <div
      v-if="$slots.footer"
      class="px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl"
    >
      <slot name="footer" />
    </div>
  </div>
</template>
