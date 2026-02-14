import type { Project } from 'shared/types'

// ============================================
// 專案資料（3 個專案）
// ============================================
export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Project A',
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
    name: 'Project B',
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
    name: 'Project C',
    description: '競速賽車遊戲',
    status: 'ACTIVE',
    startDate: '2025-03-01',
    endDate: '2025-12-31',
    createdById: 'emp-6',
    createdAt: '2025-03-01',
    updatedAt: '2026-01-15',
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
