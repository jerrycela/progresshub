<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'
import MultiSearchSelect from '@/components/common/MultiSearchSelect.vue'
import { useProjectStore } from '@/stores/projects'
import { useEmployeeStore } from '@/stores/employees'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { DepartmentLabels, type Department } from 'shared/types'
import type { SearchableOption } from '@/components/common/SearchableSelect.vue'

interface Props {
  modelValue: boolean
  projectId: string
  projectName: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const projectStore = useProjectStore()
const employeeStore = useEmployeeStore()
const authStore = useAuthStore()
const { showSuccess, showError } = useToast()

const selectedEmployeeIds = ref<string[]>([])
const adding = ref(false)

const canManage = computed(() => {
  const role = authStore.userRole
  return role === 'ADMIN' || role === 'PM' || role === 'PRODUCER' || role === 'MANAGER'
})

// Filter employee options: exclude already-added members
// MANAGER: only show employees from same department
const availableEmployeeOptions = computed<SearchableOption[]>(() => {
  const existingIds = new Set(projectStore.projectMembers.map(m => m.employeeId))
  let options = employeeStore.searchableEmployeeOptions.filter(o => !existingIds.has(o.value))

  if (authStore.userRole === 'MANAGER' && authStore.user?.department) {
    const dept = authStore.user.department
    options = options.filter(o => {
      const emp = employeeStore.employees.find(e => e.id === o.value)
      return emp?.department === dept
    })
  }

  return options
})

// Load members AND employees when modal opens
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      projectStore.fetchProjectMembers(props.projectId)
      if (employeeStore.employees.length === 0) {
        employeeStore.fetchEmployees()
      }
      selectedEmployeeIds.value = []
    }
  },
)

const addMembers = async () => {
  if (adding.value || selectedEmployeeIds.value.length === 0) return
  adding.value = true
  try {
    const count = selectedEmployeeIds.value.length
    const success = await projectStore.addProjectMembers(props.projectId, selectedEmployeeIds.value)
    if (success) {
      showSuccess(`已新增 ${count} 位成員`)
      selectedEmployeeIds.value = []
    } else {
      showError('新增成員失敗')
    }
  } finally {
    adding.value = false
  }
}

const removeMember = async (employeeId: string) => {
  const success = await projectStore.removeProjectMember(props.projectId, employeeId)
  if (success) {
    showSuccess('已移除成員')
  } else {
    showError('移除成員失敗')
  }
}
</script>

<template>
  <Modal
    :model-value="props.modelValue"
    :title="`管理成員 — ${props.projectName}`"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-4">
      <!-- Current members list -->
      <div>
        <h4 class="text-sm font-medium mb-2" style="color: var(--text-secondary)">目前成員</h4>
        <div
          v-if="projectStore.loadingMembers"
          class="text-center py-4"
          style="color: var(--text-tertiary)"
        >
          載入中...
        </div>
        <div
          v-else-if="projectStore.projectMembers.length === 0"
          class="text-center py-4"
          style="color: var(--text-tertiary)"
        >
          尚無成員
        </div>
        <div v-else class="space-y-2 max-h-60 overflow-y-auto">
          <div
            v-for="member in projectStore.projectMembers"
            :key="member.id"
            class="flex items-center justify-between p-2 rounded-lg"
            style="background-color: var(--bg-tertiary)"
          >
            <div>
              <span class="font-medium" style="color: var(--text-primary)">{{
                member.employee.name
              }}</span>
              <span class="text-xs ml-2" style="color: var(--text-tertiary)">{{
                DepartmentLabels[member.employee.department as Department] ||
                member.employee.department
              }}</span>
            </div>
            <button
              v-if="canManage"
              class="p-1 rounded hover-bg transition-colors"
              style="color: var(--text-muted)"
              aria-label="移除成員"
              @click="removeMember(member.employeeId)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Add members section (only if canManage) -->
      <div v-if="canManage" class="pt-4 border-t" style="border-color: var(--border-primary)">
        <h4 class="text-sm font-medium mb-2" style="color: var(--text-secondary)">新增成員</h4>
        <MultiSearchSelect
          v-model="selectedEmployeeIds"
          :options="availableEmployeeOptions"
          placeholder="搜尋員工..."
        />
        <Button
          class="mt-3"
          :disabled="selectedEmployeeIds.length === 0 || adding"
          @click="addMembers"
        >
          {{ adding ? '新增中...' : `新增 ${selectedEmployeeIds.length} 位成員` }}
        </Button>
      </div>
    </div>
  </Modal>
</template>
