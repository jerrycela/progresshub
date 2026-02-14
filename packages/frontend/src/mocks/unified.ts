export * from './employees'
export * from './projects'
export * from './tasks'
export * from './progressLogs'
export * from './milestones'
export * from './dashboard'
export * from './departments'
export * from './queries'

// ============================================
// 常數定義（用於 TaskRelationCard 等組件）
// ============================================
export const functionTypeLabels: Record<string, string> = {
  PLANNING: '企劃',
  PROGRAMMING: '程式',
  ART: '美術',
  ANIMATION: '動態',
  SOUND: '音效',
  VFX: '特效',
  COMBAT: '戰鬥',
}

export const taskStatusLabels: Record<string, string> = {
  UNCLAIMED: '待認領',
  CLAIMED: '已認領',
  IN_PROGRESS: '進行中',
  PAUSED: '暫停中',
  DONE: '已完成',
  BLOCKED: '卡關',
}
