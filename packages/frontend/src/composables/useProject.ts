// ============================================
// useProject - 專案查詢 Composable
// Ralph Loop 迭代 3 建立
// ============================================

import { mockProjects } from '@/mocks/data'
import type { Project } from 'shared/types'

/**
 * 專案查詢 Composable
 * 統一處理專案相關的查詢邏輯
 */
export function useProject() {
  /**
   * 根據 ID 取得專案
   * @param projectId 專案 ID
   * @returns 專案物件或 undefined
   */
  const getProjectById = (projectId: string): Project | undefined => {
    return mockProjects.find((p) => p.id === projectId)
  }

  /**
   * 根據 ID 取得專案名稱
   * @param projectId 專案 ID
   * @returns 專案名稱，找不到時回傳 '未知專案'
   */
  const getProjectName = (projectId: string): string => {
    return mockProjects.find((p) => p.id === projectId)?.name || '未知專案'
  }

  /**
   * 取得所有專案選項（用於下拉選單）
   * @param includeAll 是否包含「全部專案」選項
   */
  const getProjectOptions = (includeAll = true) => {
    const options = mockProjects.map((p) => ({
      value: p.id,
      label: p.name,
    }))

    if (includeAll) {
      return [{ value: 'ALL', label: '全部專案' }, ...options]
    }

    return options
  }

  /**
   * 取得進行中的專案
   */
  const getActiveProjects = (): Project[] => {
    return mockProjects.filter((p) => p.status === 'ACTIVE')
  }

  return {
    getProjectById,
    getProjectName,
    getProjectOptions,
    getActiveProjects,
  }
}
