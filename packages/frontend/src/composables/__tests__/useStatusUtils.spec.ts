import { getStatusLabel, getStatusClass, getRoleLabel, getRoleBadgeClass } from '../useStatusUtils'

describe('useStatusUtils', () => {
  // ------------------------------------------
  // getStatusLabel
  // ------------------------------------------
  describe('getStatusLabel', () => {
    const expectedLabels: Record<string, string> = {
      UNCLAIMED: '待認領',
      CLAIMED: '已認領',
      IN_PROGRESS: '進行中',
      PAUSED: '暫停中',
      DONE: '已完成',
      BLOCKED: '卡關',
    }

    it.each(Object.entries(expectedLabels))('returns "%s" label as "%s"', (status, label) => {
      expect(getStatusLabel(status)).toBe(label)
    })

    it('returns the raw status string for unknown status', () => {
      expect(getStatusLabel('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS')
    })

    it('returns the raw string for an empty string', () => {
      expect(getStatusLabel('')).toBe('')
    })
  })

  // ------------------------------------------
  // getStatusClass
  // ------------------------------------------
  describe('getStatusClass', () => {
    const knownStatuses = ['UNCLAIMED', 'CLAIMED', 'IN_PROGRESS', 'PAUSED', 'DONE', 'BLOCKED']

    it.each(knownStatuses)('returns a non-empty CSS class string for "%s"', status => {
      const result = getStatusClass(status)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('returns correct class for UNCLAIMED', () => {
      expect(getStatusClass('UNCLAIMED')).toContain('bg-gray-100')
      expect(getStatusClass('UNCLAIMED')).toContain('text-gray-700')
    })

    it('returns correct class for DONE', () => {
      expect(getStatusClass('DONE')).toContain('bg-green-100')
      expect(getStatusClass('DONE')).toContain('text-green-700')
    })

    it('returns correct class for BLOCKED', () => {
      expect(getStatusClass('BLOCKED')).toContain('bg-red-100')
      expect(getStatusClass('BLOCKED')).toContain('text-red-700')
    })

    it('returns fallback class for unknown status', () => {
      expect(getStatusClass('NONEXISTENT')).toBe('bg-gray-100 text-gray-700')
    })
  })

  // ------------------------------------------
  // getRoleLabel
  // ------------------------------------------
  describe('getRoleLabel', () => {
    const expectedLabels: Record<string, string> = {
      EMPLOYEE: '一般同仁',
      PM: '專案經理',
      PRODUCER: '製作人',
      MANAGER: '部門主管',
      ADMIN: '管理員',
    }

    it.each(Object.entries(expectedLabels))('returns "%s" label as "%s"', (role, label) => {
      expect(getRoleLabel(role)).toBe(label)
    })

    it('returns the raw role string for unknown role', () => {
      expect(getRoleLabel('SUPER_ADMIN')).toBe('SUPER_ADMIN')
    })

    it('returns the raw string for an empty string', () => {
      expect(getRoleLabel('')).toBe('')
    })
  })

  // ------------------------------------------
  // getRoleBadgeClass
  // ------------------------------------------
  describe('getRoleBadgeClass', () => {
    const knownRoles = ['EMPLOYEE', 'PM', 'PRODUCER', 'MANAGER', 'ADMIN']

    it.each(knownRoles)('returns a non-empty CSS class string for "%s"', role => {
      const result = getRoleBadgeClass(role)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('returns correct class for PM', () => {
      expect(getRoleBadgeClass('PM')).toContain('bg-purple-100')
      expect(getRoleBadgeClass('PM')).toContain('text-purple-700')
    })

    it('returns correct class for ADMIN', () => {
      expect(getRoleBadgeClass('ADMIN')).toContain('bg-green-100')
      expect(getRoleBadgeClass('ADMIN')).toContain('text-green-700')
    })

    it('falls back to EMPLOYEE class for unknown role', () => {
      const employeeClass = getRoleBadgeClass('EMPLOYEE')
      expect(getRoleBadgeClass('UNKNOWN_ROLE')).toBe(employeeClass)
    })

    it('EMPLOYEE fallback class contains gray styling', () => {
      expect(getRoleBadgeClass('EMPLOYEE')).toContain('bg-gray-100')
      expect(getRoleBadgeClass('EMPLOYEE')).toContain('text-gray-700')
    })
  })
})
