<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from '@/components/common/Button.vue'

// 404 頁面
const router = useRouter()

const goHome = () => {
  router.push('/dashboard')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background-color: var(--bg-secondary);">
    <div class="text-center">
      <h1 class="text-9xl font-bold" style="color: var(--border-secondary);">404</h1>
      <h2 class="text-2xl font-semibold mt-4" style="color: var(--text-primary);">找不到頁面</h2>
      <p class="mt-2 mb-8" style="color: var(--text-tertiary);">您要找的頁面不存在或已被移除</p>
      <Button @click="goHome">
        返回首頁
      </Button>
    </div>
  </div>
</template>
