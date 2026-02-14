import { Project } from "@prisma/client";

export interface ProjectDTO {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export function toProjectDTO(proj: Project): ProjectDTO {
  return {
    id: proj.id,
    name: proj.name,
    description: proj.description ?? undefined,
    status: proj.status,
    startDate: proj.startDate.toISOString(),
    endDate: proj.endDate?.toISOString(),
    createdById: proj.createdById ?? undefined,
    createdAt: proj.createdAt.toISOString(),
    updatedAt: proj.updatedAt.toISOString(),
  };
}

export function toProjectRef(
  proj: { id: string; name: string; status?: string } | null | undefined,
): { id: string; name: string; status?: string } | undefined {
  if (!proj) return undefined;
  return {
    id: proj.id,
    name: proj.name,
    status: proj.status,
  };
}
