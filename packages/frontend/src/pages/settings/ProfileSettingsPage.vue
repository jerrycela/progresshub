<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserSettingsStore, type UserSettings } from '@/stores/userSettings'
import { roleLabels, functionTypeLabels, departmentLabels } from '@/constants/labels'
import Badge from '@/components/common/Badge.vue'
import { useToast } from '@/composables/useToast'

// ============================================
// 個人資料設定頁
// ============================================

const { showSuccess, showInfo } = useToast()
const userSettingsStore = useUserSettingsStore()

const user = ref<UserSettings>({ ...userSettingsStore.settings })
const isEditing = ref(false)
const isSaving = ref(false)

// 編輯表單資料
const formData = ref({
  name: user.value.name,
  email: user.value.email,
})

// 計算屬性
const roleLabel = computed(() => roleLabels[user.value.role] || user.value.role)
const functionLabel = computed(
  () => functionTypeLabels[user.value.functionType] || user.value.functionType,
)
const departmentLabel = computed(
  () => departmentLabels[user.value.department] || user.value.department,
)

// 生成頭像 URL
const avatarUrl = computed(() => {
  return user.value.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.value.name}`
})

// 開始編輯
const startEditing = (): void => {
  formData.value = {
    name: user.value.name,
    email: user.value.email,
  }
  isEditing.value = true
}

// 取消編輯
const cancelEditing = (): void => {
  isEditing.value = false
  formData.value = {
    name: user.value.name,
    email: user.value.email,
  }
}

// 儲存變更
const saveChanges = async (): Promise<void> => {
  isSaving.value = true

  // 模擬 API 延遲
  await new Promise(resolve => setTimeout(resolve, 500))

  await userSettingsStore.updateSettings({
    name: formData.value.name,
    email: formData.value.email,
  })

  user.value = { ...userSettingsStore.settings }
  isEditing.value = false
  isSaving.value = false

  showSuccess('個人資料已更新')
}

// 檢查表單是否有變更
const hasChanges = computed(() => {
  return formData.value.name !== user.value.name || formData.value.email !== user.value.email
})

// 更換頭像（待實作）
const changeAvatar = (): void => {
  showInfo('更換頭像功能即將推出')
}
</script>

<template>
  <div class="card p-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold" style="color: var(--text-primary)">個人資料</h2>
      <button v-if="!isEditing" class="btn-secondary" @click="startEditing">編輯資料</button>
    </div>

    <!-- 個人資料內容 -->
    <div class="flex flex-col md:flex-row gap-8">
      <!-- 頭像區塊 -->
      <div class="flex-shrink-0 flex flex-col items-center">
        <div class="relative">
          <img
            :src="avatarUrl"
            :alt="user.name"
            class="w-24 h-24 rounded-full object-cover"
            style="background-color: var(--bg-tertiary)"
          />
          <button
            v-if="isEditing"
            class="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            style="background-color: var(--accent-primary); color: white"
            title="更換頭像"
            @click="changeAvatar"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
        <p class="mt-3 text-sm" style="color: var(--text-muted)">點擊更換頭像</p>
      </div>

      <!-- 資料欄位 -->
      <div class="flex-1 space-y-6">
        <!-- 可編輯欄位 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 姓名 -->
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
              姓名
            </label>
            <input
              v-if="isEditing"
              v-model="formData.name"
              type="text"
              class="input-field w-full"
              placeholder="請輸入姓名"
            />
            <p v-else class="py-2" style="color: var(--text-primary)">
              {{ user.name }}
            </p>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
              Email
            </label>
            <input
              v-if="isEditing"
              v-model="formData.email"
              type="email"
              class="input-field w-full"
              placeholder="請輸入 Email"
            />
            <p v-else class="py-2" style="color: var(--text-primary)">
              {{ user.email }}
            </p>
          </div>
        </div>

        <!-- 分隔線 -->
        <div style="border-top: 1px solid var(--border-primary)"></div>

        <!-- 唯讀欄位 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- 角色 -->
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
              角色
            </label>
            <div class="flex items-center gap-2 py-1">
              <Badge variant="primary">{{ roleLabel }}</Badge>
              <span class="text-xs" style="color: var(--text-muted)">（由管理員設定）</span>
            </div>
          </div>

          <!-- 職能 -->
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
              職能
            </label>
            <div class="flex items-center gap-2 py-1">
              <Badge variant="info">{{ functionLabel }}</Badge>
              <span class="text-xs" style="color: var(--text-muted)">（由管理員設定）</span>
            </div>
          </div>

          <!-- 部門 -->
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
              部門
            </label>
            <p class="py-2" style="color: var(--text-primary)">
              {{ departmentLabel }}
              <span class="text-xs ml-2" style="color: var(--text-muted)">（由管理員設定）</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 編輯模式按鈕 -->
    <div
      v-if="isEditing"
      class="flex justify-end gap-3 mt-8 pt-6"
      style="border-top: 1px solid var(--border-primary)"
    >
      <button class="btn-secondary" :disabled="isSaving" @click="cancelEditing">取消</button>
      <button class="btn-primary" :disabled="!hasChanges || isSaving" @click="saveChanges">
        {{ isSaving ? '儲存中...' : '儲存變更' }}
      </button>
    </div>
  </div>
</template>
