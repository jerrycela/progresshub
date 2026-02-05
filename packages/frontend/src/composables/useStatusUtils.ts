// ============================================
// 狀態工具 Composable
// ROI 優化：提取重複函數
// ============================================

import type { TaskStatus, UserRole } from 'shared/types'

/**
 * 任務狀態標籤對照
 */
const STATUS_LABELS: Record<string, string> = {
  UNCLAIMED: '待認領',
  CLAIMED: '已認領',
  IN_PROGRESS: '進行中',
  PAUSED: '暫停中',
  DONE: '已完成',
  BLOCKED: '卡關',
}

/**
 * 任務狀態 CSS 類別對照（徽章樣式）
 */
const STATUS_BADGE_CLASSES: Record<string, string> = {
  UNCLAIMED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CLAIMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  PAUSED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  DONE: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
}

/**
 * 角色標籤對照
 */
const ROLE_LABELS: Record<string, string> = {
  MEMBER: '成員',
  PM: '專案經理',
  PRODUCER: '製作人',
  MANAGER: '主管',
  ADMIN: '管理員',
}

/**
 * 角色徽章 CSS 類別對照
 */
const ROLE_BADGE_CLASSES: Record<string, string> = {
  PM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  PRODUCER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  ADMIN: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  MEMBER: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

/**
 * 取得任務狀態標籤
 */
export const getStatusLabel = (status: TaskStatus | string): string => {
  return STATUS_LABELS[status] || status
}

/**
 * 取得任務狀態徽章 CSS 類別
 */
export const getStatusClass = (status: TaskStatus | string): string => {
  return STATUS_BADGE_CLASSES[status] || 'bg-gray-100 text-gray-700'
}

/**
 * 取得角色標籤
 */
export const getRoleLabel = (role: UserRole | string): string => {
  return ROLE_LABELS[role] || role
}

/**
 * 取得角色徽章 CSS 類別
 */
export const getRoleBadgeClass = (role: UserRole | string): string => {
  return ROLE_BADGE_CLASSES[role] || ROLE_BADGE_CLASSES.MEMBER
}

/**
 * 狀態工具 Composable
 * 提供任務狀態和角色相關的工具函數
 */
export const useStatusUtils = () => ({
  getStatusLabel,
  getStatusClass,
  getRoleLabel,
  getRoleBadgeClass,
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  ROLE_LABELS,
  ROLE_BADGE_CLASSES,
})

export default useStatusUtils
