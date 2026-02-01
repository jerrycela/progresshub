<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { projectsApi } from '@/api'
import type { Project } from '@/types'

const router = useRouter()
const loading = ref(true)
const projects = ref<Project[]>([])
const showModal = ref(false)
const editingProject = ref<Project | null>(null)

const form = ref({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
})

onMounted(async () => {
  await loadProjects()
})

const loadProjects = async () => {
  try {
    const response = await projectsApi.getAll()
    projects.value = response.data.projects
  } catch (error) {
    console.error('Failed to load projects:', error)
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editingProject.value = null
  form.value = {
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  }
  showModal.value = true
}

const openEditModal = (project: Project) => {
  editingProject.value = project
  form.value = {
    name: project.name,
    description: project.description || '',
    startDate: project.startDate.split('T')[0],
    endDate: project.endDate?.split('T')[0] || '',
  }
  showModal.value = true
}

const handleSubmit = async () => {
  try {
    const data = {
      name: form.value.name,
      description: form.value.description || null,
      startDate: form.value.startDate,
      endDate: form.value.endDate || null,
    }

    if (editingProject.value) {
      await projectsApi.update(editingProject.value.id, data)
    } else {
      await projectsApi.create(data)
    }

    showModal.value = false
    await loadProjects()
  } catch (error) {
    console.error('Failed to save project:', error)
  }
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    ACTIVE: 'status-active',
    COMPLETED: 'status-completed',
    PAUSED: 'status-paused',
  }
  return classes[status] || ''
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    ACTIVE: '進行中',
    COMPLETED: '已完成',
    PAUSED: '已暫停',
  }
  return texts[status] || status
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW')
}
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">專案管理</h1>
      <button @click="openCreateModal" class="btn btn-primary">
        新增專案
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="projects.length === 0" class="card text-center py-12">
      <svg class="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <p class="mt-4 text-gray-500">尚無專案</p>
      <button @click="openCreateModal" class="btn btn-primary mt-4">
        建立第一個專案
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="project in projects"
        :key="project.id"
        class="card cursor-pointer hover:shadow-lg transition-shadow"
        @click="router.push(`/projects/${project.id}`)"
      >
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ project.name }}</h3>
            <p v-if="project.description" class="text-sm text-gray-500 mt-1 line-clamp-2">
              {{ project.description }}
            </p>
          </div>
          <span :class="['status-badge', getStatusClass(project.status)]">
            {{ getStatusText(project.status) }}
          </span>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-500">開始日期</p>
            <p class="font-medium">{{ formatDate(project.startDate) }}</p>
          </div>
          <div>
            <p class="text-gray-500">結束日期</p>
            <p class="font-medium">{{ project.endDate ? formatDate(project.endDate) : '-' }}</p>
          </div>
        </div>

        <div class="mt-4 flex items-center gap-4 text-sm text-gray-500">
          <span>{{ project._count?.tasks || 0 }} 個任務</span>
          <span>{{ project._count?.milestones || 0 }} 個里程碑</span>
        </div>

        <div class="mt-4 flex gap-2">
          <button
            @click.stop="openEditModal(project)"
            class="text-sm text-primary-600 hover:text-primary-700"
          >
            編輯
          </button>
        </div>
      </div>
    </div>

    <!-- 新增/編輯 Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">
            {{ editingProject ? '編輯專案' : '新增專案' }}
          </h2>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="form-label">專案名稱</label>
              <input
                v-model="form.name"
                type="text"
                class="form-input"
                required
              />
            </div>

            <div>
              <label class="form-label">描述</label>
              <textarea
                v-model="form.description"
                rows="3"
                class="form-input"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="form-label">開始日期</label>
                <input
                  v-model="form.startDate"
                  type="date"
                  class="form-input"
                  required
                />
              </div>
              <div>
                <label class="form-label">結束日期</label>
                <input
                  v-model="form.endDate"
                  type="date"
                  class="form-input"
                />
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button type="button" @click="showModal = false" class="btn btn-secondary">
                取消
              </button>
              <button type="submit" class="btn btn-primary">
                {{ editingProject ? '儲存' : '建立' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
