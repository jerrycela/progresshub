<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useProjectStore } from '@/stores/projects'
import { useTaskStore } from '@/stores/tasks'
import { useEmployeeStore } from '@/stores/employees'
import { useToast } from '@/composables/useToast'
import { useFormatDate } from '@/composables/useFormatDate'
import { commonRules, validateField } from '@/composables/useFormValidation'
import { VALIDATION } from '@/constants/pageSettings'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import Input from '@/components/common/Input.vue'
import Select from '@/components/common/Select.vue'
import ProjectMembersModal from '@/components/project/ProjectMembersModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useAuthStore } from '@/stores/auth'
import type { Project } from 'shared/types'

// ============================================
// 專案管理頁面 (PM+ 權限)
// Ralph Loop 迭代 9: 添加表單驗證
// Ralph Loop 迭代 27: RWD 與元件升級
// ============================================
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const employeeStore = useEmployeeStore()
const authStore = useAuthStore()

const projects = computed(() => projectStore.projects)
const { showSuccess, showError } = useToast()
const { formatFull } = useFormatDate()

// 計算專案統計
const getProjectStats = (projectId: string) => {
  const tasks = taskStore.tasks.filter(t => t.projectId === projectId)
  const total = tasks.length
  const completed = tasks.filter(t => t.status === 'DONE').length
  const inProgress = tasks.filter(t => ['IN_PROGRESS', 'CLAIMED'].includes(t.status)).length
  const unclaimed = tasks.filter(t => t.status === 'UNCLAIMED').length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return { total, completed, inProgress, unclaimed, progress }
}

// 取得專案負責人
const getProjectOwner = (createdById: string) =>
  employeeStore.getEmployeeName(createdById) || '未知'

// 專案狀態徽章樣式
// 專案狀態徽章樣式（與 Prisma schema 一致，使用 PAUSED）
const statusBadgeVariant = (status: string) => {
  const variants: Record<string, 'success' | 'warning' | 'default'> = {
    ACTIVE: 'success',
    PAUSED: 'warning',
    COMPLETED: 'default',
  }
  return variants[status] || 'default'
}

const statusLabels: Record<string, string> = {
  ACTIVE: '進行中',
  PAUSED: '暫停',
  COMPLETED: '已完成',
}

// 專案狀態選項（迭代 27，與 Prisma schema 一致）
const projectStatusOptions = computed(() => [
  { value: 'ACTIVE', label: '進行中' },
  { value: 'PAUSED', label: '暫停' },
  { value: 'COMPLETED', label: '已完成' },
])

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
  editingProject.value = {
    ...project,
    startDate: project.startDate?.slice(0, 10) ?? '',
    endDate: project.endDate?.slice(0, 10) ?? '',
  }
  showProjectModal.value = true
}

// 表單驗證錯誤
const formErrors = ref<Record<string, string>>({})

// 驗證規則
const validateProjectForm = (): boolean => {
  formErrors.value = {}
  let isValid = true

  // 驗證專案名稱
  const nameError = validateField(editingProject.value.name, commonRules.projectName())
  if (nameError) {
    formErrors.value.name = nameError
    isValid = false
  }

  // 驗證日期範圍
  if (editingProject.value.startDate && editingProject.value.endDate) {
    const dateRangeError = validateField(null, [
      commonRules.dateRange(editingProject.value.startDate, editingProject.value.endDate),
    ])
    if (dateRangeError) {
      formErrors.value.endDate = dateRangeError
      isValid = false
    }
  }

  return isValid
}

// 清除特定欄位錯誤
const clearFieldError = (field: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [field]: _, ...rest } = formErrors.value
  formErrors.value = rest
}

// 監聽欄位變化清除錯誤
watch(
  () => editingProject.value.name,
  () => clearFieldError('name'),
)
watch(
  () => editingProject.value.endDate,
  () => clearFieldError('endDate'),
)

const saveProject = async () => {
  if (!validateProjectForm()) {
    showError('請修正表單錯誤')
    return
  }

  if (isEditing.value && editingProject.value.id) {
    const result = await projectStore.updateProject(editingProject.value.id, editingProject.value)
    if (result.success) {
      showSuccess('專案已更新')
    } else {
      showError(result.error?.message || '更新專案失敗')
      return
    }
  } else {
    const result = await projectStore.createProject({
      name: editingProject.value.name || '',
      description: editingProject.value.description,
      startDate: editingProject.value.startDate || new Date().toISOString().split('T')[0],
      endDate: editingProject.value.endDate || '',
    })
    if (result.success) {
      showSuccess('專案已建立')
    } else {
      showError(result.error?.message || '建立專案失敗')
      return
    }
  }
  showProjectModal.value = false
}

// 格式化日期
const formatDate = (date?: string) => formatFull(date)

// Members modal state
const showMembersModal = ref(false)
const selectedProjectForMembers = ref<{ id: string; name: string }>({ id: '', name: '' })

const openMembersModal = (project: Project) => {
  selectedProjectForMembers.value = { id: project.id, name: project.name }
  showMembersModal.value = true
}

