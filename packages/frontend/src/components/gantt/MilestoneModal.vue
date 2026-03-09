<script setup lang="ts">
import { ref } from 'vue'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import Select from '@/components/common/Select.vue'
import type { MilestoneData } from 'shared/types'
import { useFormatDate } from '@/composables/useFormatDate'
import { useProjectStore } from '@/stores/projects'

defineProps<{
  milestones: MilestoneData[]
  projectOptions: Array<{ value: string; label: string }>
  colorOptions: Array<{ value: string; label: string }>
  canManage: boolean
}>()

const showModal = defineModel<boolean>({ required: true })
const { formatFull } = useFormatDate()
const projectStore = useProjectStore()

const emit = defineEmits<{
  submit: [
    milestone: {
      name: string
      description: string
      date: string
      projectId: string
      color: string
    },
  ]
  update: [
    id: string,
    data: {
      name: string
      description: string
      date: string
      projectId: string
      color: string
    },
  ]
  delete: [id: string]
}>()

const newMilestone = ref({
  name: '',
  description: '',
  date: '',
  projectId: '',
  color: '#F59E0B',
})

const editingMilestone = ref<string | null>(null)

const startEdit = (ms: MilestoneData) => {
  editingMilestone.value = ms.id
  newMilestone.value = {
    name: ms.name,
    description: ms.description || '',
    date: ms.date ? ms.date.substring(0, 10) : '',
    projectId: ms.projectId,
    color: ms.color || '#F59E0B',
  }
}

const cancelEdit = () => {
  editingMilestone.value = null
  newMilestone.value = { name: '', description: '', date: '', projectId: '', color: '#F59E0B' }
}

const handleSubmit = () => {
  if (editingMilestone.value) {
    emit('update', editingMilestone.value, { ...newMilestone.value })
    editingMilestone.value = null
  } else {
    emit('submit', { ...newMilestone.value })
  }
  newMilestone.value = { name: '', description: '', date: '', projectId: '', color: '#F59E0B' }
}

const closeModal = () => {
  editingMilestone.value = null
  newMilestone.value = { name: '', description: '', date: '', projectId: '', color: '#F59E0B' }
  showModal.value = false
}
</script>

<template>
  <Modal v-model="showModal" title="里程碑管理" size="lg">
    <div class="space-y-6">
      <!-- 已有里程碑列表 -->
      <div v-if="milestones.length > 0">
        <h4 class="text-sm font-medium mb-3" style="color: var(--text-secondary)">
          已設定的里程碑
        </h4>
        <div class="space-y-2">
          <div
            v-for="ms in milestones"
            :key="ms.id"
            class="p-3 rounded-lg"
            style="background-color: var(--bg-tertiary)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-3 h-3 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: ms.color || '#F59E0B' }"
                />
                <div class="text-sm font-medium" style="color: var(--text-primary)">
                  {{ ms.name }}
                </div>
              </div>
              <div v-if="canManage" class="flex items-center gap-2">
                <button
                  class="cursor-pointer hover:opacity-80"
                  style="color: var(--text-secondary)"
                  aria-label="編輯里程碑"
                  @click="startEdit(ms)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  class="text-danger hover:text-danger/80 cursor-pointer"
                  aria-label="刪除里程碑"
                  @click="emit('delete', ms.id)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div
              v-if="ms.description"
              class="mt-1 ml-6 text-xs"
              style="color: var(--text-secondary)"
            >
              {{ ms.description }}
            </div>
            <div
              class="mt-2 ml-6 flex flex-wrap gap-x-4 gap-y-1 text-xs"
              style="color: var(--text-tertiary)"
            >
              <span>{{ formatFull(ms.date) }}</span>
              <span v-if="projectStore.getProjectName(ms.projectId)">
                {{ projectStore.getProjectName(ms.projectId) }}
              </span>
              <span v-if="ms.createdByName"> 建立者：{{ ms.createdByName }} </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 新增里程碑表單 -->
      <div v-if="canManage">
        <h4 class="text-sm font-medium mb-3" style="color: var(--text-secondary)">
          {{ editingMilestone ? '編輯里程碑' : '新增里程碑' }}
        </h4>
        <div class="space-y-3">
          <Input v-model="newMilestone.name" label="名稱" placeholder="輸入里程碑名稱" />
          <Input v-model="newMilestone.description" label="說明（選填）" placeholder="輸入說明" />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input v-model="newMilestone.date" type="date" label="日期" />
            <Select v-model="newMilestone.projectId" label="專案" :options="projectOptions" />
          </div>
          <!-- 顏色選擇 -->
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)"
              >顏色</label
            >
            <div class="flex gap-2">
              <button
                v-for="color in colorOptions"
                :key="color.value"
                class="w-8 h-8 rounded-full border-2 transition-all cursor-pointer"
                :class="
                  newMilestone.color === color.value
                    ? 'border-white ring-2 ring-offset-1'
                    : 'border-transparent'
                "
                :style="{ backgroundColor: color.value, '--tw-ring-color': color.value }"
                @click="newMilestone.color = color.value"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button variant="secondary" @click="closeModal">關閉</Button>
      <Button v-if="canManage && editingMilestone" variant="secondary" @click="cancelEdit"
        >取消編輯</Button
      >
      <Button v-if="canManage" @click="handleSubmit">{{
        editingMilestone ? '更新里程碑' : '新增里程碑'
      }}</Button>
    </template>
  </Modal>
</template>
