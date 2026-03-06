<script setup lang="ts">
// ============================================
// Searchable Select - dropdown with search filtering
// ============================================
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

export interface SearchableOption {
  value: string
  label: string
  sublabel?: string
  disabled?: boolean
}

interface Props {
  modelValue?: string
  options: SearchableOption[]
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  placeholder: '請選擇',
  required: false,
  disabled: false,
  error: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const search = ref('')
const highlightedIndex = ref(-1)

const selectedOption = computed(() => props.options.find(opt => opt.value === props.modelValue))

const filteredOptions = computed(() => {
  if (!search.value) return props.options
  const query = search.value.toLowerCase()
  return props.options.filter(
    opt =>
      opt.label.toLowerCase().includes(query) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(query)),
  )
})

const toggleDropdown = () => {
  if (props.disabled) return
  if (isOpen.value) {
    closeDropdown()
  } else {
    openDropdown()
  }
}

const openDropdown = () => {
  isOpen.value = true
  search.value = ''
  highlightedIndex.value = -1
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

const closeDropdown = () => {
  isOpen.value = false
  search.value = ''
}

const selectOption = (option: SearchableOption) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  closeDropdown()
}

const clearSelection = (event: Event) => {
  event.stopPropagation()
  emit('update:modelValue', '')
}

const activeDescendantId = computed(() => {
  if (highlightedIndex.value < 0 || highlightedIndex.value >= filteredOptions.value.length) {
    return undefined
  }
  return `searchable-opt-${filteredOptions.value[highlightedIndex.value].value}`
})

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeDropdown()
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (filteredOptions.value.length === 0) return
    highlightedIndex.value =
      highlightedIndex.value < filteredOptions.value.length - 1 ? highlightedIndex.value + 1 : 0
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (filteredOptions.value.length === 0) return
    highlightedIndex.value =
      highlightedIndex.value > 0 ? highlightedIndex.value - 1 : filteredOptions.value.length - 1
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredOptions.value.length) {
      selectOption(filteredOptions.value[highlightedIndex.value])
    }
  }
}

const handleClickOutside = (event: MouseEvent) => {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="rootRef" class="space-y-1">
    <!-- Label -->
    <label
      v-if="props.label"
      class="block text-sm font-medium"
      style="color: var(--text-secondary)"
    >
      {{ props.label }}
      <span v-if="props.required" class="text-danger">*</span>
    </label>

    <!-- Dropdown container -->
    <div class="relative">
      <!-- Trigger button -->
      <button
        type="button"
        role="combobox"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        :aria-activedescendant="activeDescendantId"
        class="input w-full text-left flex items-center justify-between"
        :class="[
          props.disabled ? 'opacity-50 cursor-not-allowed' : '',
          props.error ? '!border-danger' : '',
        ]"
        :disabled="props.disabled"
        @click="toggleDropdown"
        @keydown="handleKeydown"
      >
        <span
          :style="{
            color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
          }"
          class="truncate"
        >
          {{ selectedOption ? selectedOption.label : props.placeholder }}
        </span>
        <div class="flex items-center gap-1 shrink-0">
          <!-- Clear button -->
          <button
            v-if="selectedOption && !props.required"
            type="button"
            class="p-0.5 rounded hover:opacity-70"
            style="color: var(--text-muted)"
            aria-label="清除選取"
            @click="clearSelection"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <!-- Chevron -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 transition-transform"
            :class="{ 'rotate-180': isOpen }"
            style="color: var(--text-muted)"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </button>

      <!-- Dropdown -->
      <div
        v-if="isOpen"
        class="absolute z-50 mt-1 w-full rounded-md shadow-lg"
        style="background-color: var(--bg-primary); border: 1px solid var(--border-primary)"
      >
        <!-- Search input -->
        <div class="p-2">
          <input
            ref="searchInputRef"
            v-model="search"
            type="text"
            class="input w-full text-sm"
            placeholder="搜尋..."
            @keydown="handleKeydown"
          />
        </div>

        <!-- Options list -->
        <ul role="listbox" class="max-h-[240px] overflow-y-auto">
          <li
            v-for="(option, index) in filteredOptions"
            :id="`searchable-opt-${option.value}`"
            :key="option.value"
            role="option"
            :aria-selected="option.value === props.modelValue"
            class="px-3 py-2 cursor-pointer text-sm"
            :class="[option.disabled ? 'opacity-50 cursor-not-allowed' : '']"
            :style="{
              backgroundColor:
                index === highlightedIndex
                  ? 'var(--bg-tertiary)'
                  : option.value === props.modelValue
                    ? 'var(--accent-light)'
                    : undefined,
              color: 'var(--text-primary)',
            }"
            @click="selectOption(option)"
            @mouseenter="
              $event => {
                highlightedIndex = index
                if (!option.disabled && option.value !== props.modelValue) {
                  ;($event.currentTarget as HTMLElement).style.backgroundColor =
                    'var(--bg-tertiary)'
                }
              }
            "
            @mouseleave="
              $event => {
                if (option.value !== props.modelValue) {
                  ;($event.currentTarget as HTMLElement).style.backgroundColor = ''
                }
              }
            "
          >
            <span>{{ option.label }}</span>
            <span v-if="option.sublabel" class="ml-2 text-xs" style="color: var(--text-muted)">
              {{ option.sublabel }}
            </span>
          </li>

          <!-- Empty state -->
          <li
            v-if="filteredOptions.length === 0"
            class="px-3 py-2 text-sm text-center"
            style="color: var(--text-muted)"
          >
            無符合的選項
          </li>
        </ul>
      </div>
    </div>

    <!-- Error message -->
    <p v-if="props.error" class="text-sm text-danger">{{ props.error }}</p>
  </div>
</template>
