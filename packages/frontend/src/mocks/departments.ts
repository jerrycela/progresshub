import type { Department } from 'shared/types'

// ============================================
// 部門資料
// ============================================
export const mockDepartments: { id: Department; name: string; memberCount: number }[] = [
  { id: 'ART', name: '美術部', memberCount: 12 },
  { id: 'PROGRAMMING', name: '程式部', memberCount: 8 },
  { id: 'PLANNING', name: '企劃部', memberCount: 5 },
  { id: 'QA', name: '品管部', memberCount: 4 },
  { id: 'SOUND', name: '音效部', memberCount: 3 },
  { id: 'MANAGEMENT', name: '管理部', memberCount: 2 },
]
