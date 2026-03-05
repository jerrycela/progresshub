import type { User, ActionResult } from 'shared/types'
import { apiGetUnwrap, apiPostUnwrap } from './api'
import { mockCurrentUser } from '@/mocks/unified'
import { mockDelay } from '@/utils/mockDelay'

export interface AuthServiceInterface {
  loginWithSlack(
    code: string,
    state: string,
  ): Promise<ActionResult<{ user: User; token: string; refreshToken?: string }>>
  getCurrentUser(): Promise<ActionResult<User>>
  logout(): Promise<void>
}

class MockAuthService implements AuthServiceInterface {
  async loginWithSlack(
    _code: string,
    _state: string,
  ): Promise<ActionResult<{ user: User; token: string; refreshToken?: string }>> {
    await mockDelay(500)
    return { success: true, data: { user: { ...mockCurrentUser }, token: 'mock-jwt-token' } }
  }

  async getCurrentUser(): Promise<ActionResult<User>> {
    await mockDelay()
    return { success: true, data: { ...mockCurrentUser } }
  }

  async logout(): Promise<void> {
    await mockDelay()
    localStorage.removeItem('auth_token')
  }
}

class ApiAuthService implements AuthServiceInterface {
  async loginWithSlack(
    code: string,
    state: string,
  ): Promise<ActionResult<{ user: User; token: string; refreshToken?: string }>> {
    try {
      const data = await apiPostUnwrap<{ user: User; token: string; refreshToken?: string }>(
        '/auth/slack',
        { code, state },
      )
      return { success: true, data }
    } catch (e) {
      const message = e instanceof Error ? e.message : '登入失敗'
      return { success: false, error: { code: 'AUTH_LOGIN_FAILED', message } }
    }
  }

  async getCurrentUser(): Promise<ActionResult<User>> {
    try {
      const data = await apiGetUnwrap<User>('/auth/me')
      return { success: true, data }
    } catch (e) {
      const message = e instanceof Error ? e.message : '取得使用者資訊失敗'
      return { success: false, error: { code: 'AUTH_FETCH_FAILED', message } }
    }
  }

  async logout(): Promise<void> {
    try {
      await apiPostUnwrap('/auth/logout')
    } catch (e) {
      console.warn('Logout API failed, proceeding with local cleanup:', e)
    }
    localStorage.removeItem('auth_token')
  }
}

export const createAuthService = (): AuthServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockAuthService() : new ApiAuthService()
