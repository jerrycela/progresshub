import prisma from "../config/database";
import { Employee, PermissionLevel, Prisma } from "@prisma/client";

export interface CreateEmployeeDto {
  name: string;
  email: string;
  slackUserId?: string;
  department?: string;
  permissionLevel?: PermissionLevel;
  functionType?: string;
}

export interface UpdateEmployeeDto {
  name?: string;
  email?: string;
  department?: string;
  permissionLevel?: PermissionLevel;
  managedProjects?: string[];
}

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  department?: string;
  permissionLevel?: PermissionLevel;
  search?: string;
}

export class EmployeeService {
  /**
   * 取得員工列表（分頁）
   */
  async getEmployees(
    params: EmployeeListParams,
  ): Promise<{ data: Employee[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      department,
      permissionLevel,
      search,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeWhereInput = { isActive: true };

    if (department) {
      where.department = department;
    }
    if (permissionLevel) {
      where.permissionLevel = permissionLevel;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.employee.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * 取得單一員工
   */
  async getEmployeeById(id: string): Promise<Employee | null> {
    return prisma.employee.findUnique({
      where: { id },
      include: {
        assignedTasks: {
          include: { project: true },
        },
      },
    });
  }

  /**
   * 建立員工
   */
  async createEmployee(data: CreateEmployeeDto): Promise<Employee> {
    return prisma.employee.create({
      data: {
        name: data.name,
        email: data.email,
        slackUserId: data.slackUserId,
        department: data.department,
        permissionLevel: data.permissionLevel || PermissionLevel.EMPLOYEE,
      },
    });
  }

  /**
   * 更新員工
   */
  async updateEmployee(id: string, data: UpdateEmployeeDto): Promise<Employee> {
    return prisma.employee.update({
      where: { id },
      data,
    });
  }

  /**
   * 軟刪除員工（設定 isActive = false）
   */
  async softDeleteEmployee(id: string): Promise<void> {
    await prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * 檢查 Email 是否已存在
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const employee = await prisma.employee.findUnique({
      where: { email },
    });
    return employee !== null && employee.id !== excludeId;
  }

  /**
   * 檢查 Slack User ID 是否已存在
   */
  async slackUserIdExists(
    slackUserId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const employee = await prisma.employee.findUnique({
      where: { slackUserId },
    });
    return employee !== null && employee.id !== excludeId;
  }
}

export const employeeService = new EmployeeService();
