// ============================================
// 本地頭像生成工具
// 替代外部 DiceBear API，適用於內網環境
// ============================================

/**
 * 從名稱取得首字母（支援中文）
 */
export const getInitials = (name: string): string => {
  if (!name || name.trim() === '') return '?'

  const trimmed = name.trim()

  // 中文名字：取第一個字
  if (/[\u4e00-\u9fff]/.test(trimmed)) {
    return trimmed.charAt(0)
  }

  // 英文名字：取首字母大寫
  const words = trimmed.split(/\s+/)
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
  }

  return trimmed.charAt(0).toUpperCase()
}

/**
 * 根據名稱生成一致的背景顏色
 * 使用名稱的 hash 值來確保同一名稱總是得到相同顏色
 */
export const getAvatarColor = (name: string): string => {
  const colors = [
    '#4F46E5', // 靛藍
    '#7C3AED', // 紫色
    '#EC4899', // 粉紅
    '#EF4444', // 紅色
    '#F59E0B', // 琥珀
    '#10B981', // 綠色
    '#06B6D4', // 青色
    '#3B82F6', // 藍色
    '#6366F1', // 靛色
    '#8B5CF6', // 紫羅蘭
  ]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % colors.length
  return colors[index]
}

/**
 * 生成 SVG 頭像 Data URL
 * 可直接用於 img src
 */
export const generateAvatarDataUrl = (name: string): string => {
  const initials = getInitials(name)
  const bgColor = getAvatarColor(name)

  // 建立 SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="${bgColor}"/>
      <text x="50" y="50"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="40"
        font-weight="500"
        fill="white"
        text-anchor="middle"
        dominant-baseline="central">
        ${initials}
      </text>
    </svg>
  `.trim()

  // 轉換為 Data URL
  const encoded = encodeURIComponent(svg)
  return `data:image/svg+xml,${encoded}`
}

/**
 * 取得頭像 URL（優先使用傳入的 URL，否則生成本地頭像）
 */
export const getAvatarUrl = (avatar: string | undefined, name: string): string => {
  if (avatar && avatar.trim() !== '') {
    return avatar
  }
  return generateAvatarDataUrl(name)
}
