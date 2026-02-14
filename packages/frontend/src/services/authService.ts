import type { User, ActionResult } from 'shared/types'
import { apiGetUnwrap, apiPostUnwrap } from './api'
import { mockCurrentUser } from '@/mocks/unified'

export interface AuthServiceInterface {
  loginWithSlack(code: string): Promise<ActionResult<{ user: User; token: string }>>
  getCurrentUser(): Promise<ActionResult<User>>
  logout(): Promise<void>
}

class MockAuthService implements AuthServiceInterface {
  async loginWithSlack(): Promise<ActionResult<{ user: User; token: string }>> {
    await new Promise(r => setTimeout(r, 500))
    return { success: true, data: { user: { ...mockCurrentUser }, token: 'mock-jwt-token' } }
  }

  async getCurrentUser(): Promise<ActionResult<User>> {
    await new Promise(r => setTimeout(r, 200))
    return { success: true, data: { ...mockCurrentUser } }
  }

  async logout(): Promise<void> {
    await new Promise(r => setTimeout(r, 200))
    localStorage.removeItem('auth_token')
  }
}

class ApiAuthService implements AuthServiceInterface {
  async loginWithSlack(code: string): Promise<ActionResult<{ user: User; token: string }>> {
    const data = await apiPostUnwrap<{ user: User; token: string }>('/auth/slack', { code })
    return { success: true, data }
  }

  async getCurrentUser(): Promise<ActionResult<User>> {
    const data = await apiGetUnwrap<User>('/auth/me')
    return { success: true, data }
  }

  async logout(): Promise<void> {
    await apiPostUnwrap('/auth/logout')
    localStorage.removeItem('auth_token')
  }
}

export const createAuthService = (): AuthServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockAuthService() : new ApiAuthService()
