<script setup lang="ts">
// ============================================
// 卡片元件 - SG-Arts 精品金屬質感設計
// 可自訂標題、內容與操作區 + Dark mode
// ============================================

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
    class="card"
    :class="{
      'hover:shadow-elevated transition-shadow duration-150 cursor-pointer': hoverable,
    }"
  >
    <!-- 卡片標頭 -->
    <div
      v-if="title || $slots.header"
      class="px-5 py-4"
      style="border-bottom: 1px solid var(--border-primary)"
    >
      <slot name="header">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold" style="color: var(--text-primary)">
              {{ title }}
            </h3>
            <p v-if="subtitle" class="text-sm mt-0.5" style="color: var(--text-tertiary)">
              {{ subtitle }}
            </p>
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
      class="px-5 py-4 rounded-b-lg"
      style="border-top: 1px solid var(--border-primary); background-color: var(--bg-secondary)"
    >
      <slot name="footer" />
    </div>
  </div>
</template>
