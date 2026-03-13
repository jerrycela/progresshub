<script setup lang="ts">
// ============================================
// Multi Search Select - multi-value dropdown with search filtering
// ============================================
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import type { SearchableOption } from './SearchableSelect.vue'

interface Props {
  modelValue: string[]
  options: SearchableOption[]
  label?: string
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: '請選擇',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const isOpen = ref(false)
const search = ref('')
const highlightedIndex = ref(-1)
const rootRef = ref<HTMLDivElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const optionListRef = ref<HTMLUListElement | null>(null)

const selectedOptions = computed(() =>
  props.options.filter(o => props.modelValue.includes(o.value)),
)

const filteredOptions = computed(() => {
  const query = search.value.toLowerCase()
  if (!query) return props.options
  return props.options.filter(
    o =>
      o.label.toLowerCase().includes(query) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(query)),
  )
})

function isSelected(value: string): boolean {
  return props.modelValue.includes(value)
}

const activeDescendantId = computed(() => {
  if (highlightedIndex.value < 0 || highlightedIndex.value >= filteredOptions.value.length) {
    return undefined
  }
  return `multi-opt-${filteredOptions.value[highlightedIndex.value].value}`
})

function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    search.value = ''
    highlightedIndex.value = -1
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
}

function close() {
  isOpen.value = false
  search.value = ''
}

function toggleOption(value: string) {
  if (isSelected(value)) {
    emit(
      'update:modelValue',
      props.modelValue.filter(v => v !== value),
    )
  } else {
    emit('update:modelValue', [...props.modelValue, value])
  }
}

function remove(value: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter(v => v !== value),
  )
}

function handleSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (filteredOptions.value.length === 0) return
    highlightedIndex.value =
      highlightedIndex.value < filteredOptions.value.length - 1 ? highlightedIndex.value + 1 : 0
    scrollHighlightedIntoView()
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (filteredOptions.value.length === 0) return
    highlightedIndex.value =
      highlightedIndex.value > 0 ? highlightedIndex.value - 1 : filteredOptions.value.length - 1
    scrollHighlightedIntoView()
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredOptions.value.length) {
      toggleOption(filteredOptions.value[highlightedIndex.value].value)
    }
  }
}

function scrollHighlightedIntoView() {
  nextTick(() => {
    if (!optionListRef.value || highlightedIndex.value < 0) return
    const el = optionListRef.value.children[highlightedIndex.value] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function handleClickOutside(event: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    close()
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
    <label v-if="label" class="block text-sm font-medium" style="color: var(--text-secondary)">
      {{ label }}
    </label>
    <div class="relative">
      <!-- Trigger -->
      <div
        tabindex="0"
        role="combobox"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        :aria-activedescendant="activeDescendantId"
        class="input min-h-[38px] w-full cursor-pointer flex flex-wrap items-center gap-1 py-1 px-2"
        :class="disabled ? 'opacity-50 cursor-not-allowed' : ''"
        @click="toggle"
        @keydown.enter="toggle"
        @keydown.space.prevent="toggle"
        @keydown.escape="close"
      >
        <!-- Tags for selected items -->
        <span
          v-for="tag in selectedOptions"
          :key="tag.value"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
          style="background: var(--accent-light); color: var(--accent)"
        >
          {{ tag.label }}
          <button
            type="button"
            class="hover:opacity-70"
            :aria-label="`移除 ${tag.label}`"
            @click.stop="remove(tag.value)"
          >
            &times;
          </button>
        </span>
        <!-- Placeholder when empty -->
        <span v-if="modelValue.length === 0" style="color: var(--text-muted)" class="text-sm">
          {{ placeholder }}
        </span>
      </div>

      <!-- Dropdown -->
      <div
        v-if="isOpen"
        class="absolute z-50 mt-1 w-full rounded-md shadow-lg"
        style="background: var(--bg-primary); border: 1px solid var(--border-primary)"
      >
        <div class="p-2">
          <input
            ref="searchInput"
            v-model="search"
            class="input w-full text-sm"
            placeholder="搜尋..."
            @keydown="handleSearchKeydown"
          />
        </div>
        <ul ref="optionListRef" role="listbox" class="max-h-[240px] overflow-y-auto">
          <li
            v-for="(option, index) in filteredOptions"
            :id="`multi-opt-${option.value}`"
            :key="option.value"
            role="option"
            :aria-selected="isSelected(option.value)"
            class="px-3 py-2 cursor-pointer flex items-center gap-2 text-sm"
            :style="{
              backgroundColor: index === highlightedIndex ? 'var(--bg-tertiary)' : undefined,
            }"
            @click="toggleOption(option.value)"
            @mouseenter="highlightedIndex = index"
          >
            <!-- Checkmark for selected -->
            <svg
              v-if="isSelected(option.value)"
              class="w-4 h-4 flex-shrink-0"
              style="color: var(--accent)"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div v-else class="w-4 h-4 flex-shrink-0"></div>

            <span style="color: var(--text-primary)">{{ option.label }}</span>
            <span v-if="option.sublabel" class="text-xs" style="color: var(--text-muted)">
              {{ option.sublabel }}
            </span>
          </li>
          <li
            v-if="filteredOptions.length === 0"
            class="px-3 py-2 text-sm"
            style="color: var(--text-muted)"
          >
            無符合的選項
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
