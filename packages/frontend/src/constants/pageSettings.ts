// ============================================
// 頁面設定常數
// Ralph Loop 迭代 4 建立
// 避免頁面中出現硬編碼的魔術數字
// ============================================

/**
 * 儀表板設定
 */
export const DASHBOARD = {
  /** 顯示的進行中任務數量上限 */
  TASK_LIMIT: 3,
} as const

/**
 * 追殺清單設定
 */
export const CHASE_LIST = {
  /** 超過幾天未認領視為久未認領 */
  UNCLAIMED_DAYS_THRESHOLD: 3,
  /** 超過幾天未更新視為無進度 */
  STALE_UPDATE_DAYS: 7,
} as const

/**
 * 甘特圖設定
 */
export const GANTT = {
  /** 任務條的最小寬度百分比 */
  MIN_BAR_WIDTH: 5,
} as const

/**
 * Toast 通知設定
 */
export const TOAST = {
  /** 預設顯示時間（毫秒） */
  DURATION: 3000,
  /** 錯誤訊息顯示時間（毫秒） */
  ERROR_DURATION: 5000,
} as const

/**
 * 表單驗證設定
 */
export const VALIDATION = {
  /** 任務標題最小長度 */
  TASK_TITLE_MIN_LENGTH: 2,
  /** 任務標題最大長度 */
  TASK_TITLE_MAX_LENGTH: 100,
  /** 專案名稱最小長度 */
  PROJECT_NAME_MIN_LENGTH: 2,
  /** 專案名稱最大長度 */
  PROJECT_NAME_MAX_LENGTH: 50,
} as const

/**
 * 分頁設定
 */
export const PAGINATION = {
  /** 預設每頁筆數 */
  DEFAULT_PAGE_SIZE: 10,
  /** 可選的每頁筆數選項 */
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const
