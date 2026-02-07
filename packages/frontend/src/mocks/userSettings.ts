import type { User, FunctionType, Department } from 'shared/types'

// ============================================
// 使用者設定 Mock 資料
// ============================================

// 擴展使用者介面，包含整合設定
export interface UserSettings extends User {
  department: Department
  slackId?: string
  slackUsername?: string
  gitlabId?: string
  gitlabUsername?: string
}

// 當前登入使用者設定
export const mockCurrentUserSettings: UserSettings = {
  id: 'emp-6',
  name: '黃美玲',
  email: 'huang@company.com',
  avatar: undefined,
  role: 'PM',
  functionType: 'PLANNING' as FunctionType,
  department: 'PLANNING',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z',
  slackId: 'U12345678',
  slackUsername: '@huang.meiling',
  gitlabId: undefined,
  gitlabUsername: undefined,
}

// 部門名稱對照（從 constants/labels.ts re-export）
export { departmentLabels } from '@/constants/labels'

// 模擬更新使用者設定
export function updateUserSettings(updates: Partial<UserSettings>): UserSettings {
  Object.assign(mockCurrentUserSettings, updates)
  return { ...mockCurrentUserSettings }
}

// 模擬連結 GitLab 帳號
export function linkGitLabAccount(gitlabUsername: string): UserSettings {
  mockCurrentUserSettings.gitlabId = `GL${Date.now()}`
  mockCurrentUserSettings.gitlabUsername = gitlabUsername
  return { ...mockCurrentUserSettings }
}

// 模擬解除 GitLab 連結
export function unlinkGitLabAccount(): UserSettings {
  mockCurrentUserSettings.gitlabId = undefined
  mockCurrentUserSettings.gitlabUsername = undefined
  return { ...mockCurrentUserSettings }
}

// 模擬連結 Slack 帳號
export function linkSlackAccount(slackUsername: string): UserSettings {
  mockCurrentUserSettings.slackId = `U${Date.now()}`
  mockCurrentUserSettings.slackUsername = slackUsername
  return { ...mockCurrentUserSettings }
}

// 模擬解除 Slack 連結
export function unlinkSlackAccount(): UserSettings {
  mockCurrentUserSettings.slackId = undefined
  mockCurrentUserSettings.slackUsername = undefined
  return { ...mockCurrentUserSettings }
}
