import type { MilestoneData } from 'shared/types'

// ============================================
// 里程碑資料
// ============================================
export const mockMilestones: MilestoneData[] = [
  {
    id: 'ms-1',
    projectId: 'proj-1',
    name: 'Alpha 測試',
    description: '內部功能測試版本',
    date: '2026-02-15',
    color: '#F59E0B',
    createdById: 'emp-7',
    createdByName: '吳建國',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'ms-2',
    projectId: 'proj-1',
    name: 'Beta 測試',
    description: '外部測試版本',
    date: '2026-03-01',
    color: '#3B82F6',
    createdById: 'emp-7',
    createdByName: '吳建國',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'ms-3',
    projectId: 'proj-1',
    name: '正式上線',
    description: '遊戲正式發布',
    date: '2026-03-15',
    color: '#10B981',
    createdById: 'emp-3',
    createdByName: '張大華',
    createdAt: '2026-01-20T14:00:00Z',
  },
  {
    id: 'ms-4',
    projectId: 'proj-2',
    name: '戰鬥系統完成',
    description: '核心戰鬥機制開發完成',
    date: '2026-02-20',
    color: '#EF4444',
    createdById: 'emp-5',
    createdByName: '李小龍',
    createdAt: '2026-01-25T09:00:00Z',
  },
]
