<script setup lang="ts">
import type { MockEmployee, UserRole } from 'shared/types'
import { getRoleBadgeClass } from '@/composables/useStatusUtils'
import Modal from '@/components/common/Modal.vue'

// ============================================
// 任務詳情 Modal 集合元件
// 包含：進度回報、指派任務、GitLab 關聯、新增註記
// ============================================

defineProps<{
  showProgressModal: boolean
  showAssignModal: boolean
  showGitLabModal: boolean
  showNoteModal: boolean
  employees: MockEmployee[]
  newProgress: { percentage: number; notes: string }
  gitlabUrl: string
  newNoteContent: string
  currentUser: { id: string; name: string; userRole: UserRole }
}>()

const emit = defineEmits<{
  'update:showProgressModal': [value: boolean]
  'update:showAssignModal': [value: boolean]
  'update:showGitLabModal': [value: boolean]
  'update:showNoteModal': [value: boolean]
  'update:newProgress': [value: { percentage: number; notes: string }]
  'update:gitlabUrl': [value: string]
  'update:newNoteContent': [value: string]
  submitProgress: []
  assignTask: [employeeId: string]
  linkGitLab: []
  submitNote: []
}>()

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'PM':
      return 'PM'
    case 'PRODUCER':
      return '製作人'
    case 'MANAGER':
      return '部門主管'
    default:
      return '同仁'
  }
}
</script>

<template>
  <!-- 進度回報 Modal -->
  <Modal
    :model-value="showProgressModal"
    title="回報進度"
    size="md"
    @update:model-value="emit('update:showProgressModal', $event)"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2 text-secondary"> 目前進度 </label>
        <div class="flex items-center gap-4">
          <input
            :value="newProgress.percentage"
            type="range"
            min="0"
            max="100"
            class="flex-1"
            @input="
              emit('update:newProgress', {
                ...newProgress,
                percentage: Number(($event.target as HTMLInputElement).value),
              })
            "
          />
          <span class="text-lg font-semibold w-16 text-right text-primary">
            {{ newProgress.percentage }}%
          </span>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium mb-2 text-secondary"> 備註 </label>
        <textarea
          :value="newProgress.notes"
          rows="3"
          class="input w-full"
          placeholder="描述進度更新內容..."
          @input="
            emit('update:newProgress', {
              ...newProgress,
              notes: ($event.target as HTMLTextAreaElement).value,
            })
          "
        ></textarea>
      </div>
    </div>

    <template #footer>
      <button class="btn-secondary" @click="emit('update:showProgressModal', false)">取消</button>
      <button class="btn-primary" @click="emit('submitProgress')">提交</button>
    </template>
  </Modal>

  <!-- 指派任務 Modal -->
  <Modal
    :model-value="showAssignModal"
    title="指派任務"
    size="md"
    @update:model-value="emit('update:showAssignModal', $event)"
  >
    <div class="space-y-2 max-h-64 overflow-y-auto">
      <button
        v-for="employee in employees"
        :key="employee.id"
        class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer text-left bg-transparent"
        @click="emit('assignTask', employee.id)"
      >
        <div class="w-10 h-10 rounded-full flex items-center justify-center bg-elevated">
          <span class="font-semibold text-accent-primary">
            {{ employee.name.charAt(0) }}
          </span>
        </div>
        <div>
          <p class="font-medium text-primary">{{ employee.name }}</p>
          <p class="text-sm text-muted">{{ employee.email }}</p>
        </div>
      </button>
    </div>

    <template #footer>
      <button class="btn-secondary" @click="emit('update:showAssignModal', false)">取消</button>
    </template>
  </Modal>

  <!-- 關聯 GitLab Issue Modal -->
  <Modal
    :model-value="showGitLabModal"
    title="關聯 GitLab Issue"
    size="md"
    @update:model-value="emit('update:showGitLabModal', $event)"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2 text-secondary"> GitLab Issue URL </label>
        <input
          :value="gitlabUrl"
          type="text"
          class="input w-full"
          placeholder="https://gitlab.com/project/issues/123"
          @input="emit('update:gitlabUrl', ($event.target as HTMLInputElement).value)"
        />
        <p class="mt-2 text-xs text-muted">請輸入 GitLab Issue 的完整 URL</p>
      </div>
    </div>

    <template #footer>
      <button class="btn-secondary" @click="emit('update:showGitLabModal', false)">取消</button>
      <button class="btn-primary" @click="emit('linkGitLab')">確認關聯</button>
    </template>
  </Modal>

  <!-- 新增註記 Modal -->
  <Modal
    :model-value="showNoteModal"
    title="新增註記"
    size="md"
    @update:model-value="emit('update:showNoteModal', $event)"
  >
    <div class="space-y-4">
      <div class="flex items-center gap-2 p-3 rounded-lg bg-surface">
        <svg class="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span class="text-sm text-secondary">
          以 <strong class="text-primary">{{ currentUser.name }}</strong> 身份發表
        </span>
        <span
          :class="[
            'px-2 py-0.5 text-xs font-medium rounded-full ml-auto',
            getRoleBadgeClass(currentUser.userRole),
          ]"
        >
          {{ getRoleLabel(currentUser.userRole) }}
        </span>
      </div>

      <div>
        <label class="block text-sm font-medium mb-2 text-secondary"> 註記內容 </label>
        <textarea
          :value="newNoteContent"
          rows="4"
          class="input w-full resize-none"
          placeholder="輸入註記內容..."
          @input="emit('update:newNoteContent', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </div>
    </div>

    <template #footer>
      <button class="btn-secondary" @click="emit('update:showNoteModal', false)">取消</button>
      <button class="btn-primary" @click="emit('submitNote')">發表註記</button>
    </template>
  </Modal>
</template>
