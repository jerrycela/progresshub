import { PermissionLevel } from '@prisma/client';

// Mock prisma
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    employee: {
      count: jest.fn(),
    },
    task: {
      count: jest.fn(),
    },
    projectMember: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  },
}));

// Mock node-cache
jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
    flushAll: jest.fn(),
  }));
});

import prisma from '../../../src/config/database';
import { DashboardService } from '../../../src/services/dashboardService';

const mockTaskStats = [
  { function_type: 'PLANNING', total_tasks: BigInt(10), unclaimed_tasks: BigInt(3), in_progress_tasks: BigInt(4) },
  { function_type: 'PROGRAMMING', total_tasks: BigInt(8), unclaimed_tasks: BigInt(2), in_progress_tasks: BigInt(3) },
];

const mockEmployeeStats = [
  { function_type: 'PLANNING', member_count: BigInt(5) },
  { function_type: 'PROGRAMMING', member_count: BigInt(7) },
];

describe('DashboardService.getWorkloads', () => {
  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService();
    service.invalidateCache();
  });

  it('should return global workloads for ADMIN (no project filter)', async () => {
    (prisma.$queryRawUnsafe as jest.Mock)
      .mockResolvedValueOnce(mockTaskStats)
      .mockResolvedValueOnce(mockEmployeeStats);

    const result = await service.getWorkloads('admin-1', PermissionLevel.ADMIN);

    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({
      functionType: 'PLANNING',
      memberCount: 5,
      totalTasks: 10,
      unclaimedTasks: 3,
      inProgressTasks: 4,
    });
    // ADMIN should NOT trigger projectMember lookup
    expect(prisma.projectMember.findMany).not.toHaveBeenCalled();
  });

  it('should scope workloads to PM projects', async () => {
    const pmProjects = [
      { projectId: 'proj-1' },
      { projectId: 'proj-2' },
    ];
    (prisma.projectMember.findMany as jest.Mock).mockResolvedValue(pmProjects);
    (prisma.$queryRawUnsafe as jest.Mock)
      .mockResolvedValueOnce(mockTaskStats)
      .mockResolvedValueOnce(mockEmployeeStats);

    const result = await service.getWorkloads('pm-1', PermissionLevel.PM);

    expect(result).toHaveLength(7);
    expect(prisma.projectMember.findMany).toHaveBeenCalledWith({
      where: { employeeId: 'pm-1' },
      select: { projectId: true },
    });
    // Task query should include project filter parameter
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    const taskQueryCall = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[0];
    expect(taskQueryCall[0]).toContain('ANY($1::text[])');
    expect(taskQueryCall[1]).toEqual(['proj-1', 'proj-2']);
  });

  it('should return zero-count workloads for PM with no projects', async () => {
    (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.$queryRawUnsafe as jest.Mock)
      .mockResolvedValueOnce([]) // no task stats
      .mockResolvedValueOnce(mockEmployeeStats);

    const result = await service.getWorkloads('pm-lonely', PermissionLevel.PM);

    expect(result).toHaveLength(7);
    result.forEach((w) => {
      expect(w.totalTasks).toBe(0);
      expect(w.unclaimedTasks).toBe(0);
      expect(w.inProgressTasks).toBe(0);
    });
    // Employee counts still populated from global query
    expect(result[0].memberCount).toBe(5); // PLANNING
  });

  it('should default to global workloads when no userId provided (backward compat)', async () => {
    (prisma.$queryRawUnsafe as jest.Mock)
      .mockResolvedValueOnce(mockTaskStats)
      .mockResolvedValueOnce(mockEmployeeStats);

    const result = await service.getWorkloads();

    expect(result).toHaveLength(7);
    expect(prisma.projectMember.findMany).not.toHaveBeenCalled();
    // Should use 2 aggregation queries
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
  });
});
