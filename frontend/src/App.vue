<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/Sidebar.vue'
import { onMounted } from 'vue'

const authStore = useAuthStore()

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
  <div class="min-h-screen bg-gray-100">
    <Sidebar v-if="authStore.isAuthenticated" />
    <main :class="authStore.isAuthenticated ? 'ml-64' : ''">
      <RouterView />
    </main>
  </div>
</template>
