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

// Use container's actual scroll height instead of hardcoded row height
const svgHeight = computed(() => {
  if (!props.containerEl) return 0
  return props.containerEl.scrollHeight
})

// Get the vertical center Y of a task row from DOM measurement
function getRowCenterY(taskId: string): number {
  if (!props.containerEl) return 0
  const row = props.containerEl.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement | null
  if (!row) return 0
  return row.offsetTop + row.offsetHeight / 2
}

// Pre-compute same-source groups for Y-axis spreading
const sourceGroupMap = computed(() => {
  const map = new Map<string, DependencyEdge[]>()
  for (const edge of edges.value) {
    const group = map.get(edge.sourceId) ?? []
    group.push(edge)
    map.set(edge.sourceId, group)
  }
  return map
})

const paths = computed(() => {
  if (barAreaWidth.value <= 0) return []
  // Access svgHeight to create reactivity on container size changes
  if (svgHeight.value <= 0) return []

  const arrowGap = 4

  return edges.value.map(edge => {
    const sourceTask = props.tasks[edge.sourceIndex]
    const targetTask = props.tasks[edge.targetIndex]

    const sourcePos = props.getTaskPosition(sourceTask)
    const targetPos = props.getTaskPosition(targetTask)

    // X coordinates within the bar area
    const sourceRight =
      INFO_PANEL_WIDTH + (barAreaWidth.value * (sourcePos.left + sourcePos.width)) / 100
    const targetLeft = INFO_PANEL_WIDTH + (barAreaWidth.value * targetPos.left) / 100

    // Y coordinates from DOM measurement
    const y1 = getRowCenterY(edge.sourceId)
    const y2 = getRowCenterY(edge.targetId)

    // Same-source Y spreading: ±3px offset to prevent overlapping lines
    const sameSourceGroup = sourceGroupMap.value.get(edge.sourceId) ?? [edge]
    const idx = sameSourceGroup.indexOf(edge)
    const spreadY = (idx - (sameSourceGroup.length - 1) / 2) * 3
    const adjustedY1 = y1 + spreadY

    // Cubic Bezier curve path
    const dx = targetLeft - sourceRight
    const endX = targetLeft - arrowGap

    // Control point distance: dynamically calculated, clamped to 30-80px
    const controlDist = Math.max(30, Math.min(Math.abs(dx) * 0.4 + 20, 80))

    // Control point X coordinates, clamped to container bounds
    const cp1x = Math.min(sourceRight + controlDist, containerWidth.value - 5)
    const cp2x = Math.max(endX - controlDist, INFO_PANEL_WIDTH + 5)

    const d = `M ${sourceRight} ${adjustedY1} C ${cp1x} ${adjustedY1}, ${cp2x} ${y2}, ${endX} ${y2}`

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
      <marker id="dep-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <polygon points="0,0 8,3 0,6" style="fill: var(--text-muted)" opacity="0.6" />
      </marker>
    </defs>
    <path
      v-for="p in paths"
      :key="p.key"
      :d="p.d"
      fill="none"
      :style="{ stroke: 'var(--text-muted)', strokeOpacity: 0.5 }"
      stroke-width="1.5"
      stroke-linecap="round"
      marker-end="url(#dep-arrow)"
    />
  </svg>
</template>
