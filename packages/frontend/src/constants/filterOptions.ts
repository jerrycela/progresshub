// ============================================
// 篩選選項常數
// Ralph Loop 迭代 4 建立
// 避免各頁面重複定義相同的選項陣列
// ============================================

import type { FunctionType, TaskStatus, Role, TaskPriority } from 'shared/types'

/**
 * 職能篩選選項
 */
export const FUNCTION_OPTIONS: { value: FunctionType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部職能' },
  { value: 'PLANNING', label: '企劃' },
  { value: 'PROGRAMMING', label: '程式' },
  { value: 'ART', label: '美術' },
  { value: 'ANIMATION', label: '動態' },
  { value: 'SOUND', label: '音效' },
  { value: 'VFX', label: '特效' },
  { value: 'COMBAT', label: '戰鬥' },
]

/**
 * 職能選項（不含「全部」）
 */
export const FUNCTION_OPTIONS_ONLY: { value: FunctionType; label: string }[] = [
  { value: 'PLANNING', label: '企劃' },
  { value: 'PROGRAMMING', label: '程式' },
  { value: 'ART', label: '美術' },
  { value: 'ANIMATION', label: '動態' },
  { value: 'SOUND', label: '音效' },
  { value: 'VFX', label: '特效' },
  { value: 'COMBAT', label: '戰鬥' },
]

/**
 * 任務狀態篩選選項
 */
export const TASK_STATUS_OPTIONS: { value: TaskStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部狀態' },
  { value: 'UNCLAIMED', label: '待認領' },
  { value: 'CLAIMED', label: '已認領' },
  { value: 'IN_PROGRESS', label: '進行中' },
  { value: 'PAUSED', label: '暫停中' },
  { value: 'BLOCKED', label: '卡關' },
  { value: 'DONE', label: '已完成' },
]

/**
 * 角色篩選選項
 */
export const ROLE_OPTIONS: { value: Role | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部角色' },
  { value: 'MEMBER', label: '成員' },
  { value: 'PM', label: '專案經理' },
  { value: 'ADMIN', label: '管理員' },
]

/**
 * 任務優先級選項
 */
export const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: '低' },
  { value: 'MEDIUM', label: '中' },
  { value: 'HIGH', label: '高' },
  { value: 'URGENT', label: '緊急' },
]
