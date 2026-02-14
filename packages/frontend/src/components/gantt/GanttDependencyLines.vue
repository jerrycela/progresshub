<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import type { Task } from 'shared/types'

const props = defineProps<{
  tasks: Task[]
  getTaskPosition: (task: { startDate?: string; dueDate?: string }) => {
    left: number
    width: number
  }
  containerEl: HTMLElement | null
}>()

const containerWidth = ref(0)
let resizeObserver: ResizeObserver | null = null

// Use watch instead of onMounted because the template ref is null
// when the child component mounts (child mounts before parent ref is set)
watch(
  () => props.containerEl,
  el => {
    resizeObserver?.disconnect()
    if (!el) return
    containerWidth.value = el.offsetWidth
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width
      }
    })
    resizeObserver.observe(el)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

// Info panel width: w-40 = 160px + gap-2 = 8px = 168px
// Note: -mx-2 and px-2 cancel each other out, so they don't add to the offset
const INFO_PANEL_WIDTH = 168
const ROW_HEIGHT = 40 // py-1.5 (6) + h-7 (28) + py-1.5 (6) = 40
const ROW_CENTER_OFFSET = 20 // vertical center of each row

interface DependencyEdge {
  sourceId: string
  targetId: string
  sourceIndex: number
  targetIndex: number
}

const edges = computed<DependencyEdge[]>(() => {
  const taskIndexMap = new Map<string, number>()
  props.tasks.forEach((t, i) => taskIndexMap.set(t.id, i))

  const result: DependencyEdge[] = []
  for (const task of props.tasks) {
    if (!task.dependsOnTaskIds) continue
    for (const depId of task.dependsOnTaskIds) {
      const sourceIndex = taskIndexMap.get(depId)
      const targetIndex = taskIndexMap.get(task.id)
      if (sourceIndex === undefined || targetIndex === undefined) continue
      result.push({
        sourceId: depId,
        targetId: task.id,
        sourceIndex,
        targetIndex,
      })
    }
  }
  return result
})

const barAreaWidth = computed(() => {
  if (containerWidth.value <= 0) return 0
  return containerWidth.value - INFO_PANEL_WIDTH
})

const svgHeight = computed(() => props.tasks.length * ROW_HEIGHT)

const paths = computed(() => {
  if (barAreaWidth.value <= 0) return []

  return edges.value.map(edge => {
    const sourceTask = props.tasks[edge.sourceIndex]
    const targetTask = props.tasks[edge.targetIndex]

    const sourcePos = props.getTaskPosition(sourceTask)
    const targetPos = props.getTaskPosition(targetTask)

    // X coordinates within the bar area
    const sourceRight =
      INFO_PANEL_WIDTH + (barAreaWidth.value * (sourcePos.left + sourcePos.width)) / 100
    const targetLeft = INFO_PANEL_WIDTH + (barAreaWidth.value * targetPos.left) / 100

    // Y coordinates
    const y1 = edge.sourceIndex * ROW_HEIGHT + ROW_CENTER_OFFSET
    const y2 = edge.targetIndex * ROW_HEIGHT + ROW_CENTER_OFFSET

    // Stepped path with horizontal offset
    const xMid = (sourceRight + targetLeft) / 2
    const arrowGap = 4 // gap before arrow tip

    const d = `M ${sourceRight} ${y1} H ${xMid} V ${y2} H ${targetLeft - arrowGap}`

    return { d, key: `${edge.sourceId}-${edge.targetId}` }
  })
})
</script>

<template>
  <svg
    v-if="paths.length > 0"
    class="absolute top-0 left-0 w-full pointer-events-none hidden sm:block z-10"
    :height="svgHeight"
    :viewBox="`0 0 ${containerWidth} ${svgHeight}`"
    preserveAspectRatio="xMinYMin meet"
  >
    <defs>
      <marker id="dep-arrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
        <polygon points="0,0 6,2 0,4" style="fill: var(--text-muted)" opacity="0.6" />
      </marker>
    </defs>
    <path
      v-for="p in paths"
      :key="p.key"
      :d="p.d"
      fill="none"
      :style="{ stroke: 'var(--text-muted)', strokeOpacity: 0.45 }"
      stroke-width="1.5"
      marker-end="url(#dep-arrow)"
    />
  </svg>
</template>
