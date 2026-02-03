// ============================================
// UI 常數
// Ralph Loop 迭代 4 建立
// SG-Arts 品牌配色更新
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
 * 任務狀態顏色對照（使用 CSS 變數支援 Dark mode）
 */
export const STATUS_COLORS: Record<string, string> = {
  UNCLAIMED: 'bg-ink-muted/30',
  CLAIMED: 'bg-info/20',
  IN_PROGRESS: 'bg-samurai/20',
  DONE: 'bg-success/20',
  BLOCKED: 'bg-danger/20',
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
  COMBAT: 'bg-samurai',
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
  LOW: 'bg-ink-muted/40',
  MEDIUM: 'bg-info/60',
  HIGH: 'bg-warning/60',
  URGENT: 'bg-samurai/80',
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
 * 側邊欄菜單項目樣式（SG-Arts 淺色風格）
 * 使用 CSS 變數支援 Dark mode
 */
export const SIDEBAR_MENU_CLASSES = {
  base: 'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-150 cursor-pointer',
  active: 'sidebar-item active',
  inactive: 'sidebar-item',
} as const

/**
 * 過渡動畫時間
 */
export const TRANSITIONS = {
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
  // Toast 動畫
  TOAST_ENTER: 'transition-all duration-300 ease-out',
  TOAST_LEAVE: 'transition-all duration-200 ease-in',
} as const

/**
 * SG-Arts 品牌色彩（CSS 變數名稱對照）
 * 用於需要直接使用顏色值的場景
 */
export const BRAND_COLORS = {
  // 強調色
  accent: 'var(--accent)',
  accentHover: 'var(--accent-hover)',
  accentLight: 'var(--accent-light)',

  // 背景色
  bgPrimary: 'var(--bg-primary)',
  bgSecondary: 'var(--bg-secondary)',
  bgTertiary: 'var(--bg-tertiary)',

  // 文字色
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textTertiary: 'var(--text-tertiary)',
  textMuted: 'var(--text-muted)',

  // 邊框色
  borderPrimary: 'var(--border-primary)',
  borderSecondary: 'var(--border-secondary)',
} as const
