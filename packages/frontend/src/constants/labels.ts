// ============================================
// 標籤名稱對照表
// 從 mock 檔案抽離，供元件直接引用
// ============================================

// 職能名稱對照
export const functionTypeLabels: Record<string, string> = {
  PLANNING: '企劃',
  PROGRAMMING: '程式',
  ART: '美術',
  ANIMATION: '動態',
  SOUND: '音效',
  VFX: '特效',
  COMBAT: '戰鬥',
}

// 任務狀態名稱對照
export const taskStatusLabels: Record<string, string> = {
  UNCLAIMED: '待認領',
  CLAIMED: '已認領',
  IN_PROGRESS: '進行中',
  PAUSED: '暫停中',
  DONE: '已完成',
  BLOCKED: '阻塞',
}

// 角色名稱對照
export const roleLabels: Record<string, string> = {
  EMPLOYEE: '一般同仁',
  PM: '專案經理',
  PRODUCER: '製作人',
  MANAGER: '部門主管',
  ADMIN: '管理員',
}

// 回報類型名稱對照
export const reportTypeLabels: Record<string, string> = {
  PROGRESS: '進度更新',
  CONTINUE: '繼續進行',
  BLOCKED: '卡關',
  COMPLETE: '已完成',
}

// 回報週期名稱對照
export const reportCycleLabels: Record<string, string> = {
  DAILY: '每日回報',
  WEEKLY: '每週回報',
  CUSTOM: '自訂週期',
}

// 部門名稱對照
import type { Department } from 'shared/types'

export const departmentLabels: Record<Department, string> = {
  ART: '美術部',
  PROGRAMMING: '程式部',
  PLANNING: '企劃部',
  QA: '品管部',
  SOUND: '音效部',
  MANAGEMENT: '管理部',
}
