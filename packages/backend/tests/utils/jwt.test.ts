import { generateTokens, verifyAccessToken, verifyRefreshToken } from '../../src/utils/jwt'

describe('JWT Utils', () => {
  const mockPayload = {
    userId: 'user123',
    email: 'test@example.com',
    role: 'EMPLOYEE'
  }

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const tokens = generateTokens(mockPayload)

      expect(tokens.accessToken).toBeDefined()
      expect(tokens.refreshToken).toBeDefined()
      expect(typeof tokens.accessToken).toBe('string')
      expect(typeof tokens.refreshToken).toBe('string')
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const tokens = generateTokens(mockPayload)
      const decoded = verifyAccessToken(tokens.accessToken)

      expect(decoded.userId).toBe(mockPayload.userId)
      expect(decoded.email).toBe(mockPayload.email)
      expect(decoded.role).toBe(mockPayload.role)
    })

    it('should throw error for invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow()
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const tokens = generateTokens(mockPayload)
      const decoded = verifyRefreshToken(tokens.refreshToken)

      expect(decoded.userId).toBe(mockPayload.userId)
    })

    it('should throw error for invalid token', () => {
      expect(() => verifyRefreshToken('invalid-token')).toThrow()
    })
  })
})
