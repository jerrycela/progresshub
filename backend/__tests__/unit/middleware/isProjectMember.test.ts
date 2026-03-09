import { PermissionLevel } from '@prisma/client';

// Mock prisma
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    projectMember: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '../../../src/config/database';
import { isProjectMember } from '../../../src/middleware/auth';

describe('isProjectMember', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true for ADMIN without DB call', async () => {
    const result = await isProjectMember('user-1', 'project-1', PermissionLevel.ADMIN);

    expect(result).toBe(true);
    expect(prisma.projectMember.findUnique).not.toHaveBeenCalled();
  });

  it('should return true when user is a project member', async () => {
    (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue({
      projectId: 'project-1',
      employeeId: 'user-1',
    });

    const result = await isProjectMember('user-1', 'project-1', PermissionLevel.EMPLOYEE);

    expect(result).toBe(true);
    expect(prisma.projectMember.findUnique).toHaveBeenCalledWith({
      where: {
        projectId_employeeId: {
          projectId: 'project-1',
          employeeId: 'user-1',
        },
      },
    });
  });

  it('should return false when user is not a project member', async () => {
    (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await isProjectMember('user-1', 'project-1', PermissionLevel.EMPLOYEE);

    expect(result).toBe(false);
  });

  it('should return true for PM who is a member', async () => {
    (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue({
      projectId: 'project-1',
      employeeId: 'pm-user',
    });

    const result = await isProjectMember('pm-user', 'project-1', PermissionLevel.PM);

    expect(result).toBe(true);
    expect(prisma.projectMember.findUnique).toHaveBeenCalled();
  });

  it('should return false for PM who is not a member', async () => {
    (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await isProjectMember('pm-user', 'project-1', PermissionLevel.PM);

    expect(result).toBe(false);
  });

  it('should return true for EMPLOYEE who is a member', async () => {
    (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue({
      projectId: 'project-2',
      employeeId: 'emp-user',
    });

    const result = await isProjectMember('emp-user', 'project-2', PermissionLevel.EMPLOYEE);

    expect(result).toBe(true);
  });
});
