import { validateProgress, validateHours } from '../../src/types/progress'

describe('Progress Type Helpers', () => {
  describe('validateProgress', () => {
    it('should return true for 0', () => {
      expect(validateProgress(0)).toBe(true)
    })

    it('should return true for 100', () => {
      expect(validateProgress(100)).toBe(true)
    })

    it('should return true for values between 0 and 100', () => {
      expect(validateProgress(50)).toBe(true)
      expect(validateProgress(1)).toBe(true)
      expect(validateProgress(99)).toBe(true)
    })

    it('should return false for negative values', () => {
      expect(validateProgress(-1)).toBe(false)
      expect(validateProgress(-100)).toBe(false)
    })

    it('should return false for values over 100', () => {
      expect(validateProgress(101)).toBe(false)
      expect(validateProgress(200)).toBe(false)
    })

    it('should return false for non-integer values', () => {
      expect(validateProgress(50.5)).toBe(false)
      expect(validateProgress(0.1)).toBe(false)
    })
  })

  describe('validateHours', () => {
    it('should return true for undefined', () => {
      expect(validateHours(undefined)).toBe(true)
    })

    it('should return true for 0', () => {
      expect(validateHours(0)).toBe(true)
    })

    it('should return true for positive numbers', () => {
      expect(validateHours(1)).toBe(true)
      expect(validateHours(8.5)).toBe(true)
      expect(validateHours(100)).toBe(true)
    })

    it('should return false for negative numbers', () => {
      expect(validateHours(-1)).toBe(false)
      expect(validateHours(-0.5)).toBe(false)
    })
  })
})
