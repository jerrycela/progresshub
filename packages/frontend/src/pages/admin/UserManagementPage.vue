<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEmployeeStore } from '@/stores/employees'
import { functionTypeLabels, roleLabels } from '@/constants/labels'
import { FUNCTION_OPTIONS, ROLE_OPTIONS } from '@/constants/filterOptions'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import Input from '@/components/common/Input.vue'
import Select from '@/components/common/Select.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { User, UserRole, FunctionType, Department } from 'shared/types'

// ============================================
// 員工管理頁面 - Admin 專用
// Ralph Loop 迭代 28: RWD 與元件升級
// ============================================

const employeeStore = useEmployeeStore()

// 將員工資料轉為 User 格式供頁面使用
const users = computed<User[]>(() =>
  employeeStore.employees.map(e => ({
    id: e.id,
    name: e.name,
    email: e.email,
    role: (e.userRole || 'EMPLOYEE') as UserRole,
    functionType: (e.department === 'QA'
      ? 'PLANNING'
      : e.department === 'MANAGEMENT'
        ? 'PLANNING'
        : e.department) as FunctionType,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  })),
)

// 搜尋關鍵字
const searchQuery = ref('')

// 篩選條件
const selectedRole = ref<UserRole | 'ALL'>('ALL')
const selectedFunction = ref<FunctionType | 'ALL'>('ALL')

