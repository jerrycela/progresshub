import { Employee } from "@prisma/client";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  slackId?: string;
  role: string;
  functionType?: string;
  isActive?: boolean;
  lastActiveAt?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export function toUserDTO(emp: Employee): UserDTO {
  return {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    avatar: emp.avatarUrl ?? undefined,
    slackId: emp.slackUserId ?? undefined,
    role: emp.permissionLevel,
    functionType: emp.functionType ?? undefined,
    isActive: emp.isActive,
    lastActiveAt: emp.lastActiveAt?.toISOString(),
    department: emp.department ?? undefined,
    createdAt: emp.createdAt.toISOString(),
    updatedAt: emp.updatedAt.toISOString(),
  };
}

export function toUserRef(
  emp: { id: string; name: string; email?: string } | null | undefined,
): { id: string; name: string; email?: string } | undefined {
  if (!emp) return undefined;
  return {
    id: emp.id,
    name: emp.name,
    email: emp.email,
  };
}
