<script setup lang="ts">
import { ref } from 'vue'
import type { UserRole } from 'shared/types'

// ============================================
// 角色權限展示頁面 - 展示四種角色及其權限
// ============================================

// 當前選擇的角色
const selectedRole = ref<UserRole>('EMPLOYEE')

// 角色定義
interface RoleDefinition {
  id: UserRole
  label: string
  description: string
  color: string
  icon: string
}

const roles: RoleDefinition[] = [
  {
    id: 'EMPLOYEE',
    label: '一般同仁',
    description: '公司基層員工，可認領任務池任務並回報進度',
    color: 'blue',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    id: 'PM',
    label: 'PM',
    description: '專案經理，負責管理專案進度和指派任務',
    color: 'purple',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
  {
    id: 'PRODUCER',
    label: '製作人',
    description: '負責整體遊戲製作方向和資源調配',
    color: 'orange',
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  },
  {
    id: 'MANAGER',
    label: '部門主管',
    description: '負責部門管理和成員績效評估',
    color: 'red',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
]

// 權限矩陣
interface PermissionItem {
  name: string
  description: string
  permissions: Record<UserRole, boolean>
}

const permissionMatrix: PermissionItem[] = [
  {
    name: '查看任務池',
    description: '瀏覽所有公開的任務池任務',
    permissions: { EMPLOYEE: true, PM: true, PRODUCER: true, MANAGER: true },
  },
  {
    name: '認領任務',
    description: '從任務池認領待處理任務',
    permissions: { EMPLOYEE: true, PM: true, PRODUCER: true, MANAGER: true },
  },
  {
    name: '回報進度',
    description: '更新自己負責的任務進度',
    permissions: { EMPLOYEE: true, PM: true, PRODUCER: true, MANAGER: true },
  },
  {
    name: '建立自建任務',
    description: '為自己建立個人任務',
    permissions: { EMPLOYEE: true, PM: true, PRODUCER: true, MANAGER: true },
  },
  {
    name: '建立任務池任務',
    description: '發布任務到任務池供他人認領',
    permissions: { EMPLOYEE: false, PM: true, PRODUCER: true, MANAGER: true },
  },
  {
    name: '指派任務',
    description: '將任務直接指派給特定成員',
    permissions: { EMPLOYEE: false, PM: true, PRODUCER: true, MANAGER: true },
  },
  {
    name: '編輯他人任務',
    description: '修改其他成員建立或負責的任務',
    permissions: { EMPLOYEE: false, PM: true, PRODUCER: true, MANAGER: true },
  },
  {
    name: '刪除任務',
    description: '刪除任務（包含他人任務）',
    permissions: { EMPLOYEE: false, PM: true, PRODUCER: true, MANAGER: true },
  },
  {
    name: '查看追殺清單',
    description: '檢視逾期或延遲的任務報表',
    permissions: { EMPLOYEE: false, PM: true, PRODUCER: true, MANAGER: true },
  },
  {
    name: '查看職能負載',
    description: '檢視各職能的工作負載分析',
    permissions: { EMPLOYEE: false, PM: true, PRODUCER: true, MANAGER: true },
  },
  {
    name: '專案管理',
    description: '建立和管理專案',
    permissions: { EMPLOYEE: false, PM: true, PRODUCER: true, MANAGER: false },
  },
  {
    name: '建立里程碑',
    description: '在專案中建立新的里程碑節點',
    permissions: { EMPLOYEE: false, PM: true, PRODUCER: true, MANAGER: true },
  },
  {
    name: '編輯里程碑',
    description: '修改里程碑名稱、日期等資訊',
    permissions: { EMPLOYEE: false, PM: true, PRODUCER: true, MANAGER: true },
  },
  {
    name: '刪除里程碑',
    description: '刪除專案中的里程碑',
    permissions: { EMPLOYEE: false, PM: true, PRODUCER: true, MANAGER: true },
  },
  {
    name: '員工管理',
    description: '管理員工帳號和權限',
    permissions: { EMPLOYEE: false, PM: false, PRODUCER: false, MANAGER: true },
  },
]

// 取得角色顏色樣式
const getRoleColorClass = (color: string, isSelected: boolean): string => {
  if (!isSelected) return 'bg-[var(--bg-tertiary)] border-transparent'

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-500 dark:bg-blue-900/20',
    purple: 'bg-purple-50 border-purple-500 dark:bg-purple-900/20',
    orange: 'bg-orange-50 border-orange-500 dark:bg-orange-900/20',
    red: 'bg-red-50 border-red-500 dark:bg-red-900/20',
  }
  return colorMap[color] || ''
}

const getRoleIconColorClass = (color: string, isSelected: boolean): string => {
  if (!isSelected) return 'text-[var(--text-secondary)]'

  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
  }
  return colorMap[color] || ''
}

const getRoleBadgeClass = (color: string): string => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }
  return colorMap[color] || ''
}

