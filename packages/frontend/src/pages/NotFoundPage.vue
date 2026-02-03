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
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="text-center">
      <h1 class="text-9xl font-bold text-gray-200">404</h1>
      <h2 class="text-2xl font-semibold text-gray-900 mt-4">找不到頁面</h2>
      <p class="text-gray-500 mt-2 mb-8">您要找的頁面不存在或已被移除</p>
      <Button @click="goHome">
        返回首頁
      </Button>
    </div>
  </div>
</template>
