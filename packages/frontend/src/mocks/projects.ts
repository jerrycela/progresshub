import type { Project } from 'shared/types'

// ============================================
// 專案資料（6 個專案，統一 proj-* ID）
// proj-1~3 來自 taskPool，proj-4~6 來自 data.ts
// ============================================
export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: '魔法王國 Online',
    description: '大型多人線上角色扮演遊戲',
    status: 'ACTIVE',
    startDate: '2025-01-01',
    endDate: '2026-06-30',
    createdById: 'emp-6',
    createdAt: '2025-01-01',
    updatedAt: '2026-02-01',
  },
  {
    id: 'proj-2',
    name: '星際戰艦',
    description: '太空策略遊戲',
    status: 'ACTIVE',
    startDate: '2025-06-01',
    endDate: '2026-12-31',
    createdById: 'emp-6',
    createdAt: '2025-06-01',
    updatedAt: '2026-02-01',
  },
  {
    id: 'proj-3',
    name: '賽車狂飆',
    description: '競速賽車遊戲',
    status: 'ACTIVE',
    startDate: '2025-03-01',
    endDate: '2025-12-31',
    createdById: 'emp-6',
    createdAt: '2025-03-01',
    updatedAt: '2026-01-15',
  },
  {
    id: 'proj-4',
    name: '新手教學系統',
    description: '開發新手引導與教學關卡',
    status: 'ACTIVE',
    startDate: '2026-02-01',
    endDate: '2026-04-30',
    createdById: 'emp-10',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'proj-5',
    name: 'PVP 對戰系統',
    description: '玩家對戰系統開發',
    status: 'ACTIVE',
    startDate: '2026-01-15',
    endDate: '2026-05-15',
    createdById: 'emp-10',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'proj-6',
    name: 'UI 改版計畫',
    description: '全面更新遊戲 UI 設計',
    status: 'ACTIVE',
    startDate: '2026-02-15',
    endDate: '2026-03-31',
    createdById: 'emp-10',
    createdAt: '2026-02-15T00:00:00Z',
    updatedAt: '2026-02-15T00:00:00Z',
  },
]

// 專案快速查找
const projectMap = new Map(mockProjects.map(p => [p.id, p]))
export const getProjectRef = (id: string) => {
  const p = projectMap.get(id)
  if (!p) return undefined
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    startDate: p.startDate,
    createdById: p.createdById,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}
