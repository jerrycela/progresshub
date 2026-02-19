<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Task } from 'shared/types'
import { getAvailableTasks, groupTasksByProject } from '@/utils/taskRelation'

// ============================================
// 任務關聯選擇器 - 多選下拉選單
// ============================================

interface Props {
  modelValue: string[]
  currentTaskId?: string
  allTasks: Task[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

// 狀態
const isOpen = ref(false)
const searchQuery = ref('')

// 可選任務清單（排除當前任務）
const availableTasks = computed(() => getAvailableTasks(props.allTasks, props.currentTaskId))

// 過濾後的任務清單（根據搜尋關鍵字）
const filteredTasks = computed(() => {
  if (!searchQuery.value.trim()) {
    return availableTasks.value
  }

  const query = searchQuery.value.toLowerCase()
  return availableTasks.value.filter(
    (task: Task) =>
      task.title.toLowerCase().includes(query) || task.project?.name.toLowerCase().includes(query),
  )
})

// 按專案分組的任務
const groupedTasks = computed(() => {
  const groups = groupTasksByProject(filteredTasks.value)
  return Object.entries(groups).map(([projectId, tasks]) => {
    const projectName = tasks[0]?.project?.name || '未知專案'
    return { projectId, projectName, tasks }
  })
})

// 已選擇的任務
const selectedTasks = computed(() =>
  props.allTasks.filter((task: Task) => props.modelValue.includes(task.id)),
)

// 切換任務選擇
const toggleTask = (taskId: string): void => {
  const selected = [...props.modelValue]
  const index = selected.indexOf(taskId)

  if (index === -1) {
    selected.push(taskId)
  } else {
    selected.splice(index, 1)
  }

  emit('update:modelValue', selected)
}

// 移除選擇的任務
const removeTask = (taskId: string): void => {
  const selected = props.modelValue.filter((id: string) => id !== taskId)
  emit('update:modelValue', selected)
}

// 是否已選擇
const isSelected = (taskId: string): boolean => {
  return props.modelValue.includes(taskId)
}

// 打開/關閉下拉選單
const toggleDropdown = (): void => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    searchQuery.value = ''
  }
}

// 關閉下拉選單
const closeDropdown = (): void => {
  isOpen.value = false
}
</script>

<template>
  <div class="relative">
    <!-- 標籤 -->
    <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
      關聯任務（選填）
    </label>
    <p class="text-xs mb-3" style="color: var(--text-tertiary)">選擇與此任務相關的其他任務</p>

    <!-- 下拉選單觸發器 -->
    <button
      type="button"
      class="input w-full text-left flex items-center justify-between cursor-pointer transition-all duration-150"
      :class="{ 'ring-2 ring-[var(--accent-primary)]': isOpen }"
      @click="toggleDropdown"
    >
      <span style="color: var(--text-secondary)">
        {{ modelValue.length > 0 ? `已選擇 ${modelValue.length} 個任務` : '搜尋任務...' }}
      </span>
      <svg
        class="w-5 h-5 transition-transform duration-150"
        :class="{ 'rotate-180': isOpen }"
        style="color: var(--text-tertiary)"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- 下拉選單內容 -->
    <div
      v-if="isOpen"
      class="absolute z-50 mt-2 w-full rounded-lg shadow-lg border overflow-hidden"
      style="background-color: var(--bg-secondary); border-color: var(--border-primary)"
    >
      <!-- 搜尋框 -->
      <div class="p-3 border-b" style="border-color: var(--border-secondary)">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜尋任務..."
          class="input w-full"
          @click.stop
        />
      </div>

      <!-- 任務清單 -->
      <div class="max-h-64 overflow-y-auto">
        <div
          v-if="groupedTasks.length === 0"
          class="p-4 text-center text-sm"
          style="color: var(--text-tertiary)"
        >
          無符合的任務
        </div>

        <div
          v-for="group in groupedTasks"
          :key="group.projectId"
          class="border-b last:border-b-0"
          style="border-color: var(--border-secondary)"
        >
          <!-- 專案名稱 -->
          <div
            class="px-3 py-2 text-xs font-semibold"
            style="color: var(--text-tertiary); background-color: var(--bg-tertiary)"
          >
            {{ group.projectName }}
          </div>

          <!-- 任務列表 -->
          <div
            v-for="task in group.tasks"
            :key="task.id"
            class="px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-all duration-150 hover:bg-[var(--bg-tertiary)]"
            @click="toggleTask(task.id)"
          >
            <!-- 勾選框 -->
            <div
              class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150"
              :class="
                isSelected(task.id)
                  ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                  : 'border-[var(--border-primary)]'
              "
            >
              <svg
                v-if="isSelected(task.id)"
                class="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="3"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <!-- 任務標題 -->
            <span class="text-sm flex-1" style="color: var(--text-primary)">
              {{ task.title }}
            </span>
          </div>
        </div>
      </div>

      <!-- 關閉按鈕 -->
      <div class="p-2 border-t" style="border-color: var(--border-secondary)">
        <button
          type="button"
          class="w-full py-2 text-sm font-medium rounded-lg transition-colors duration-150 cursor-pointer"
          style="background-color: var(--bg-tertiary); color: var(--text-secondary)"
          @click="closeDropdown"
        >
          完成
        </button>
      </div>
    </div>

    <!-- 已選擇的任務標籤 -->
    <div v-if="selectedTasks.length > 0" class="mt-3 flex flex-wrap gap-2">
      <div
        v-for="task in selectedTasks"
        :key="task.id"
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all duration-150"
        style="background-color: var(--accent-primary) / 10; color: var(--accent-primary)"
      >
        <span>{{ task.title }}</span>
        <button
          type="button"
          class="hover:bg-white/20 rounded-full p-0.5 transition-colors duration-150 cursor-pointer"
          @click="removeTask(task.id)"
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

    <!-- 背景遮罩（點擊關閉） -->
    <div v-if="isOpen" class="fixed inset-0 z-40" @click="closeDropdown"></div>
  </div>
</template>
