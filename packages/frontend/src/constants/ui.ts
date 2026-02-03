// ============================================
// UI 常數
// Ralph Loop 迭代 4 建立
// 統一管理 UI 相關的尺寸和樣式類別
// ============================================

/**
 * 圖示尺寸類別
 */
export const ICON_SIZES = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-10 h-10',
  '2xl': 'w-12 h-12',
} as const

/**
 * 任務狀態顏色對照
 */
export const STATUS_COLORS: Record<string, string> = {
  UNCLAIMED: 'bg-gray-300',
  CLAIMED: 'bg-secondary',
  IN_PROGRESS: 'bg-primary-600',
  DONE: 'bg-success',
  BLOCKED: 'bg-danger',
}

/**
 * 任務狀態徽章樣式
 */
export const STATUS_BADGE_VARIANTS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  UNCLAIMED: 'default',
  CLAIMED: 'info',
  IN_PROGRESS: 'primary',
  DONE: 'success',
  BLOCKED: 'danger',
}

/**
 * 職能顏色對照
 */
export const FUNCTION_COLORS: Record<string, string> = {
  PLANNING: 'bg-purple-500',
  PROGRAMMING: 'bg-blue-500',
  ART: 'bg-pink-500',
  ANIMATION: 'bg-green-500',
  SOUND: 'bg-yellow-500',
  VFX: 'bg-orange-500',
  COMBAT: 'bg-red-500',
}

/**
 * 角色徽章樣式
 */
export const ROLE_BADGE_VARIANTS: Record<string, 'default' | 'primary' | 'success'> = {
  MEMBER: 'default',
  PM: 'primary',
  ADMIN: 'success',
}

/**
 * 優先級顏色對照
 */
export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-orange-500',
  URGENT: 'bg-red-600',
}

/**
 * 優先級徽章樣式
 */
export const PRIORITY_BADGE_VARIANTS: Record<string, 'default' | 'primary' | 'warning' | 'danger'> = {
  LOW: 'default',
  MEDIUM: 'primary',
  HIGH: 'warning',
  URGENT: 'danger',
}

/**
 * 側邊欄菜單項目樣式
 */
export const SIDEBAR_MENU_CLASSES = {
  base: 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-200',
  active: 'bg-primary-700 text-white',
  inactive: 'text-gray-300 hover:bg-gray-800 hover:text-white',
} as const

/**
 * 過渡動畫時間
 */
export const TRANSITIONS = {
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
} as const
