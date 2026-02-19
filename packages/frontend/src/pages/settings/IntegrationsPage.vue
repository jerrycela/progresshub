<script setup lang="ts">
import { ref } from 'vue'
import { useUserSettingsStore, type UserSettings } from '@/stores/userSettings'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import Modal from '@/components/common/Modal.vue'

// ============================================
// 整合設定頁 - Slack / GitLab 帳號連結
// ============================================

const { showSuccess, showError, showWarning } = useToast()
const { showConfirm } = useConfirm()
const userSettingsStore = useUserSettingsStore()

const user = ref<UserSettings>({ ...userSettingsStore.settings })

// Modal 狀態
const showLinkGitLabModal = ref(false)
const showLinkSlackModal = ref(false)
const gitlabUsername = ref('')
const slackUsername = ref('')

// 連結 GitLab
const handleLinkGitLab = async (): Promise<void> => {
  if (!gitlabUsername.value.trim()) {
    showWarning('請輸入 GitLab 使用者名稱')
    return
  }

  try {
    const result = await userSettingsStore.linkGitLab(gitlabUsername.value.trim())
    if (result.success && result.data) {
      user.value = { ...result.data }
      showLinkGitLabModal.value = false
      gitlabUsername.value = ''
      showSuccess(`已連結 GitLab 帳號：${user.value.gitlabUsername}`)
    } else {
      showError(result.error?.message || '連結 GitLab 失敗，請稍後再試')
    }
  } catch {
    showError('操作失敗，請稍後再試')
  }
}

// 解除 GitLab 連結
const handleUnlinkGitLab = async (): Promise<void> => {
  const confirmed = await showConfirm({
    title: '解除連結',
    message: '確定要解除 GitLab 帳號連結嗎？',
    type: 'warning',
    confirmText: '解除連結',
  })
  if (!confirmed) return

  try {
    const result = await userSettingsStore.unlinkGitLab()
    if (result.success && result.data) {
      user.value = { ...result.data }
      showSuccess('已解除 GitLab 帳號連結')
    } else {
      showError(result.error?.message || '解除 GitLab 連結失敗，請稍後再試')
    }
  } catch {
    showError('操作失敗，請稍後再試')
  }
}

// 連結 Slack
const handleLinkSlack = async (): Promise<void> => {
  if (!slackUsername.value.trim()) {
    showWarning('請輸入 Slack 使用者名稱')
    return
  }

  try {
    const result = await userSettingsStore.linkSlack(slackUsername.value.trim())
    if (result.success && result.data) {
      user.value = { ...result.data }
      showLinkSlackModal.value = false
      slackUsername.value = ''
      showSuccess(`已連結 Slack 帳號：${user.value.slackUsername}`)
    } else {
      showError(result.error?.message || '連結 Slack 失敗，請稍後再試')
    }
  } catch {
    showError('操作失敗，請稍後再試')
  }
}

