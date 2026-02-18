// Mock database
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    timeCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
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
import { TimeCategoryService } from '../../../src/services/timeCategoryService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('TimeCategoryService', () => {
  const service = new TimeCategoryService();

  const mockCategory = {
    id: 'cat-001',
    name: '開發',
    color: '#3B82F6',
    billable: true,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('預設應只回傳活躍類別', async () => {
      (mockedPrisma.timeCategory.findMany as jest.Mock).mockResolvedValue([mockCategory]);

      const result = await service.getCategories();

      expect(result).toEqual([mockCategory]);
      expect(mockedPrisma.timeCategory.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    });

    it('includeInactive=true 應回傳所有類別', async () => {
      (mockedPrisma.timeCategory.findMany as jest.Mock).mockResolvedValue([mockCategory]);

      await service.getCategories(true);

      expect(mockedPrisma.timeCategory.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    });
  });

  describe('getCategoryById', () => {
    it('應回傳類別', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue(mockCategory);

      const result = await service.getCategoryById('cat-001');

      expect(result).toEqual(mockCategory);
    });
  });

  describe('createCategory', () => {
    it('應建立類別', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.timeCategory.create as jest.Mock).mockResolvedValue(mockCategory);

      await service.createCategory({ name: '開發' });

      expect(mockedPrisma.timeCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: '開發',
          color: '#3B82F6',
          billable: true,
          sortOrder: 0,
        }),
      });
    });

    it('名稱重複時應拋出錯誤', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue(mockCategory);

      await expect(
        service.createCategory({ name: '開發' }),
      ).rejects.toThrow('Category name already exists');
    });

    it('應使用自訂顏色和 billable', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.timeCategory.create as jest.Mock).mockResolvedValue(mockCategory);

      await service.createCategory({
        name: '會議',
        color: '#FF0000',
        billable: false,
        sortOrder: 5,
      });

      expect(mockedPrisma.timeCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          color: '#FF0000',
          billable: false,
          sortOrder: 5,
        }),
      });
    });
  });

  describe('updateCategory', () => {
    it('應更新類別', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (mockedPrisma.timeCategory.update as jest.Mock).mockResolvedValue(mockCategory);

      await service.updateCategory('cat-001', { color: '#FF0000' });

      expect(mockedPrisma.timeCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-001' },
        data: { color: '#FF0000' },
      });
    });

    it('類別不存在時應拋出錯誤', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateCategory('nonexistent', { color: '#FF0000' }),
      ).rejects.toThrow('Category not found');
    });

    it('更改名稱時應檢查重複', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockCategory) // 第一次：找到要更新的類別
        .mockResolvedValueOnce({ id: 'cat-002', name: '測試' }); // 第二次：找到同名類別

      await expect(
        service.updateCategory('cat-001', { name: '測試' }),
      ).rejects.toThrow('Category name already exists');
    });

    it('名稱相同（未更改）時不應檢查重複', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (mockedPrisma.timeCategory.update as jest.Mock).mockResolvedValue(mockCategory);

      await service.updateCategory('cat-001', { name: '開發' });

      // findUnique 只被呼叫一次（只查找要更新的類別）
      expect(mockedPrisma.timeCategory.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('deactivateCategory', () => {
    it('應停用類別', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (mockedPrisma.timeCategory.update as jest.Mock).mockResolvedValue({
        ...mockCategory,
        isActive: false,
      });

      await service.deactivateCategory('cat-001');

      expect(mockedPrisma.timeCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-001' },
        data: { isActive: false },
      });
    });

    it('類別不存在時應拋出錯誤', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deactivateCategory('nonexistent')).rejects.toThrow(
        'Category not found',
      );
    });
  });

  describe('activateCategory', () => {
    it('應啟用類別', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue({
        ...mockCategory,
        isActive: false,
      });
      (mockedPrisma.timeCategory.update as jest.Mock).mockResolvedValue(mockCategory);

      await service.activateCategory('cat-001');

      expect(mockedPrisma.timeCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-001' },
        data: { isActive: true },
      });
    });

    it('類別不存在時應拋出錯誤', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.activateCategory('nonexistent')).rejects.toThrow(
        'Category not found',
      );
    });
  });

  describe('deleteCategory', () => {
    it('無關聯工時記錄時應硬刪除', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue({
        ...mockCategory,
        _count: { timeEntries: 0 },
      });
      (mockedPrisma.timeCategory.delete as jest.Mock).mockResolvedValue(mockCategory);

      await service.deleteCategory('cat-001');

      expect(mockedPrisma.timeCategory.delete).toHaveBeenCalledWith({
        where: { id: 'cat-001' },
      });
    });

    it('有關聯工時記錄時應拋出錯誤', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue({
        ...mockCategory,
        _count: { timeEntries: 5 },
      });

      await expect(service.deleteCategory('cat-001')).rejects.toThrow(
        'Cannot delete category with existing time entries',
      );
    });

    it('類別不存在時應拋出錯誤', async () => {
      (mockedPrisma.timeCategory.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteCategory('nonexistent')).rejects.toThrow(
        'Category not found',
      );
    });
  });

  describe('initializeDefaultCategories', () => {
    it('應 upsert 6 個預設類別', async () => {
      (mockedPrisma.timeCategory.upsert as jest.Mock).mockResolvedValue(mockCategory);
      (mockedPrisma.timeCategory.findMany as jest.Mock).mockResolvedValue([mockCategory]);

      await service.initializeDefaultCategories();

      expect(mockedPrisma.timeCategory.upsert).toHaveBeenCalledTimes(6);
    });

    it('應包含正確的預設類別名稱', async () => {
      (mockedPrisma.timeCategory.upsert as jest.Mock).mockResolvedValue(mockCategory);
      (mockedPrisma.timeCategory.findMany as jest.Mock).mockResolvedValue([]);

      await service.initializeDefaultCategories();

      const upsertCalls = (mockedPrisma.timeCategory.upsert as jest.Mock).mock.calls;
      const names = upsertCalls.map((call: any[]) => call[0].where.name);
      expect(names).toEqual(['開發', '測試', '會議', '文件', '研究', '其他']);
    });
  });
});