// 取得當前選擇的角色資訊
const currentRole = () => roles.find((r: RoleDefinition) => r.id === selectedRole.value)
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 -->
    <div>
      <h1 class="text-2xl font-bold" style="color: var(--text-primary);">角色權限</h1>
      <p class="text-sm mt-1" style="color: var(--text-secondary);">
        系統中的四種角色及其對應權限說明
      </p>
    </div>

    <!-- 角色選擇卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <button
        v-for="role in roles"
        :key="role.id"
        :class="[
          'p-5 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer',
          getRoleColorClass(role.color, selectedRole === role.id),
        ]"
        @click="selectedRole = role.id"
      >
        <div class="flex items-center gap-3 mb-3">
          <div
            :class="[
              'p-2.5 rounded-xl',
              selectedRole === role.id ? 'bg-white/80 dark:bg-black/20' : 'bg-[var(--bg-secondary)]'
            ]"
          >
            <svg
              :class="['w-6 h-6', getRoleIconColorClass(role.color, selectedRole === role.id)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="role.icon" />
            </svg>
          </div>
          <span
            :class="[
              'text-lg font-bold',
              selectedRole === role.id ? getRoleIconColorClass(role.color, true) : 'text-[var(--text-primary)]'
            ]"
          >
            {{ role.label }}
          </span>
        </div>
        <p class="text-sm" style="color: var(--text-secondary);">
          {{ role.description }}
        </p>
      </button>
    </div>

    <!-- 當前角色詳情 -->
    <div class="card p-6">
      <div class="flex items-center gap-3 mb-6">
        <span
          :class="['px-3 py-1 rounded-full text-sm font-semibold', getRoleBadgeClass(currentRole()?.color || 'blue')]"
        >
          {{ currentRole()?.label }}
        </span>
        <span class="text-sm" style="color: var(--text-secondary);">的權限清單</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="permission in permissionMatrix"
          :key="permission.name"
          :class="[
            'p-4 rounded-xl transition-all duration-200',
            permission.permissions[selectedRole] ? 'bg-green-50 dark:bg-green-900/10' : 'bg-[var(--bg-tertiary)] opacity-60'
          ]"
        >
          <div class="flex items-start gap-3">
            <div
              :class="[
                'mt-0.5 p-1 rounded-full',
                permission.permissions[selectedRole]
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
              ]"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  v-if="permission.permissions[selectedRole]"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
                <path
                  v-else
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <div>
              <h4
                class="font-medium"
                :style="{ color: permission.permissions[selectedRole] ? 'var(--text-primary)' : 'var(--text-muted)' }"
              >
                {{ permission.name }}
              </h4>
              <p class="text-sm mt-0.5" style="color: var(--text-secondary);">
                {{ permission.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 權限對照表 -->
    <div class="card overflow-hidden">
      <div class="p-4 border-b" style="border-color: var(--border-primary);">
        <h2 class="text-lg font-semibold" style="color: var(--text-primary);">權限對照表</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr style="background-color: var(--bg-tertiary);">
              <th class="text-left px-4 py-3 text-sm font-semibold" style="color: var(--text-secondary);">
                權限項目
              </th>
              <th
                v-for="role in roles"
                :key="role.id"
                class="text-center px-4 py-3"
              >
                <span :class="['px-2 py-1 rounded-full text-xs font-semibold', getRoleBadgeClass(role.color)]">
                  {{ role.label }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(permission, index) in permissionMatrix"
              :key="permission.name"
              :class="index % 2 === 0 ? '' : 'bg-[var(--bg-tertiary)]/50'"
            >
              <td class="px-4 py-3">
                <div>
                  <p class="font-medium" style="color: var(--text-primary);">{{ permission.name }}</p>
                  <p class="text-xs" style="color: var(--text-muted);">{{ permission.description }}</p>
                </div>
              </td>
              <td
                v-for="role in roles"
                :key="role.id"
                class="text-center px-4 py-3"
              >
                <div class="flex justify-center">
                  <div
                    :class="[
                      'p-1 rounded-full',
                      permission.permissions[role.id]
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    ]"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        v-if="permission.permissions[role.id]"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                      <path
                        v-else
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 說明區塊 -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">角色說明</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <h3 class="font-medium" style="color: var(--text-primary);">任務來源類型</h3>
          <ul class="space-y-2 text-sm" style="color: var(--text-secondary);">
            <li class="flex items-start gap-2">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">任務池</span>
              <span>公開任務，所有人可見，待認領</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">已指派</span>
              <span>直接指派給特定成員的任務</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">自建</span>
              <span>成員自己建立的個人任務</span>
            </li>
          </ul>
        </div>
        <div class="space-y-4">
          <h3 class="font-medium" style="color: var(--text-primary);">權限規則</h3>
          <ul class="space-y-2 text-sm" style="color: var(--text-secondary);">
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>所有角色都可以認領任務和回報進度</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>PM、製作人、主管可編輯和刪除任務</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>一般同仁只能編輯自己建立的任務</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
