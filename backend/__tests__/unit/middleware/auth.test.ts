import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mock prisma
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    employee: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '../../../src/config/database';
import { authenticate, authorize, AuthRequest } from '../../../src/middleware/auth';

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should return 401 if no authorization header', async () => {
      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: '未提供認證 Token' },
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next() with valid token and existing user', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        permissionLevel: 'EMPLOYEE',
        isActive: true,
      };

      const token = jwt.sign(
        { userId: mockUser.id, name: mockUser.name, email: mockUser.email, permissionLevel: mockUser.permissionLevel },
        process.env.JWT_SECRET!
      );

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toEqual({
        userId: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        permissionLevel: mockUser.permissionLevel,
      });
    });

    it('should return 401 if user not found in database', async () => {
      const token = jwt.sign(
        { userId: 'non-existent', email: 'test@example.com', permissionLevel: 'EMPLOYEE' },
        process.env.JWT_SECRET!
      );

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'AUTH_INVALID_TOKEN', message: '無效的認證 Token' },
      });
    });
  });

  describe('authorize', () => {
    it('should return 403 if user permission level is insufficient', () => {
      mockRequest.user = {
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        permissionLevel: 'EMPLOYEE',
      };

      const middleware = authorize('ADMIN');

      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'AUTH_FORBIDDEN', message: '權限不足' },
      });
    });

    it('should call next() if user has required permission', () => {
      mockRequest.user = {
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        permissionLevel: 'ADMIN',
      };

      const middleware = authorize('ADMIN');

      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should accept multiple permission levels', () => {
      mockRequest.user = {
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        permissionLevel: 'PM',
      };

      const middleware = authorize('PM', 'ADMIN');

      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
