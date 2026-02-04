<script setup lang="ts">
import { computed } from 'vue'

const slackClientId = import.meta.env.VITE_SLACK_CLIENT_ID || ''
const redirectUri = `${window.location.origin}/oauth/callback`

const slackAuthUrl = computed(() => {
  const params = new URLSearchParams({
    client_id: slackClientId,
    scope: 'openid,profile,email',
    redirect_uri: redirectUri,
  })
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900">
    <div class="max-w-md w-full mx-4">
      <div class="card">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900">ProgressHub</h1>
          <p class="text-gray-600 mt-2">專案進度回報系統</p>
        </div>

        <div class="space-y-6">
          <div class="text-center text-gray-600">
            <p>使用 Slack 帳號登入系統</p>
          </div>

          <a
            :href="slackAuthUrl"
            class="flex items-center justify-center gap-3 w-full px-4 py-3 bg-[#4A154B] text-white rounded-lg hover:bg-[#3a1039] transition-colors"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
            使用 Slack 登入
          </a>
        </div>

        <div class="mt-8 pt-6 border-t border-gray-200">
          <div class="text-center text-sm text-gray-500">
            <p>首次登入會自動建立帳號</p>
            <p class="mt-2">需要幫助？請聯繫 IT 部門</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
