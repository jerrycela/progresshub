<script setup lang="ts">
import type { MilestoneData } from 'shared/types'

defineProps<{
  milestones: MilestoneData[]
  getMilestonePosition: (ms: MilestoneData) => number
}>()
</script>

<template>
  <div v-if="milestones.length > 0" class="relative h-6 mb-1">
    <div
      v-for="ms in milestones"
      :key="ms.id"
      class="absolute top-1 group cursor-pointer"
      :style="{ left: `${getMilestonePosition(ms)}%` }"
    >
      <div
        class="w-3 h-3 rotate-45 transform -translate-x-1/2 border-2 border-white shadow-sm"
        :style="{ backgroundColor: ms.color || '#F59E0B' }"
      />
      <!-- Tooltip -->
      <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-20">
        <div class="px-2 py-1 rounded text-xs whitespace-nowrap text-white" style="background-color: var(--bg-tooltip);">
          {{ ms.name }} - {{ ms.date }}
        </div>
      </div>
    </div>
  </div>
</template>