// 解除 Slack 連結
const handleUnlinkSlack = async (): Promise<void> => {
  const confirmed = await showConfirm({
    title: '解除連結',
    message: '確定要解除 Slack 帳號連結嗎？',
    type: 'warning',
    confirmText: '解除連結',
  })
  if (!confirmed) return

  try {
    const result = await userSettingsStore.unlinkSlack()
    if (result.success && result.data) {
      user.value = { ...result.data }
      showSuccess('已解除 Slack 帳號連結')
    } else {
      showError(result.error?.message || '解除 Slack 連結失敗，請稍後再試')
    }
  } catch {
    showError('操作失敗，請稍後再試')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面說明 -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold mb-2 text-primary">整合設定</h2>
      <p class="text-secondary">連結您的第三方帳號，以便在 ProgressHub 中接收通知和同步資訊。</p>
    </div>

    <!-- Slack 整合 -->
    <div class="card p-6">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-4">
          <!-- Slack 圖示 -->
          <div
            class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#4a154b]"
          >
            <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
              />
            </svg>
          </div>

          <div>
            <h3 class="text-base font-semibold text-primary">Slack</h3>
            <p class="text-sm mt-1 text-secondary">連結 Slack 帳號以接收任務通知和進度提醒</p>

            <!-- 連結狀態 -->
            <div v-if="user.slackId" class="flex items-center gap-2 mt-3">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500"
              >
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                已連結
              </span>
              <span class="text-sm text-primary">
                {{ user.slackUsername }}
              </span>
            </div>
            <div v-else class="mt-3">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-elevated text-muted"
              >
                尚未連結
              </span>
            </div>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <button
          v-if="user.slackId"
          class="btn-danger-outline flex-shrink-0"
          @click="handleUnlinkSlack"
        >
          解除連結
        </button>
        <button v-else class="btn-primary flex-shrink-0" @click="showLinkSlackModal = true">
          連結帳號
        </button>
      </div>
    </div>

    <!-- GitLab 整合 -->
    <div class="card p-6">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-4">
          <!-- GitLab 圖示 -->
          <div
            class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#fc6d26]"
          >
            <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="m23.6 9.593-.033-.086L20.3.98a.851.851 0 0 0-.336-.405.87.87 0 0 0-.507-.164.865.865 0 0 0-.508.152.861.861 0 0 0-.336.405l-2.2 6.748H7.587L5.387.968a.861.861 0 0 0-.336-.405.87.87 0 0 0-.507-.164.865.865 0 0 0-.508.152.861.861 0 0 0-.336.405L.433 9.507l-.033.086a6.066 6.066 0 0 0 2.012 7.01l.01.008.028.02 4.97 3.722 2.458 1.86 1.497 1.132a1.014 1.014 0 0 0 1.224 0l1.497-1.131 2.458-1.86 4.998-3.743.012-.01a6.068 6.068 0 0 0 2.008-7.008z"
              />
            </svg>
          </div>

          <div>
            <h3 class="text-base font-semibold text-primary">GitLab</h3>
            <p class="text-sm mt-1 text-secondary">連結 GitLab 帳號以在任務中關聯 Issue</p>

            <!-- 連結狀態 -->
            <div v-if="user.gitlabId" class="flex items-center gap-2 mt-3">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500"
              >
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                已連結
              </span>
              <span class="text-sm text-primary">
                {{ user.gitlabUsername }}
              </span>
            </div>
            <div v-else class="mt-3">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-elevated text-muted"
              >
                尚未連結
              </span>
            </div>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <button
          v-if="user.gitlabId"
          class="btn-danger-outline flex-shrink-0"
          @click="handleUnlinkGitLab"
        >
          解除連結
        </button>
        <button v-else class="btn-primary flex-shrink-0" @click="showLinkGitLabModal = true">
          連結帳號
        </button>
      </div>
    </div>

    <!-- 連結 Slack Modal -->
    <Modal v-model="showLinkSlackModal" title="連結 Slack 帳號" size="md">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2 text-secondary"> Slack 使用者名稱 </label>
          <input
            v-model="slackUsername"
            type="text"
            class="input w-full"
            placeholder="例如：@john.doe"
          />
          <p class="mt-2 text-xs text-muted">請輸入您在 Slack 上的使用者名稱（包含 @）</p>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showLinkSlackModal = false">取消</button>
        <button class="btn-primary" @click="handleLinkSlack">確認連結</button>
      </template>
    </Modal>

    <!-- 連結 GitLab Modal -->
    <Modal v-model="showLinkGitLabModal" title="連結 GitLab 帳號" size="md">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2 text-secondary"> GitLab 使用者名稱 </label>
          <input
            v-model="gitlabUsername"
            type="text"
            class="input w-full"
            placeholder="例如：john.doe"
          />
          <p class="mt-2 text-xs text-muted">請輸入您在 GitLab 上的使用者名稱</p>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showLinkGitLabModal = false">取消</button>
        <button class="btn-primary" @click="handleLinkGitLab">確認連結</button>
      </template>
    </Modal>
  </div>
</template>
