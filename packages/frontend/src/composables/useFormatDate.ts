// ============================================
// useFormatDate - 日期格式化 Composable
// Ralph Loop 迭代 3 建立
// ============================================

/**
 * 日期格式化 Composable
 * 統一處理日期顯示格式，避免各頁面重複定義
 */
export function useFormatDate() {
  /**
   * 格式化日期為短格式（月 日）
   * @example formatShort('2026-02-03') => '2月 3日'
   */
  const formatShort = (date?: string | Date): string => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
    })
  }

  /**
   * 格式化日期為完整格式（年 月 日）
   * @example formatFull('2026-02-03') => '2026年 2月 3日'
   */
  const formatFull = (date?: string | Date): string => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  /**
   * 格式化日期為 ISO 格式（YYYY-MM-DD）
   * @example formatISO(new Date()) => '2026-02-03'
   */
  const formatISO = (date?: string | Date): string => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toISOString().split('T')[0]
  }

  /**
   * 計算相對天數
   * @example getRelativeDays('2026-02-01') => -2 (2天前)
   */
  const getRelativeDays = (date: string): number => {
    const target = new Date(date)
    const now = new Date()
    const diff = target.getTime() - now.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  /**
   * 取得今天的 ISO 日期字串
   * @example getToday() => '2026-02-03'
   */
  const getToday = (): string => {
    return new Date().toISOString().split('T')[0]
  }

  /**
   * 取得 N 天前的日期
   * @example getDaysAgo(3) => '2026-01-31'
   */
  const getDaysAgo = (days: number): string => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
  }

  return {
    formatShort,
    formatFull,
    formatISO,
    getRelativeDays,
    getToday,
    getDaysAgo,
  }
}
