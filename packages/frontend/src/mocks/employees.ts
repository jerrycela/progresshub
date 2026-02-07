import type { User, UserRole, Department, FunctionType, MockEmployee } from 'shared/types'

// ============================================
// 員工資料（主要人員列表）
// emp-1~8 來自 taskPool，emp-9~12 來自 data.ts 獨有人員
// ============================================
export const mockEmployees: MockEmployee[] = [
  {
    id: 'emp-1',
    name: '王小明',
    email: 'wang@company.com',
    department: 'ART',
    userRole: 'EMPLOYEE',
  },
  {
    id: 'emp-2',
    name: '林小美',
    email: 'lin@company.com',
    department: 'ART',
    userRole: 'EMPLOYEE',
  },
  {
    id: 'emp-3',
    name: '張大華',
    email: 'zhang@company.com',
    department: 'ART',
    userRole: 'MANAGER',
  },
  {
    id: 'emp-4',
    name: '陳志明',
    email: 'chen@company.com',
    department: 'PROGRAMMING',
    userRole: 'EMPLOYEE',
  },
  {
    id: 'emp-5',
    name: '李小龍',
    email: 'li@company.com',
    department: 'PROGRAMMING',
    userRole: 'MANAGER',
  },
  {
    id: 'emp-6',
    name: '黃美玲',
    email: 'huang@company.com',
    department: 'PLANNING',
    userRole: 'PM',
  },
  {
    id: 'emp-7',
    name: '吳建國',
    email: 'wu@company.com',
    department: 'PLANNING',
    userRole: 'PRODUCER',
  },
  { id: 'emp-8', name: '劉小芳', email: 'liu@company.com', department: 'QA', userRole: 'EMPLOYEE' },
  {
    id: 'emp-9',
    name: '李美玲',
    email: 'meiling@company.com',
    department: 'ART',
    userRole: 'EMPLOYEE',
  },
  {
    id: 'emp-10',
    name: '張大偉',
    email: 'dawei@company.com',
    department: 'PLANNING',
    userRole: 'PM',
  },
  {
    id: 'emp-11',
    name: '陳志豪',
    email: 'zhihao@company.com',
    department: 'ART',
    userRole: 'EMPLOYEE',
  },
  {
    id: 'emp-12',
    name: '林雅婷',
    email: 'yating@company.com',
    department: 'MANAGEMENT',
    userRole: 'MANAGER',
  },
]

// ============================================
// UserRole 直接透傳（不再需要 Role 對照）
// ============================================
export const userRoleToRole = (userRole: string): string => {
  return userRole || 'EMPLOYEE'
}

export const departmentToFunctionType = (dept: Department): FunctionType => {
  const map: Record<Department, FunctionType> = {
    ART: 'ART',
    PROGRAMMING: 'PROGRAMMING',
    PLANNING: 'PLANNING',
    QA: 'PLANNING',
    SOUND: 'SOUND',
    MANAGEMENT: 'PLANNING',
  }
  return map[dept]
}

// 特殊覆蓋：某些員工的 functionType 不同於部門預設
export const functionTypeOverrides: Record<string, FunctionType> = {
  'emp-1': 'PROGRAMMING', // 王小明原為 PROGRAMMING
  'emp-11': 'ANIMATION', // 陳志豪原為 ANIMATION
}

// ============================================
// 使用者資料（從員工衍生，符合 User 介面）
// ============================================
export const mockUsers: User[] = mockEmployees.map(emp => ({
  id: emp.id,
  name: emp.name,
  email: emp.email,
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`,
  role: userRoleToRole(emp.userRole) as UserRole,
  functionType: functionTypeOverrides[emp.id] || departmentToFunctionType(emp.department),
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}))

// 當前登入使用者
export const mockCurrentUser: User = mockUsers[0]

// 員工 → User 快速查找
const userMap = new Map(mockUsers.map(u => [u.id, u]))
export const getUserRef = (id: string) => userMap.get(id)
