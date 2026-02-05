import { Response } from 'express'
import { sendSuccess, sendError, sendPaginated } from '../../src/middleware/responseFormatter'

describe('Response Formatter', () => {
  let mockRes: Partial<Response>

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }
  })

  describe('sendSuccess', () => {
    it('should send success response with data', () => {
      const data = { id: '1', name: 'Test' }
      sendSuccess(mockRes as Response, data)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data
      })
    })

    it('should send success response with custom status', () => {
      const data = { id: '1' }
      sendSuccess(mockRes as Response, data, 201)

      expect(mockRes.status).toHaveBeenCalledWith(201)
    })
  })

  describe('sendError', () => {
    it('should send error response', () => {
      sendError(mockRes as Response, 'RESOURCE_NOT_FOUND', '找不到資源', 404)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: '找不到資源'
        }
      })
    })
  })

  describe('sendPaginated', () => {
    it('should send paginated response with hasMore true', () => {
      const data = [{ id: '1' }, { id: '2' }]
      sendPaginated(mockRes as Response, data, { total: 10, page: 1, limit: 2 })

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        meta: {
          total: 10,
          page: 1,
          limit: 2,
          hasMore: true
        }
      })
    })

    it('should send paginated response with hasMore false', () => {
      const data = [{ id: '1' }]
      sendPaginated(mockRes as Response, data, { total: 1, page: 1, limit: 10 })

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          hasMore: false
        }
      })
    })
  })
})
