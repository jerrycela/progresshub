// Mock database
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    milestone: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import prisma from '../../../src/config/database';
import { MilestoneService } from '../../../src/services/milestoneService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('MilestoneService', () => {
  const service = new MilestoneService();

  const mockMilestone = {
    id: 'ms-001',
    projectId: 'proj-001',
    name: '第一個里程碑',
    description: 'Alpha 版本發布',
    targetDate: new Date('2026-03-01'),
    color: '#FF0000',
    createdById: 'emp-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: { id: 'emp-001', name: '建立者' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMilestones', () => {
    it('應回傳所有里程碑', async () => {
      (mockedPrisma.milestone.findMany as jest.Mock).mockResolvedValue([mockMilestone]);

      const result = await service.getMilestones();

      expect(result).toEqual([mockMilestone]);
      expect(mockedPrisma.milestone.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { targetDate: 'asc' },
        include: { createdBy: { select: { id: true, name: true } } },
      });
    });

    it('應根據 projectId 篩選', async () => {
      (mockedPrisma.milestone.findMany as jest.Mock).mockResolvedValue([]);

      await service.getMilestones('proj-001');

      expect(mockedPrisma.milestone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 'proj-001' },
        }),
      );
    });
  });

  describe('getMilestoneById', () => {
    it('應回傳含建立者的里程碑', async () => {
      (mockedPrisma.milestone.findUnique as jest.Mock).mockResolvedValue(mockMilestone);

      const result = await service.getMilestoneById('ms-001');

      expect(result).toEqual(mockMilestone);
    });

    it('不存在時回傳 null', async () => {
      (mockedPrisma.milestone.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getMilestoneById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createMilestone', () => {
    it('應建立里程碑', async () => {
      (mockedPrisma.milestone.create as jest.Mock).mockResolvedValue(mockMilestone);

      const result = await service.createMilestone({
        projectId: 'proj-001',
        name: '第一個里程碑',
        targetDate: new Date('2026-03-01'),
        createdById: 'emp-001',
        color: '#FF0000',
      });

      expect(result).toEqual(mockMilestone);
      expect(mockedPrisma.milestone.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 'proj-001',
          name: '第一個里程碑',
          color: '#FF0000',
        }),
        include: { createdBy: { select: { id: true, name: true } } },
      });
    });
  });

  describe('deleteMilestone', () => {
    it('應刪除里程碑', async () => {
      (mockedPrisma.milestone.delete as jest.Mock).mockResolvedValue(mockMilestone);

      await service.deleteMilestone('ms-001');

      expect(mockedPrisma.milestone.delete).toHaveBeenCalledWith({
        where: { id: 'ms-001' },
      });
    });
  });
});
