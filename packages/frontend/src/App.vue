<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useTheme } from '@/composables/useTheme'

// 在根元件初始化主題，確保所有頁面都能正確套用
const { initTheme } = useTheme()
initTheme()
</script>

<template>
  <RouterView />
</template>
