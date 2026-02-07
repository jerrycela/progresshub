import type { User, ActionResult } from 'shared/types'
import api from './api'

export interface AuthServiceInterface {
  loginWithSlack(code: string): Promise<ActionResult<{ user: User; token: string }>>
  getCurrentUser(): Promise<ActionResult<User>>
  logout(): Promise<void>
}

class MockAuthService implements AuthServiceInterface {
  async loginWithSlack(): Promise<ActionResult<{ user: User; token: string }>> {
    await new Promise((r) => setTimeout(r, 500))
    const user: User = {
      id: 'emp-6',
      name: '黃美玲',
      email: 'huang@company.com',
      role: 'PM',
      functionType: 'PLANNING',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    }
    return { success: true, data: { user, token: 'mock-jwt-token' } }
  }

  async getCurrentUser(): Promise<ActionResult<User>> {
    await new Promise((r) => setTimeout(r, 200))
    const user: User = {
      id: 'emp-6',
      name: '黃美玲',
      email: 'huang@company.com',
      role: 'PM',
      functionType: 'PLANNING',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    }
    return { success: true, data: user }
  }

  async logout(): Promise<void> {
    await new Promise((r) => setTimeout(r, 200))
    localStorage.removeItem('auth_token')
  }
}

class ApiAuthService implements AuthServiceInterface {
  async loginWithSlack(code: string): Promise<ActionResult<{ user: User; token: string }>> {
    const { data } = await api.post<{ user: User; token: string }>('/auth/slack', { code })
    return { success: true, data }
  }

  async getCurrentUser(): Promise<ActionResult<User>> {
    const { data } = await api.get<User>('/auth/me')
    return { success: true, data }
  }

  async logout(): Promise<void> {
    await api.post('/auth/logout')
    localStorage.removeItem('auth_token')
  }
}

export const createAuthService = (): AuthServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockAuthService() : new ApiAuthService()
