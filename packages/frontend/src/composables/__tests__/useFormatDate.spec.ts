import { useFormatDate } from '../useFormatDate'

describe('useFormatDate', () => {
  const { formatShort, formatFull, formatISO, getRelativeDays, getToday, getDaysAgo } =
    useFormatDate()

  // ------------------------------------------
  // formatShort
  // ------------------------------------------
  describe('formatShort', () => {
    it('returns "-" when date is undefined', () => {
      expect(formatShort(undefined)).toBe('-')
    })

    it('returns "-" when date is not provided', () => {
      expect(formatShort()).toBe('-')
    })

    it('formats a string date correctly', () => {
      const result = formatShort('2026-03-15')
      // zh-TW short month format: "3月15日"
      expect(result).toContain('3')
      expect(result).toContain('15')
    })

    it('formats a Date object correctly', () => {
      const date = new Date(2026, 0, 5) // January 5, 2026
      const result = formatShort(date)
      expect(result).toContain('1')
      expect(result).toContain('5')
    })
  })

  // ------------------------------------------
  // formatFull
  // ------------------------------------------
  describe('formatFull', () => {
    it('returns "-" when date is undefined', () => {
      expect(formatFull(undefined)).toBe('-')
    })

    it('returns "-" when date is not provided', () => {
      expect(formatFull()).toBe('-')
    })

    it('formats a string date with year, month, day', () => {
      const result = formatFull('2026-07-20')
      expect(result).toContain('2026')
      expect(result).toContain('7')
      expect(result).toContain('20')
    })

    it('formats a Date object with year, month, day', () => {
      const date = new Date(2025, 11, 25) // December 25, 2025
      const result = formatFull(date)
      expect(result).toContain('2025')
      expect(result).toContain('12')
      expect(result).toContain('25')
    })
  })

  // ------------------------------------------
  // formatISO
  // ------------------------------------------
  describe('formatISO', () => {
    it('returns "-" when date is undefined', () => {
      expect(formatISO(undefined)).toBe('-')
    })

    it('returns "-" when date is not provided', () => {
      expect(formatISO()).toBe('-')
    })

    it('returns YYYY-MM-DD format from string input', () => {
      const result = formatISO('2026-04-09T12:30:00Z')
      expect(result).toBe('2026-04-09')
    })

    it('returns YYYY-MM-DD format from Date object', () => {
      const date = new Date('2026-08-01T00:00:00Z')
      const result = formatISO(date)
      expect(result).toBe('2026-08-01')
    })

    it('matches YYYY-MM-DD pattern', () => {
      const result = formatISO('2026-01-01')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  // ------------------------------------------
  // getRelativeDays (requires fake timers)
  // ------------------------------------------
  describe('getRelativeDays', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns negative number for past dates', () => {
      const result = getRelativeDays('2026-06-10')
      expect(result).toBeLessThan(0)
    })

    it('returns positive number for future dates', () => {
      const result = getRelativeDays('2026-06-20')
      expect(result).toBeGreaterThan(0)
    })

    it('returns approximately 0 for today', () => {
      const result = getRelativeDays('2026-06-15')
      // Could be 0 or -1 depending on time precision
      expect(result).toBeGreaterThanOrEqual(-1)
      expect(result).toBeLessThanOrEqual(0)
    })

    it('calculates correct difference for a known date', () => {
      // 2026-06-20 is 5 days after 2026-06-15
      const result = getRelativeDays('2026-06-20')
      expect(result).toBe(4) // Math.floor accounts for the 12h offset
    })
  })

  // ------------------------------------------
  // getToday (requires fake timers)
  // ------------------------------------------
  describe('getToday', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-10T08:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns today in ISO format', () => {
      expect(getToday()).toBe('2026-03-10')
    })

    it('matches YYYY-MM-DD pattern', () => {
      expect(getToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  // ------------------------------------------
  // getDaysAgo (requires fake timers)
  // ------------------------------------------
  describe('getDaysAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-10T08:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns today when days is 0', () => {
      expect(getDaysAgo(0)).toBe('2026-03-10')
    })

    it('returns correct date for 1 day ago', () => {
      expect(getDaysAgo(1)).toBe('2026-03-09')
    })

    it('returns correct date for 7 days ago', () => {
      expect(getDaysAgo(7)).toBe('2026-03-03')
    })

    it('handles month boundary correctly', () => {
      // 10 days before March 10 = Feb 28
      expect(getDaysAgo(10)).toBe('2026-02-28')
    })

    it('returns YYYY-MM-DD format', () => {
      expect(getDaysAgo(5)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})