const canManageMembers = computed(() => {
  const role = authStore.userRole
  return role === 'ADMIN' || role === 'PM' || role === 'PRODUCER' || role === 'MANAGER'
})
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 (RWD: 迭代 27) -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl md:text-2xl font-bold" style="color: var(--text-primary)">專案管理</h1>
        <p class="text-sm md:text-base mt-1" style="color: var(--text-secondary)">
          管理所有專案與任務分配
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
        新增專案
      </Button>
    </div>

    <!-- 空狀態 -->
    <Card v-if="projects.length === 0">
      <EmptyState
        icon="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        title="目前沒有專案"
        description="建立第一個專案來開始管理任務與進度"
        icon-size="lg"
      >
        <Button class="mt-4" @click="openCreateModal">
          <svg class="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          建立專案
        </Button>
      </EmptyState>
    </Card>

    <!-- 專案列表 -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
                {{ project.name }}
              </h3>
              <p class="text-sm mt-0.5" style="color: var(--text-tertiary)">
                {{ project.description }}
              </p>
            </div>
            <Badge :variant="statusBadgeVariant(project.status)" size="sm" dot>
              {{ statusLabels[project.status] }}
            </Badge>
          </div>

          <!-- 進度條 -->
          <ProgressBar :value="getProjectStats(project.id).progress" size="md">
            <template #label>
              <span class="text-sm" style="color: var(--text-secondary)">整體進度</span>
            </template>
          </ProgressBar>

          <!-- 任務統計 (RWD: 迭代 27 - 行動裝置 2x2 網格) -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center">
            <div class="p-2 rounded-lg" style="background-color: var(--bg-tertiary)">
              <p class="text-lg sm:text-xl font-bold" style="color: var(--text-primary)">
                {{ getProjectStats(project.id).total }}
              </p>
              <p class="text-xs" style="color: var(--text-tertiary)">總任務</p>
            </div>
            <div class="p-2 bg-success/10 rounded-lg">
              <p class="text-lg sm:text-xl font-bold text-success">
                {{ getProjectStats(project.id).completed }}
              </p>
              <p class="text-xs" style="color: var(--text-tertiary)">已完成</p>
            </div>
            <div class="p-2 bg-samurai/10 rounded-lg">
              <p class="text-lg sm:text-xl font-bold text-samurai">
                {{ getProjectStats(project.id).inProgress }}
              </p>
              <p class="text-xs" style="color: var(--text-tertiary)">進行中</p>
            </div>
            <div class="p-2 bg-warning/10 rounded-lg">
              <p class="text-lg sm:text-xl font-bold text-warning">
                {{ getProjectStats(project.id).unclaimed }}
              </p>
              <p class="text-xs" style="color: var(--text-tertiary)">待認領</p>
            </div>
          </div>

          <!-- 專案資訊 (RWD: 迭代 27) -->
          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-sm pt-3 border-t"
            style="color: var(--text-tertiary); border-color: var(--border-primary)"
          >
            <span>負責人：{{ getProjectOwner(project.createdById) }}</span>
            <span>{{ formatDate(project.startDate) }} - {{ formatDate(project.endDate) }}</span>
          </div>

          <!-- Action buttons -->
          <div v-if="canManageMembers" class="flex gap-2">
            <Button variant="secondary" size="sm" @click.stop="openMembersModal(project)">
              成員
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <!-- 新增/編輯專案對話框 -->
    <Modal v-model="showProjectModal" :title="isEditing ? '編輯專案' : '新增專案'" size="lg">
      <!-- 表單 (迭代 27: 使用 Input/Select 元件) -->
      <div class="space-y-4">
        <Input
          v-model="editingProject.name"
          label="專案名稱"
          placeholder="輸入專案名稱"
          required
          :maxlength="VALIDATION.PROJECT_NAME_MAX_LENGTH"
          :error="formErrors.name"
        />
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-secondary)"
            >專案說明</label
          >
          <textarea
            v-model="editingProject.description"
            rows="3"
            class="input"
            placeholder="輸入專案說明"
            :maxlength="VALIDATION.DESCRIPTION_MAX_LENGTH"
          />
          <div class="text-xs text-right mt-1" style="color: var(--text-muted)">
            {{ (editingProject.description || '').length }}/{{ VALIDATION.DESCRIPTION_MAX_LENGTH }}
          </div>
        </div>
        <!-- 日期選擇 (RWD: 迭代 27 - 行動裝置堆疊) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input v-model="editingProject.startDate" type="date" label="開始日期" />
          <Input
            v-model="editingProject.endDate"
            type="date"
            label="結束日期"
            :error="formErrors.endDate"
          />
        </div>
        <Select v-model="editingProject.status" label="狀態" :options="projectStatusOptions" />
      </div>

      <template #footer>
        <Button variant="secondary" @click="showProjectModal = false"> 取消 </Button>
        <Button @click="saveProject">
          {{ isEditing ? '儲存變更' : '建立專案' }}
        </Button>
      </template>
    </Modal>

    <!-- Members management modal -->
    <ProjectMembersModal
      v-model="showMembersModal"
      :project-id="selectedProjectForMembers.id"
      :project-name="selectedProjectForMembers.name"
    />
  </div>
</template>
