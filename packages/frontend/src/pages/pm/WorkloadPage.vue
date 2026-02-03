<script setup lang="ts">
import { computed } from 'vue'
import { mockFunctionWorkloads, functionTypeLabels, mockUsers, mockTasks } from '@/mocks/data'
import Card from '@/components/common/Card.vue'
import Badge from '@/components/common/Badge.vue'

// ============================================
// 職能負載頁面 - PM 專用，各職能待辦量統計
// Ralph Loop 迭代 21: RWD 響應式優化
// ============================================

// 職能工作負載資料
const workloads = computed(() => mockFunctionWorkloads)

// 計算負載程度
const getLoadLevel = (workload: typeof mockFunctionWorkloads[0]) => {
  const tasksPerMember = workload.memberCount > 0
    ? workload.inProgressTasks / workload.memberCount
    : 0

  if (workload.unclaimedTasks > 2) return { level: 'high', label: '人力不足', color: 'danger' }
  if (tasksPerMember > 3) return { level: 'high', label: '超負荷', color: 'danger' }
  if (tasksPerMember > 2) return { level: 'medium', label: '稍重', color: 'warning' }
  return { level: 'low', label: '正常', color: 'success' }
}

// 職能顏色
const functionColors: Record<string, string> = {
  PLANNING: 'bg-purple-500',
  PROGRAMMING: 'bg-blue-500',
  ART: 'bg-pink-500',
  ANIMATION: 'bg-green-500',
  SOUND: 'bg-yellow-500',
  VFX: 'bg-orange-500',
  COMBAT: 'bg-red-500',
}

// 取得該職能的成員
const getMembersByFunction = (functionType: string) =>
  mockUsers.filter(u => u.functionType === functionType)

// 取得成員的任務數
const getMemberTaskCount = (userId: string) =>
  mockTasks.filter(t => t.assigneeId === userId && t.status !== 'DONE').length

// 整體統計
const totalStats = computed(() => ({
  totalTasks: workloads.value.reduce((sum, w) => sum + w.totalTasks, 0),
  unclaimedTasks: workloads.value.reduce((sum, w) => sum + w.unclaimedTasks, 0),
  inProgressTasks: workloads.value.reduce((sum, w) => sum + w.inProgressTasks, 0),
  totalMembers: workloads.value.reduce((sum, w) => sum + w.memberCount, 0),
}))
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 (RWD: 迭代 21) -->
    <div>
      <h1 class="text-xl md:text-2xl font-bold text-gray-900">職能負載分析</h1>
      <p class="text-sm md:text-base text-gray-500 mt-1">各職能的任務分配與人力狀況</p>
    </div>

    <!-- 整體統計 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <div class="text-center">
          <p class="text-3xl font-bold text-gray-900">{{ totalStats.totalTasks }}</p>
          <p class="text-sm text-gray-500 mt-1">總任務數</p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-3xl font-bold text-primary-700">{{ totalStats.inProgressTasks }}</p>
          <p class="text-sm text-gray-500 mt-1">進行中</p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-3xl font-bold text-warning">{{ totalStats.unclaimedTasks }}</p>
          <p class="text-sm text-gray-500 mt-1">待認領</p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-3xl font-bold text-secondary">{{ totalStats.totalMembers }}</p>
          <p class="text-sm text-gray-500 mt-1">總人數</p>
        </div>
      </Card>
    </div>

    <!-- 職能負載圖表 -->
    <Card title="各職能工作負載">
      <div class="space-y-4">
        <div
          v-for="workload in workloads"
          :key="workload.functionType"
          class="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
        >
          <!-- RWD: 迭代 21 - 行動裝置堆疊排列 -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div class="flex items-center gap-3">
              <div :class="['w-3 h-3 rounded-full', functionColors[workload.functionType]]" />
              <span class="font-medium text-gray-900">
                {{ functionTypeLabels[workload.functionType] }}
              </span>
              <Badge :variant="getLoadLevel(workload).color as any" size="sm">
                {{ getLoadLevel(workload).label }}
              </Badge>
            </div>
            <div class="flex items-center gap-4 text-sm text-gray-500 ml-6 sm:ml-0">
              <span>{{ workload.memberCount }} 人</span>
              <span>{{ workload.totalTasks }} 任務</span>
            </div>
          </div>

          <!-- 任務分佈條 -->
          <div class="h-6 bg-gray-200 rounded-full overflow-hidden flex">
            <div
              v-if="workload.inProgressTasks > 0"
              class="bg-primary-600 flex items-center justify-center text-xs text-white font-medium"
              :style="{ width: `${(workload.inProgressTasks / workload.totalTasks) * 100}%` }"
            >
              {{ workload.inProgressTasks }}
            </div>
            <div
              v-if="workload.unclaimedTasks > 0"
              class="bg-warning flex items-center justify-center text-xs text-white font-medium"
              :style="{ width: `${(workload.unclaimedTasks / workload.totalTasks) * 100}%` }"
            >
              {{ workload.unclaimedTasks }}
            </div>
          </div>

          <!-- 成員列表 -->
          <div v-if="getMembersByFunction(workload.functionType).length > 0" class="mt-3 flex flex-wrap gap-2">
            <div
              v-for="member in getMembersByFunction(workload.functionType)"
              :key="member.id"
              class="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200"
            >
              <img
                :src="member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`"
                :alt="member.name"
                class="w-6 h-6 rounded-full"
              >
              <span class="text-sm text-gray-700">{{ member.name }}</span>
              <Badge variant="default" size="sm">
                {{ getMemberTaskCount(member.id) }} 任務
              </Badge>
            </div>
          </div>
          <div v-else class="mt-3 text-sm text-gray-400 italic">
            目前無該職能成員
          </div>
        </div>
      </div>
    </Card>

    <!-- 圖例 -->
    <Card>
      <div class="flex flex-wrap items-center gap-6">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-primary-600 rounded" />
          <span class="text-sm text-gray-600">進行中</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-warning rounded" />
          <span class="text-sm text-gray-600">待認領</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-gray-200 rounded" />
          <span class="text-sm text-gray-600">已完成/空閒</span>
        </div>
      </div>
    </Card>

    <!-- 建議 -->
    <Card title="人力配置建議" class="bg-primary-50 border-primary-200">
      <div class="space-y-2 text-sm text-primary-800">
        <div
          v-for="workload in workloads.filter(w => getLoadLevel(w).level === 'high')"
          :key="workload.functionType"
          class="flex items-start gap-2"
        >
          <svg class="w-5 h-5 text-danger flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            <strong>{{ functionTypeLabels[workload.functionType] }}</strong>
            目前有 {{ workload.unclaimedTasks }} 個待認領任務，建議增派人力或協調其他職能支援。
          </span>
        </div>
        <div
          v-if="workloads.filter(w => getLoadLevel(w).level === 'high').length === 0"
          class="flex items-center gap-2 text-success"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>目前各職能人力配置均衡，暫無需調整。</span>
        </div>
      </div>
    </Card>
  </div>
</template>
