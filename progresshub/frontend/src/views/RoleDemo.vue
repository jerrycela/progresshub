<script setup lang="ts">
import { ref } from 'vue'
import type { UserRole } from '@/types'

// 當前選擇的角色
const selectedRole = ref<UserRole>('EMPLOYEE')

// 角色資訊
const roles: { id: UserRole; label: string; description: string; color: string }[] = [
  {
    id: 'EMPLOYEE',
    label: '一般同仁',
    description: '執行任務、回報進度、可自建工項',
    color: 'bg-gray-500',
  },
  {
    id: 'PM',
    label: 'PM',
    description: '專案管理、任務分配、進度追蹤',
    color: 'bg-blue-500',
  },
  {
    id: 'PRODUCER',
    label: '製作人',
    description: '遊戲製作方向、團隊協調',
    color: 'bg-purple-500',
  },
  {
    id: 'MANAGER',
    label: '部門主管',
    description: '部門管理、人員調度、績效考核',
    color: 'bg-orange-500',
  },
]

// 權限矩陣
const permissions = [
  { name: '建立任務到任務池', employee: true, pm: true, producer: true, manager: true },
  { name: '指派任務給他人', employee: true, pm: true, producer: true, manager: true },
  { name: '自建個人工項', employee: true, pm: true, producer: true, manager: true },
  { name: '查看所有任務', employee: true, pm: true, producer: true, manager: true },
  { name: '編輯/刪除自己的任務', employee: true, pm: true, producer: true, manager: true },
  { name: '編輯/刪除他人任務', employee: false, pm: true, producer: true, manager: true },
]

// 任務來源類型
const taskSources = [
  {
    type: 'ASSIGNED',
    label: '指派任務',
    icon: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>`,
    description: 'PM/主管/製作人直接指派給特定同仁',
    visibility: '被指派者 + 主管可見',
    color: 'bg-purple-500',
  },
  {
    type: 'POOL',
    label: '任務池',
    icon: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>`,
    description: '發布到公開任務池，任何人可認領',
    visibility: '所有人可見（可按專案/部門篩選）',
    color: 'bg-orange-500',
  },
  {
    type: 'SELF_CREATED',
    label: '自建工項',
    icon: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>`,
    description: '同仁自己建立的個人工項',
    visibility: '所有人可見',
    color: 'bg-cyan-500',
  },
]

// 可見性規則
const visibilityRules = [
  {
    scenario: '指派給小明的任務',
    visibility: '小明 + 小明的主管可見',
  },
  {
    scenario: '任務池的任務',
    visibility: '所有人可見，可按專案/部門篩選',
  },
  {
    scenario: '小明自建的工項',
    visibility: '所有人可見',
  },
]

// 操作規則
const operationRules = [
  { rule: '認領後可退回', allowed: true },
  { rule: '支援多人協作', allowed: true },
  { rule: '按專案篩選', allowed: true },
  { rule: '按部門篩選', allowed: true },
]
</script>

<template>
  <div class="p-6 space-y-8">
    <!-- 頁面標題 -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">角色權限展示</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        查看不同角色的權限和功能差異
      </p>
    </div>

    <!-- 角色選擇器 -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">選擇角色</h2>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          v-for="role in roles"
          :key="role.id"
          @click="selectedRole = role.id"
          class="relative p-4 rounded-xl border-2 transition-all cursor-pointer text-left"
          :class="[
            selectedRole === role.id
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          ]"
        >
          <div class="flex items-center gap-3 mb-2">
            <div :class="['w-3 h-3 rounded-full', role.color]"></div>
            <span class="font-semibold text-gray-900 dark:text-white">{{ role.label }}</span>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ role.description }}</p>

          <div
            v-if="selectedRole === role.id"
            class="absolute top-3 right-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"
          >
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </button>
      </div>
    </div>

    <!-- 權限矩陣 -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">權限矩陣</h2>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">操作</th>
              <th
                v-for="role in roles"
                :key="role.id"
                class="text-center py-3 px-4 text-sm font-medium"
                :class="[
                  selectedRole === role.id
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400'
                ]"
              >
                {{ role.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(perm, index) in permissions"
              :key="index"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 px-4 text-gray-900 dark:text-white">{{ perm.name }}</td>
              <td class="text-center py-3 px-4">
                <span
                  :class="[
                    'inline-flex w-6 h-6 rounded-full items-center justify-center',
                    perm.employee
                      ? 'bg-green-100 dark:bg-green-900/50'
                      : 'bg-red-100 dark:bg-red-900/50'
                  ]"
                >
                  <svg
                    v-if="perm.employee"
                    class="w-4 h-4 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg
                    v-else
                    class="w-4 h-4 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </td>
              <td class="text-center py-3 px-4">
                <span
                  :class="[
                    'inline-flex w-6 h-6 rounded-full items-center justify-center',
                    perm.pm
                      ? 'bg-green-100 dark:bg-green-900/50'
                      : 'bg-red-100 dark:bg-red-900/50'
                  ]"
                >
                  <svg
                    v-if="perm.pm"
                    class="w-4 h-4 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg
                    v-else
                    class="w-4 h-4 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </td>
              <td class="text-center py-3 px-4">
                <span
                  :class="[
                    'inline-flex w-6 h-6 rounded-full items-center justify-center',
                    perm.producer
                      ? 'bg-green-100 dark:bg-green-900/50'
                      : 'bg-red-100 dark:bg-red-900/50'
                  ]"
                >
                  <svg
                    v-if="perm.producer"
                    class="w-4 h-4 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg
                    v-else
                    class="w-4 h-4 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </td>
              <td class="text-center py-3 px-4">
                <span
                  :class="[
                    'inline-flex w-6 h-6 rounded-full items-center justify-center',
                    perm.manager
                      ? 'bg-green-100 dark:bg-green-900/50'
                      : 'bg-red-100 dark:bg-red-900/50'
                  ]"
                >
                  <svg
                    v-if="perm.manager"
                    class="w-4 h-4 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg
                    v-else
                    class="w-4 h-4 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 任務來源類型 -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">任務來源類型</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="source in taskSources"
          :key="source.type"
          class="p-5 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-3 mb-3">
            <div :class="['w-12 h-12 rounded-xl flex items-center justify-center text-white', source.color]">
              <span v-html="source.icon"></span>
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ source.label }}</h3>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">{{ source.description }}</p>
          <div class="text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
            <span class="font-medium">可見性：</span>{{ source.visibility }}
          </div>
        </div>
      </div>
    </div>

    <!-- 可見性規則 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">可見性規則</h2>

        <div class="space-y-3">
          <div
            v-for="(rule, index) in visibilityRules"
            :key="index"
            class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <svg class="w-5 h-5 text-primary-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ rule.scenario }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ rule.visibility }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">操作規則</h2>

        <div class="space-y-3">
          <div
            v-for="(rule, index) in operationRules"
            :key="index"
            class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <span
              :class="[
                'w-6 h-6 rounded-full flex items-center justify-center',
                rule.allowed ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'
              ]"
            >
              <svg
                v-if="rule.allowed"
                class="w-4 h-4 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg
                v-else
                class="w-4 h-4 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
            <span class="text-gray-900 dark:text-white">{{ rule.rule }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 模擬登入提示 -->
    <div class="card p-6 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
          <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-primary-900 dark:text-primary-100">原型展示說明</h3>
          <p class="text-sm text-primary-700 dark:text-primary-300 mt-1">
            此頁面為前端原型展示，用於說明系統的角色權限設計。實際功能需待後端 API 實作完成後才能正常運作。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
