import prisma from '../config/database';

export interface CreateTimeCategoryDto {
  name: string;
  color?: string;
  billable?: boolean;
  sortOrder?: number;
}

export interface UpdateTimeCategoryDto {
  name?: string;
  color?: string;
  billable?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export class TimeCategoryService {
  /**
   * 取得所有工時類別
   */
  async getCategories(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return prisma.timeCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * 取得單一工時類別
   */
  async getCategoryById(id: string) {
    return prisma.timeCategory.findUnique({
      where: { id },
    });
  }

  /**
   * 建立工時類別
   */
  async createCategory(data: CreateTimeCategoryDto) {
    // 檢查名稱是否已存在
    const existing = await prisma.timeCategory.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new Error('Category name already exists');
    }

    return prisma.timeCategory.create({
      data: {
        name: data.name,
        color: data.color || '#3B82F6',
        billable: data.billable ?? true,
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  /**
   * 更新工時類別
   */
  async updateCategory(id: string, data: UpdateTimeCategoryDto) {
    const existing = await prisma.timeCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Category not found');
    }

    // 如果更改名稱，檢查是否與其他類別重複
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.timeCategory.findUnique({
        where: { name: data.name },
      });
      if (duplicate) {
        throw new Error('Category name already exists');
      }
    }

    return prisma.timeCategory.update({
      where: { id },
      data,
    });
  }

  /**
   * 停用工時類別（軟刪除）
   */
  async deactivateCategory(id: string) {
    const existing = await prisma.timeCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Category not found');
    }

    return prisma.timeCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * 啟用工時類別
   */
  async activateCategory(id: string) {
    const existing = await prisma.timeCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Category not found');
    }

    return prisma.timeCategory.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * 刪除工時類別（硬刪除，需確認無關聯資料）
   */
  async deleteCategory(id: string) {
    const existing = await prisma.timeCategory.findUnique({
      where: { id },
      include: { _count: { select: { timeEntries: true } } },
    });

    if (!existing) {
      throw new Error('Category not found');
    }

    if (existing._count.timeEntries > 0) {
      throw new Error('Cannot delete category with existing time entries. Deactivate instead.');
    }

    await prisma.timeCategory.delete({ where: { id } });
  }

  /**
   * 初始化預設類別
   */
  async initializeDefaultCategories() {
    const defaultCategories = [
      { name: '開發', color: '#3B82F6', billable: true, sortOrder: 1 },
      { name: '測試', color: '#10B981', billable: true, sortOrder: 2 },
      { name: '會議', color: '#F59E0B', billable: true, sortOrder: 3 },
      { name: '文件', color: '#8B5CF6', billable: true, sortOrder: 4 },
      { name: '研究', color: '#EC4899', billable: true, sortOrder: 5 },
      { name: '其他', color: '#6B7280', billable: false, sortOrder: 99 },
    ];

    for (const category of defaultCategories) {
      await prisma.timeCategory.upsert({
        where: { name: category.name },
        update: {},
        create: category,
      });
    }

    return this.getCategories();
  }
}

export const timeCategoryService = new TimeCategoryService();
