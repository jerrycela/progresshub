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
  },
}));

import prisma from '../../../src/config/database';
import { DashboardService } from '../../../src/services/dashboardService';

const FUNCTION_TYPES = [
  'PLANNING',
  'PROGRAMMING',
  'ART',
  'ANIMATION',
  'SOUND',
  'VFX',
  'COMBAT',
];

describe('DashboardService.getWorkloads', () => {
  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService();
    // Clear cache before each test
    service.invalidateCache();
  });

  it('should return global workloads for ADMIN (no project filter)', async () => {
    // 7 function types x 4 queries = 28 results
    const mockResults = FUNCTION_TYPES.flatMap(() => [5, 10, 3, 4]);
    (prisma.$transaction as jest.Mock).mockResolvedValue(mockResults);

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

    const mockResults = FUNCTION_TYPES.flatMap(() => [2, 6, 1, 3]);
    (prisma.$transaction as jest.Mock).mockResolvedValue(mockResults);

    const result = await service.getWorkloads('pm-1', PermissionLevel.PM);

    expect(result).toHaveLength(7);
    // Should have queried for PM's project memberships
    expect(prisma.projectMember.findMany).toHaveBeenCalledWith({
      where: { employeeId: 'pm-1' },
      select: { projectId: true },
    });
  });

  it('should return zero-count workloads for PM with no projects', async () => {
    (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([]);

    // All task counts are 0, employee counts are non-zero (global capacity)
    const mockResults = FUNCTION_TYPES.flatMap(() => [3, 0, 0, 0]);
    (prisma.$transaction as jest.Mock).mockResolvedValue(mockResults);

    const result = await service.getWorkloads('pm-lonely', PermissionLevel.PM);

    expect(result).toHaveLength(7);
    result.forEach((w) => {
      expect(w.totalTasks).toBe(0);
      expect(w.unclaimedTasks).toBe(0);
      expect(w.inProgressTasks).toBe(0);
      // Employee counts remain global
      expect(w.memberCount).toBe(3);
    });
  });

  it('should default to global workloads when no userId provided (backward compat)', async () => {
    const mockResults = FUNCTION_TYPES.flatMap(() => [4, 8, 2, 5]);
    (prisma.$transaction as jest.Mock).mockResolvedValue(mockResults);

    const result = await service.getWorkloads();

    expect(result).toHaveLength(7);
    // No userId means global — no project member lookup
    expect(prisma.projectMember.findMany).not.toHaveBeenCalled();
  });
});
