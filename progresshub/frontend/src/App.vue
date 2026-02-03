<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import Sidebar from '@/components/Sidebar.vue'
import { onMounted } from 'vue'

const authStore = useAuthStore()
const themeStore = useThemeStore()

onMounted(async () => {
  // Try to restore session from localStorage
  const token = localStorage.getItem('token')
  if (token) {
    authStore.token = token
    try {
      await authStore.fetchUser()
    } catch {
      authStore.logout()
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors duration-300">
    <Sidebar v-if="authStore.isAuthenticated" />
    <main :class="authStore.isAuthenticated ? 'ml-64' : ''">
      <RouterView />
    </main>
  </div>
</template>
