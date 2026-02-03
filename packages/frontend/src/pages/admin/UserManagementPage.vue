<script setup lang="ts">
import { ref, computed } from 'vue'
import { mockUsers, functionTypeLabels, roleLabels } from '@/mocks/data'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import type { User, Role, FunctionType } from 'shared/types'

// 員工管理頁面 - Admin 專用

const users = ref(mockUsers)

// 搜尋關鍵字
const searchQuery = ref('')

// 篩選條件
const selectedRole = ref<Role | 'ALL'>('ALL')
const selectedFunction = ref<FunctionType | 'ALL'>('ALL')

// 篩選後的使用者
const filteredUsers = computed(() => {
  let result = users.value as User[]

  // 搜尋篩選
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((u: User) =>
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    )
  }

  // 角色篩選
  if (selectedRole.value !== 'ALL') {
    result = result.filter((u: User) => u.role === selectedRole.value)
  }

  // 職能篩選
  if (selectedFunction.value !== 'ALL') {
    result = result.filter((u: User) => u.functionType === selectedFunction.value)
  }

  return result
})

// 角色徽章樣式
const roleBadgeVariant = (role: Role) => {
  const variants: Record<Role, 'default' | 'primary' | 'success'> = {
    MEMBER: 'default',
    PM: 'primary',
    ADMIN: 'success',
  }
  return variants[role]
}

// 編輯使用者對話框
const showEditModal = ref(false)
const editingUser = ref<Partial<User>>({})

const openEditModal = (user: User) => {
  editingUser.value = { ...user }
  showEditModal.value = true
}

const saveUser = () => {
  // Mock: 實際會呼叫 API
  const index = users.value.findIndex((u: User) => u.id === editingUser.value.id)
  if (index !== -1) {
    users.value[index] = { ...users.value[index], ...editingUser.value } as User
  }
  showEditModal.value = false
}

// 新增使用者對話框
const showCreateModal = ref(false)
const newUser = ref<Partial<User>>({
  name: '',
  email: '',
  role: 'MEMBER',
  functionType: 'PROGRAMMING',
})

const openCreateModal = () => {
  newUser.value = {
    name: '',
    email: '',
    role: 'MEMBER',
    functionType: 'PROGRAMMING',
  }
  showCreateModal.value = true
}

const createUser = () => {
  // Mock: 實際會呼叫 API
  const user: User = {
    id: String(Date.now()),
    name: newUser.value.name || '',
    email: newUser.value.email || '',
    role: newUser.value.role || 'MEMBER',
    functionType: newUser.value.functionType || 'PROGRAMMING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  users.value.push(user)
  showCreateModal.value = false
}

// 角色選項
const roleOptions: { value: Role | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部角色' },
  { value: 'MEMBER', label: '成員' },
  { value: 'PM', label: '專案經理' },
  { value: 'ADMIN', label: '管理員' },
]

// 職能選項
const functionOptions: { value: FunctionType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部職能' },
  { value: 'PLANNING', label: '企劃' },
  { value: 'PROGRAMMING', label: '程式' },
  { value: 'ART', label: '美術' },
  { value: 'ANIMATION', label: '動態' },
  { value: 'SOUND', label: '音效' },
  { value: 'VFX', label: '特效' },
  { value: 'COMBAT', label: '戰鬥' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">員工管理</h1>
        <p class="text-gray-500 mt-1">管理團隊成員帳號與權限</p>
      </div>
      <Button @click="openCreateModal">
        <svg class="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        新增成員
      </Button>
    </div>

    <!-- 搜尋與篩選 -->
    <Card>
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-sm font-medium text-gray-700 mb-1">搜尋</label>
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="搜尋姓名或信箱..."
            >
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">角色</label>
          <select
            v-model="selectedRole"
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
          >
            <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">職能</label>
          <select
            v-model="selectedFunction"
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
          >
            <option v-for="opt in functionOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
    </Card>

    <!-- 使用者列表 -->
    <Card title="成員列表" :subtitle="`共 ${filteredUsers.length} 人`">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="text-left py-3 px-4 font-medium text-gray-700">成員</th>
              <th class="text-left py-3 px-4 font-medium text-gray-700">信箱</th>
              <th class="text-left py-3 px-4 font-medium text-gray-700">角色</th>
              <th class="text-left py-3 px-4 font-medium text-gray-700">職能</th>
              <th class="text-right py-3 px-4 font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              class="hover:bg-gray-50 transition-colors duration-200"
            >
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <img
                    :src="user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`"
                    :alt="user.name"
                    class="w-10 h-10 rounded-full bg-gray-100"
                  >
                  <span class="font-medium text-gray-900">{{ user.name }}</span>
                </div>
              </td>
              <td class="py-3 px-4 text-gray-600">{{ user.email }}</td>
              <td class="py-3 px-4">
                <Badge :variant="roleBadgeVariant(user.role)" size="sm">
                  {{ roleLabels[user.role] }}
                </Badge>
              </td>
              <td class="py-3 px-4">
                <Badge variant="info" size="sm">
                  {{ functionTypeLabels[user.functionType] }}
                </Badge>
              </td>
              <td class="py-3 px-4 text-right">
                <Button variant="ghost" size="sm" @click="openEditModal(user)">
                  編輯
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 空狀態 -->
      <div v-if="filteredUsers.length === 0" class="text-center py-8 text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <p>沒有符合條件的成員</p>
      </div>
    </Card>

    <!-- 編輯使用者對話框 -->
    <Modal v-model="showEditModal" title="編輯成員資料" size="md">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">姓名</label>
          <input
            v-model="editingUser.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">信箱</label>
          <input
            v-model="editingUser.email"
            type="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">角色</label>
          <select
            v-model="editingUser.role"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
          >
            <option value="MEMBER">成員</option>
            <option value="PM">專案經理</option>
            <option value="ADMIN">管理員</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">職能</label>
          <select
            v-model="editingUser.functionType"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
          >
            <option v-for="opt in functionOptions.slice(1)" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" @click="showEditModal = false">
          取消
        </Button>
        <Button @click="saveUser">
          儲存變更
        </Button>
      </template>
    </Modal>

    <!-- 新增使用者對話框 -->
    <Modal v-model="showCreateModal" title="新增成員" size="md">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">姓名</label>
          <input
            v-model="newUser.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="輸入成員姓名"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">信箱</label>
          <input
            v-model="newUser.email"
            type="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="輸入公司信箱"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">角色</label>
          <select
            v-model="newUser.role"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
          >
            <option value="MEMBER">成員</option>
            <option value="PM">專案經理</option>
            <option value="ADMIN">管理員</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">職能</label>
          <select
            v-model="newUser.functionType"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
          >
            <option v-for="opt in functionOptions.slice(1)" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" @click="showCreateModal = false">
          取消
        </Button>
        <Button @click="createUser">
          新增成員
        </Button>
      </template>
    </Modal>
  </div>
</template>
