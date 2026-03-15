import { Response, NextFunction } from 'express';
import { PermissionLevel } from '@prisma/client';

// Mock logger to suppress output during tests
jest.mock('../../../src/config/logger', () => ({
  __esModule: true,
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock prisma
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    projectMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    task: {
      findUnique: jest.fn(),
    },
    timeEntry: {
      findUnique: jest.fn(),
    },
    progressLog: {
      findUnique: jest.fn(),
    },
    milestone: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '../../../src/config/database';
import { AuthRequest } from '../../../src/middleware/auth';
import {
  requireProjectMember,
  requireResourceOwner,
  requireProjectScope,
  buildProjectScopeFilter,
} from '../../../src/middleware/projectAuth';

// Helper: build a minimal mock AuthRequest
function makeReq(
  overrides: Partial<AuthRequest> & { params?: Record<string, string> } = {},
): AuthRequest {
  return {
    user: undefined,
    params: {},
    method: 'GET',
    originalUrl: '/test',
    ip: '127.0.0.1',
    headers: {},
    ...overrides,
  } as unknown as AuthRequest;
}

function makeRes(): { res: Partial<Response>; status: jest.Mock; json: jest.Mock } {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as Partial<Response>;
  return { res, status, json };
}

// ---------------------------------------------------------------------------
// requireProjectMember
// ---------------------------------------------------------------------------

describe('requireProjectMember', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('returns 401 when req.user is undefined', async () => {
    const middleware = requireProjectMember('projectId');
    const req = makeReq({ user: undefined, params: { projectId: 'p1' } });
    const { res, status } = makeRes();

    await middleware(req, res as Response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when project param is missing', async () => {
    const middleware = requireProjectMember('projectId');
    const req = makeReq({
      user: { userId: 'u1', name: 'U', email: 'u@test.com', permissionLevel: PermissionLevel.EMPLOYEE },
      params: {},
    });
    const { res, status } = makeRes();

    await middleware(req, res as Response, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for ADMIN without querying DB', async () => {
    const middleware = requireProjectMember('projectId');
    const req = makeReq({
      user: { userId: 'admin1', name: 'Admin', email: 'admin@test.com', permissionLevel: PermissionLevel.ADMIN },
      params: { projectId: 'p1' },
    });
    const { res } = makeRes();

    await middleware(req, res as Response, next);

    expect(prisma.projectMember.findUnique).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('calls next() when user is a member of the project', async () => {
    const middleware = requireProjectMember('projectId');
    const req = makeReq({
      user: { userId: 'u1', name: 'U', email: 'u@test.com', permissionLevel: PermissionLevel.EMPLOYEE },
      params: { projectId: 'p1' },
    });
    const { res } = makeRes();

    (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue({
      projectId: 'p1',
      employeeId: 'u1',
    });

    await middleware(req, res as Response, next);

    expect(prisma.projectMember.findUnique).toHaveBeenCalledWith({
      where: { projectId_employeeId: { projectId: 'p1', employeeId: 'u1' } },
    });
    expect(next).toHaveBeenCalled();
  });

  it('returns 404 when user is NOT a member of the project', async () => {
    const middleware = requireProjectMember('projectId');
    const req = makeReq({
      user: { userId: 'u1', name: 'U', email: 'u@test.com', permissionLevel: PermissionLevel.EMPLOYEE },
      params: { projectId: 'p1' },
    });
    const { res, status } = makeRes();

    (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue(null);

    await middleware(req, res as Response, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(error) when DB throws', async () => {
    const middleware = requireProjectMember('projectId');
    const req = makeReq({
      user: { userId: 'u1', name: 'U', email: 'u@test.com', permissionLevel: PermissionLevel.EMPLOYEE },
      params: { projectId: 'p1' },
    });
    const { res } = makeRes();
    const dbError = new Error('DB failure');

    (prisma.projectMember.findUnique as jest.Mock).mockRejectedValue(dbError);

    await middleware(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(dbError);
  });
});

// ---------------------------------------------------------------------------
// requireResourceOwner
// ---------------------------------------------------------------------------

describe('requireResourceOwner', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('returns 401 when req.user is undefined', async () => {
    const middleware = requireResourceOwner('task', 'taskId');
    const req = makeReq({ user: undefined, params: { taskId: 't1' } });
    const { res, status } = makeRes();

    await middleware(req, res as Response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when resource ID param is missing', async () => {
    const middleware = requireResourceOwner('task', 'taskId');
    const req = makeReq({
      user: { userId: 'u1', name: 'U', email: 'u@test.com', permissionLevel: PermissionLevel.EMPLOYEE },
      params: {},
    });
    const { res, status } = makeRes();

    await middleware(req, res as Response, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('ADMIN: calls next() and attaches record when resource exists', async () => {
    const middleware = requireResourceOwner('task', 'taskId');
    const req = makeReq({
      user: { userId: 'admin1', name: 'Admin', email: 'admin@test.com', permissionLevel: PermissionLevel.ADMIN },
      params: { taskId: 't1' },
    });
    const { res } = makeRes();
    const mockTask = { id: 't1', title: 'Task 1' };

    (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);

    await middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).authorizedResource).toBe(mockTask);
  });

  it('ADMIN: returns 404 when resource does not exist', async () => {
    const middleware = requireResourceOwner('task', 'taskId');
    const req = makeReq({
      user: { userId: 'admin1', name: 'Admin', email: 'admin@test.com', permissionLevel: PermissionLevel.ADMIN },
      params: { taskId: 'nonexistent' },
    });
    const { res, status } = makeRes();

    (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);

    await middleware(req, res as Response, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('non-ADMIN: calls next() and attaches record when user is a project member', async () => {
    const middleware = requireResourceOwner('task', 'taskId');
    const req = makeReq({
      user: { userId: 'u1', name: 'U', email: 'u@test.com', permissionLevel: PermissionLevel.EMPLOYEE },
      params: { taskId: 't1' },
    });
    const { res } = makeRes();

    // task.findUnique with include returns project with members
    const mockTask = {
      id: 't1',
      project: {
        members: [{ employeeId: 'u1' }],
      },
    };
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);

    await middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).authorizedResource).toBe(mockTask);
  });

  it('non-ADMIN: returns 404 when resource does not exist', async () => {
    const middleware = requireResourceOwner('task', 'taskId');
    const req = makeReq({
      user: { userId: 'u1', name: 'U', email: 'u@test.com', permissionLevel: PermissionLevel.EMPLOYEE },
      params: { taskId: 'nonexistent' },
    });
    const { res, status } = makeRes();

    (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);

    await middleware(req, res as Response, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('non-ADMIN: returns 404 when user is not a project member', async () => {
    const middleware = requireResourceOwner('task', 'taskId');
    const req = makeReq({
      user: { userId: 'u1', name: 'U', email: 'u@test.com', permissionLevel: PermissionLevel.EMPLOYEE },
      params: { taskId: 't1' },
    });
    const { res, status } = makeRes();

    // members array is empty — user is not a member
    const mockTask = {
      id: 't1',
      project: {
        members: [],
      },
    };
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);

    await middleware(req, res as Response, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('progressLog resource: checks membership via task.project.members', async () => {
    const middleware = requireResourceOwner('progressLog', 'logId');
    const req = makeReq({
      user: { userId: 'u1', name: 'U', email: 'u@test.com', permissionLevel: PermissionLevel.EMPLOYEE },
      params: { logId: 'log1' },
    });
    const { res } = makeRes();

    const mockLog = {
      id: 'log1',
      employeeId: 'u1',
      task: {
        project: {
          members: [{ employeeId: 'u1' }],
        },
      },
    };
    (prisma.progressLog.findUnique as jest.Mock).mockResolvedValue(mockLog);

    await middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).authorizedResource).toBe(mockLog);
  });

  it('calls next(error) when DB throws', async () => {
    const middleware = requireResourceOwner('task', 'taskId');
    const req = makeReq({
      user: { userId: 'u1', name: 'U', email: 'u@test.com', permissionLevel: PermissionLevel.EMPLOYEE },
      params: { taskId: 't1' },
    });
    const { res } = makeRes();
    const dbError = new Error('DB failure');

    (prisma.task.findUnique as jest.Mock).mockRejectedValue(dbError);

    await middleware(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(dbError);
  });
});

// ---------------------------------------------------------------------------
// requireProjectScope
// ---------------------------------------------------------------------------

describe('requireProjectScope', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('returns 401 when req.user is undefined', async () => {
    const req = makeReq({ user: undefined });
    const { res, status } = makeRes();

    await requireProjectScope(req, res as Response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('ADMIN: calls next() without querying DB or setting authorizedProjectIds', async () => {
    const req = makeReq({
      user: { userId: 'admin1', name: 'Admin', email: 'admin@test.com', permissionLevel: PermissionLevel.ADMIN },
    });
    const { res } = makeRes();

    await requireProjectScope(req, res as Response, next);

    expect(prisma.projectMember.findMany).not.toHaveBeenCalled();
    expect((req as any).authorizedProjectIds).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('non-ADMIN: populates authorizedProjectIds with user memberships', async () => {
    const req = makeReq({
      user: { userId: 'u1', name: 'U', email: 'u@test.com', permissionLevel: PermissionLevel.EMPLOYEE },
    });
    const { res } = makeRes();

    (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([
      { projectId: 'p1' },
      { projectId: 'p2' },
    ]);

    await requireProjectScope(req, res as Response, next);

    expect(prisma.projectMember.findMany).toHaveBeenCalledWith({
      where: { employeeId: 'u1' },
      select: { projectId: true },
    });
    expect((req as any).authorizedProjectIds).toEqual(['p1', 'p2']);
    expect(next).toHaveBeenCalled();
  });

  it('non-ADMIN: sets authorizedProjectIds to empty array when user has no memberships', async () => {
    const req = makeReq({
      user: { userId: 'u1', name: 'U', email: 'u@test.com', permissionLevel: PermissionLevel.EMPLOYEE },
    });
    const { res } = makeRes();

    (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([]);

    await requireProjectScope(req, res as Response, next);

    expect((req as any).authorizedProjectIds).toEqual([]);
    expect(next).toHaveBeenCalled();
  });

  it('calls next(error) when DB throws', async () => {
    const req = makeReq({
      user: { userId: 'u1', name: 'U', email: 'u@test.com', permissionLevel: PermissionLevel.EMPLOYEE },
    });
    const { res } = makeRes();
    const dbError = new Error('DB failure');

    (prisma.projectMember.findMany as jest.Mock).mockRejectedValue(dbError);

    await requireProjectScope(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(dbError);
  });
});

// ---------------------------------------------------------------------------
// buildProjectScopeFilter
// ---------------------------------------------------------------------------

describe('buildProjectScopeFilter', () => {
  it('returns empty object when projectIds is undefined (ADMIN path)', () => {
    expect(buildProjectScopeFilter(undefined)).toEqual({});
  });

  it('returns { projectId: { in: [...] } } when projectIds is provided', () => {
    expect(buildProjectScopeFilter(['p1', 'p2'])).toEqual({
      projectId: { in: ['p1', 'p2'] },
    });
  });

  it('returns filter with empty array when projectIds is []', () => {
    expect(buildProjectScopeFilter([])).toEqual({
      projectId: { in: [] },
    });
  });
});