// 篩選後的使用者
const filteredUsers = computed(() => {
  let result = users.value as User[]

  // 搜尋篩選
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (u: User) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
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
const roleBadgeVariant = (role: UserRole) => {
  const variants: Record<UserRole, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
    EMPLOYEE: 'default',
    PM: 'primary',
    PRODUCER: 'warning',
    MANAGER: 'success',
    ADMIN: 'danger',
  }
  return variants[role] || 'default'
}

// 編輯使用者對話框
const showEditModal = ref(false)
const editingUser = ref<Partial<User>>({})

const openEditModal = (user: User) => {
  editingUser.value = { ...user }
  showEditModal.value = true
}

const saveUser = () => {
  if (!editingUser.value.id) return
  employeeStore.updateEmployee(editingUser.value.id, {
    name: editingUser.value.name,
    email: editingUser.value.email,
    userRole: editingUser.value.role,
  })
  showEditModal.value = false
}

// 新增使用者對話框
const showCreateModal = ref(false)
const newUser = ref<Partial<User>>({
  name: '',
  email: '',
  role: 'EMPLOYEE',
  functionType: 'PROGRAMMING',
})

const openCreateModal = () => {
  newUser.value = {
    name: '',
    email: '',
    role: 'EMPLOYEE',
    functionType: 'PROGRAMMING',
  }
  showCreateModal.value = true
}

const createUser = () => {
  const deptMap: Record<string, Department> = {
    PROGRAMMING: 'PROGRAMMING',
    ART: 'ART',
    PLANNING: 'PLANNING',
    SOUND: 'SOUND',
    QA: 'QA',
    VFX: 'ART',
    ANIMATION: 'ART',
    COMBAT: 'PROGRAMMING',
  }
  const functionType = newUser.value.functionType || 'PROGRAMMING'
  employeeStore.createEmployee({
    name: newUser.value.name || '',
    email: newUser.value.email || '',
    department: deptMap[functionType] || 'PROGRAMMING',
    userRole: newUser.value.role || 'EMPLOYEE',
  })
  showCreateModal.value = false
}

// 使用常數選項（迭代 28）
const roleOptions = ROLE_OPTIONS
const functionOptions = FUNCTION_OPTIONS

// 表單專用選項（排除 ALL）
const roleFormOptions = computed(() => ROLE_OPTIONS.filter(opt => opt.value !== 'ALL'))
const functionFormOptions = computed(() => FUNCTION_OPTIONS.filter(opt => opt.value !== 'ALL'))
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 (RWD: 迭代 28) -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl md:text-2xl font-bold" style="color: var(--text-primary)">員工管理</h1>
        <p class="text-sm md:text-base mt-1" style="color: var(--text-tertiary)">
          管理團隊成員帳號與權限
        </p>
      </div>
      <Button @click="openCreateModal">
        <svg class="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        新增成員
      </Button>
    </div>

    <!-- 搜尋與篩選 (迭代 28: 使用 Input/Select 元件) -->
    <Card>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="sm:col-span-2 lg:col-span-2">
          <Input v-model="searchQuery" type="search" label="搜尋" placeholder="搜尋姓名或信箱..." />
        </div>
        <Select v-model="selectedRole" label="角色" :options="roleOptions" />
        <Select v-model="selectedFunction" label="職能" :options="functionOptions" />
      </div>
    </Card>

    <!-- 使用者列表 (RWD: 迭代 10) -->
    <Card title="成員列表" :subtitle="`共 ${filteredUsers.length} 人`">
      <!-- 桌面版：表格視圖 -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-primary)">
              <th class="text-left py-3 px-4 font-medium" style="color: var(--text-secondary)">
                成員
              </th>
              <th class="text-left py-3 px-4 font-medium" style="color: var(--text-secondary)">
                信箱
              </th>
              <th class="text-left py-3 px-4 font-medium" style="color: var(--text-secondary)">
                角色
              </th>
              <th class="text-left py-3 px-4 font-medium" style="color: var(--text-secondary)">
                職能
              </th>
              <th class="text-right py-3 px-4 font-medium" style="color: var(--text-secondary)">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              class="hover-bg transition-colors duration-200"
              style="border-top: 1px solid var(--border-primary)"
            >
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <img
                    :src="
                      user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
                    "
                    :alt="user.name"
                    class="w-10 h-10 rounded-full"
                    style="background-color: var(--bg-tertiary)"
                  />
                  <span class="font-medium" style="color: var(--text-primary)">{{
                    user.name
                  }}</span>
                </div>
              </td>
              <td class="py-3 px-4" style="color: var(--text-secondary)">{{ user.email }}</td>
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
                <Button variant="ghost" size="sm" @click="openEditModal(user)"> 編輯 </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 手機版：卡片視圖 -->
      <div class="md:hidden space-y-3">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="p-4 rounded-lg space-y-3"
          style="background-color: var(--bg-secondary)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img
                :src="user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`"
                :alt="user.name"
                class="w-12 h-12 rounded-full"
                style="background-color: var(--bg-tertiary)"
              />
              <div>
                <p class="font-medium" style="color: var(--text-primary)">{{ user.name }}</p>
                <p class="text-sm" style="color: var(--text-tertiary)">{{ user.email }}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" @click="openEditModal(user)"> 編輯 </Button>
          </div>
          <div class="flex items-center gap-2">
            <Badge :variant="roleBadgeVariant(user.role)" size="sm">
              {{ roleLabels[user.role] }}
            </Badge>
            <Badge variant="info" size="sm">
              {{ functionTypeLabels[user.functionType] }}
            </Badge>
          </div>
        </div>
      </div>

      <!-- 空狀態 (迭代 28: 使用 EmptyState 元件) -->
      <EmptyState
        v-if="filteredUsers.length === 0"
        icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        title="沒有符合條件的成員"
        description="請嘗試調整搜尋條件"
      />
    </Card>

    <!-- 編輯使用者對話框 (迭代 28: 使用 Input/Select 元件) -->
    <Modal v-model="showEditModal" title="編輯成員資料" size="md">
      <div class="space-y-4">
        <Input v-model="editingUser.name" label="姓名" />
        <Input v-model="editingUser.email" type="email" label="信箱" />
        <Select v-model="editingUser.role" label="角色" :options="roleFormOptions" />
        <Select v-model="editingUser.functionType" label="職能" :options="functionFormOptions" />
      </div>

      <template #footer>
        <Button variant="secondary" @click="showEditModal = false"> 取消 </Button>
        <Button @click="saveUser"> 儲存變更 </Button>
      </template>
    </Modal>

    <!-- 新增使用者對話框 (迭代 28: 使用 Input/Select 元件) -->
    <Modal v-model="showCreateModal" title="新增成員" size="md">
      <div class="space-y-4">
        <Input v-model="newUser.name" label="姓名" placeholder="輸入成員姓名" />
        <Input v-model="newUser.email" type="email" label="信箱" placeholder="輸入公司信箱" />
        <Select v-model="newUser.role" label="角色" :options="roleFormOptions" />
        <Select v-model="newUser.functionType" label="職能" :options="functionFormOptions" />
      </div>

      <template #footer>
        <Button variant="secondary" @click="showCreateModal = false"> 取消 </Button>
        <Button @click="createUser"> 新增成員 </Button>
      </template>
    </Modal>
  </div>
</template>
