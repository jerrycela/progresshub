<script setup lang="ts">
import { ref } from 'vue'
import { mockProjects, mockTasks, mockUsers } from '@/mocks/data'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import type { Project } from 'shared/types'

// 專案管理頁面 (PM+ 權限)
const projects = ref(mockProjects)

// 計算專案統計
const getProjectStats = (projectId: string) => {
  const tasks = mockTasks.filter(t => t.projectId === projectId)
  const total = tasks.length
  const completed = tasks.filter(t => t.status === 'DONE').length
  const inProgress = tasks.filter(t => ['IN_PROGRESS', 'CLAIMED'].includes(t.status)).length
  const unclaimed = tasks.filter(t => t.status === 'UNCLAIMED').length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return { total, completed, inProgress, unclaimed, progress }
}

// 取得專案負責人
const getProjectOwner = (createdById: string) =>
  mockUsers.find(u => u.id === createdById)?.name || '未知'

// 專案狀態徽章樣式
const statusBadgeVariant = (status: string) => {
  const variants: Record<string, 'success' | 'warning' | 'default'> = {
    ACTIVE: 'success',
    ON_HOLD: 'warning',
    COMPLETED: 'default',
  }
  return variants[status] || 'default'
}

const statusLabels: Record<string, string> = {
  ACTIVE: '進行中',
  ON_HOLD: '暫停',
  COMPLETED: '已完成',
}

// 新增/編輯專案對話框
const showProjectModal = ref(false)
const isEditing = ref(false)
const editingProject = ref<Partial<Project>>({
  name: '',
  description: '',
  status: 'ACTIVE',
  startDate: '',
  endDate: '',
})

const openCreateModal = () => {
  isEditing.value = false
  editingProject.value = {
    name: '',
    description: '',
    status: 'ACTIVE',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  }
  showProjectModal.value = true
}

const openEditModal = (project: Project) => {
  isEditing.value = true
  editingProject.value = { ...project }
  showProjectModal.value = true
}

const saveProject = () => {
  // Mock: 實際會呼叫 API
  console.log('儲存專案:', editingProject.value)
  showProjectModal.value = false
}

// 格式化日期
const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">專案管理</h1>
        <p class="text-gray-500 mt-1">管理所有專案與任務分配</p>
      </div>
      <Button @click="openCreateModal">
        <svg class="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        新增專案
      </Button>
    </div>

    <!-- 專案列表 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card
        v-for="project in projects"
        :key="project.id"
        hoverable
        class="cursor-pointer"
        @click="openEditModal(project)"
      >
        <div class="space-y-4">
          <!-- 標題與狀態 -->
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ project.name }}</h3>
              <p class="text-sm text-gray-500 mt-0.5">{{ project.description }}</p>
            </div>
            <Badge :variant="statusBadgeVariant(project.status)" size="sm" dot>
              {{ statusLabels[project.status] }}
            </Badge>
          </div>

          <!-- 進度條 -->
          <ProgressBar :value="getProjectStats(project.id).progress" size="md">
            <template #label>
              <span class="text-sm text-gray-600">整體進度</span>
            </template>
          </ProgressBar>

          <!-- 任務統計 -->
          <div class="grid grid-cols-4 gap-3 text-center">
            <div class="p-2 bg-gray-50 rounded-lg">
              <p class="text-xl font-bold text-gray-900">{{ getProjectStats(project.id).total }}</p>
              <p class="text-xs text-gray-500">總任務</p>
            </div>
            <div class="p-2 bg-success/10 rounded-lg">
              <p class="text-xl font-bold text-success">{{ getProjectStats(project.id).completed }}</p>
              <p class="text-xs text-gray-500">已完成</p>
            </div>
            <div class="p-2 bg-primary-50 rounded-lg">
              <p class="text-xl font-bold text-primary-700">{{ getProjectStats(project.id).inProgress }}</p>
              <p class="text-xs text-gray-500">進行中</p>
            </div>
            <div class="p-2 bg-warning/10 rounded-lg">
              <p class="text-xl font-bold text-warning">{{ getProjectStats(project.id).unclaimed }}</p>
              <p class="text-xs text-gray-500">待認領</p>
            </div>
          </div>

          <!-- 專案資訊 -->
          <div class="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
            <span>負責人：{{ getProjectOwner(project.createdById) }}</span>
            <span>{{ formatDate(project.startDate) }} - {{ formatDate(project.endDate) }}</span>
          </div>
        </div>
      </Card>
    </div>

    <!-- 新增/編輯專案對話框 -->
    <Modal
      v-model="showProjectModal"
      :title="isEditing ? '編輯專案' : '新增專案'"
      size="lg"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">專案名稱</label>
          <input
            v-model="editingProject.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="輸入專案名稱"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">專案說明</label>
          <textarea
            v-model="editingProject.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="輸入專案說明"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
            <input
              v-model="editingProject.startDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
            <input
              v-model="editingProject.endDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">狀態</label>
          <select
            v-model="editingProject.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
          >
            <option value="ACTIVE">進行中</option>
            <option value="ON_HOLD">暫停</option>
            <option value="COMPLETED">已完成</option>
          </select>
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" @click="showProjectModal = false">
          取消
        </Button>
        <Button @click="saveProject">
          {{ isEditing ? '儲存變更' : '建立專案' }}
        </Button>
      </template>
    </Modal>
  </div>
</template>
