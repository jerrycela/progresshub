import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import { mockCurrentUser, mockUsers } from '@/mocks/unified'
import type { UserRole } from 'shared/types'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // Helper: 設定已認證狀態（重構後 store 初始為 null）
  function setupAuthenticated() {
    const store = useAuthStore()
    store.user = { ...mockCurrentUser }
    return store
  }

  // ------------------------------------------
  // Initial state
  // ------------------------------------------
  describe('initial state', () => {
    it('should have null user by default (requires initAuth to populate)', () => {
      const store = useAuthStore()

      expect(store.user).toBeNull()
    })

    it('should not be authenticated by default', () => {
      const store = useAuthStore()

      expect(store.isAuthenticated).toBe(false)
    })

    it('should have no error initially', () => {
      const store = useAuthStore()

      expect(store.error).toBeNull()
    })

    it('should not be loading initially', () => {
      const store = useAuthStore()

      expect(store.isLoading).toBe(false)
      expect(store.loading.login).toBe(false)
      expect(store.loading.logout).toBe(false)
    })

    it('should expose empty userName when user is null', () => {
      const store = useAuthStore()

      expect(store.userName).toBe('')
    })

    it('should expose null userRole when user is null', () => {
      const store = useAuthStore()

      expect(store.userRole).toBeNull()
    })
  })

  // ------------------------------------------
  // login
  // ------------------------------------------
  describe('login', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should set loading.login to true during login', async () => {
      const store = useAuthStore()

      const loginPromise = store.login()

      expect(store.loading.login).toBe(true)
      expect(store.isLoading).toBe(true)

      await vi.advanceTimersByTimeAsync(500)
      await loginPromise

      expect(store.loading.login).toBe(false)
      expect(store.isLoading).toBe(false)
    })

    it('should set user to mockCurrentUser on success', async () => {
      const store = useAuthStore()

      const loginPromise = store.login()
      await vi.advanceTimersByTimeAsync(500)
      const result = await loginPromise

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockCurrentUser)
      expect(store.user).toEqual(mockCurrentUser)
    })

    it('should clear error before login attempt', async () => {
      const store = useAuthStore()
      store.error = 'previous error'

      const loginPromise = store.login()

      expect(store.error).toBeNull()

      await vi.advanceTimersByTimeAsync(500)
      await loginPromise
    })

    it('should accept an optional slackCode parameter', async () => {
      const store = useAuthStore()

      const loginPromise = store.login('slack-code-123')
      await vi.advanceTimersByTimeAsync(500)
      const result = await loginPromise

      expect(result.success).toBe(true)
    })
  })

  // ------------------------------------------
  // logout
  // ------------------------------------------
  describe('logout', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should set user to null after logout', async () => {
      const store = setupAuthenticated()

      expect(store.user).not.toBeNull()

      const logoutPromise = store.logout()
      await vi.advanceTimersByTimeAsync(300)
      const result = await logoutPromise

      expect(result.success).toBe(true)
      expect(store.user).toBeNull()
    })

    it('should set isAuthenticated to false after logout', async () => {
      const store = setupAuthenticated()

      expect(store.isAuthenticated).toBe(true)

      const logoutPromise = store.logout()
      await vi.advanceTimersByTimeAsync(300)
      await logoutPromise

      expect(store.isAuthenticated).toBe(false)
    })

    it('should set loading.logout to true during logout', async () => {
      const store = setupAuthenticated()

      const logoutPromise = store.logout()

      expect(store.loading.logout).toBe(true)
      expect(store.isLoading).toBe(true)

      await vi.advanceTimersByTimeAsync(300)
      await logoutPromise

      expect(store.loading.logout).toBe(false)
      expect(store.isLoading).toBe(false)
    })

    it('should clear error before logout attempt', async () => {
      const store = setupAuthenticated()
      store.error = 'some error'

      const logoutPromise = store.logout()

      expect(store.error).toBeNull()

      await vi.advanceTimersByTimeAsync(300)
      await logoutPromise
    })
  })

  // ------------------------------------------
  // switchUser
  // ------------------------------------------
  describe('switchUser', () => {
    it('should switch to a valid user and return success', () => {
      const store = useAuthStore()
      const targetUser = mockUsers[1]

      const result = store.switchUser(targetUser.id)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(targetUser)
      expect(store.user).toEqual(targetUser)
    })

    it('should return error for an invalid userId', () => {
      const store = useAuthStore()

      const result = store.switchUser('nonexistent-user-id')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('AUTH_UNAUTHORIZED')
      expect(result.error?.message).toBe('找不到指定的使用者')
    })

    it('should not change current user when switching to invalid userId', () => {
      const store = setupAuthenticated()
      const originalUser = store.user

      store.switchUser('nonexistent-user-id')

      expect(store.user).toEqual(originalUser)
    })

    it('should update computed getters after switching user', () => {
      const store = useAuthStore()
      const targetUser = mockUsers[1]

      store.switchUser(targetUser.id)

      expect(store.userName).toBe(targetUser.name)
      expect(store.userRole).toBe(targetUser.role)
      expect(store.isAuthenticated).toBe(true)
    })
  })

  // ------------------------------------------
  // hasRole
  // ------------------------------------------
  describe('hasRole', () => {
    it('should return true when user has a matching role', () => {
      const store = setupAuthenticated()
      const currentRole = store.userRole as UserRole

      expect(store.hasRole([currentRole])).toBe(true)
    })

    it('should return true when user role is in the provided list', () => {
      const store = setupAuthenticated()

      expect(store.hasRole(['EMPLOYEE', 'PM', 'ADMIN'])).toBe(true)
    })

    it('should return false when user role does not match', () => {
      const store = setupAuthenticated()

      // mockCurrentUser (emp-1) 的角色是 EMPLOYEE
      expect(store.hasRole(['PM', 'ADMIN'])).toBe(false)
    })

    it('should return false when user is null', () => {
      const store = useAuthStore()
      store.user = null

      expect(store.hasRole(['EMPLOYEE', 'PM', 'ADMIN'])).toBe(false)
    })
  })

  // ------------------------------------------
  // isPM
  // ------------------------------------------
  describe('isPM', () => {
    it('should be true for PM role', () => {
      const store = useAuthStore()
      const pmUser = mockUsers.find(u => u.role === 'PM')

      if (pmUser) {
        store.switchUser(pmUser.id)
        expect(store.isPM).toBe(true)
      }
    })

    it('should be true for ADMIN role', () => {
      const store = useAuthStore()
      const adminUser = mockUsers.find(u => u.role === 'ADMIN')

      if (adminUser) {
        store.switchUser(adminUser.id)
        expect(store.isPM).toBe(true)
      }
    })

    it('should be false for EMPLOYEE role', () => {
      const store = useAuthStore()
      const memberUser = mockUsers.find(u => u.role === 'EMPLOYEE')

      if (memberUser) {
        store.switchUser(memberUser.id)
        expect(store.isPM).toBe(false)
      }
    })
  })

  // ------------------------------------------
  // isAdmin
  // ------------------------------------------
  describe('isAdmin', () => {
    it('should be true only for ADMIN role', () => {
      const store = useAuthStore()
      const adminUser = mockUsers.find(u => u.role === 'ADMIN')

      if (adminUser) {
        store.switchUser(adminUser.id)
        expect(store.isAdmin).toBe(true)
      }
    })

    it('should be false for PM role', () => {
      const store = useAuthStore()
      const pmUser = mockUsers.find(u => u.role === 'PM')

      if (pmUser) {
        store.switchUser(pmUser.id)
        expect(store.isAdmin).toBe(false)
      }
    })

    it('should be false for EMPLOYEE role', () => {
      const store = useAuthStore()
      const memberUser = mockUsers.find(u => u.role === 'EMPLOYEE')

      if (memberUser) {
        store.switchUser(memberUser.id)
        expect(store.isAdmin).toBe(false)
      }
    })
  })

  // ------------------------------------------
  // clearError
  // ------------------------------------------
  describe('clearError', () => {
    it('should reset error to null', () => {
      const store = useAuthStore()
      store.error = 'Something went wrong'

      expect(store.error).toBe('Something went wrong')

      store.clearError()

      expect(store.error).toBeNull()
    })

    it('should be a no-op when error is already null', () => {
      const store = useAuthStore()

      expect(store.error).toBeNull()

      store.clearError()

      expect(store.error).toBeNull()
    })
  })
})
