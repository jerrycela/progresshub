/**
 * 日期計算工具函式
 * 統一「今日起始」和「本週一」等常用日期計算
 */

/**
 * 取得今日 00:00:00.000（本地時間）
 */
export function getStartOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * 取得明日 00:00:00.000（本地時間）
 */
export function getStartOfTomorrow(): Date {
  const tomorrow = getStartOfToday();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * 取得本週一 00:00:00.000（ISO 週：週一為第一天）
 */
export function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 取得指定日期的 00:00:00.000（本地時間）
 */
export function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
