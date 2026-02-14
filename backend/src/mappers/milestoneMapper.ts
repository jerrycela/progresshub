import { Milestone, Employee } from "@prisma/client";

export interface MilestoneDTO {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  date: string;
  color?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
}

type MilestoneWithRelations = Milestone & {
  createdBy?: Partial<Employee> | null;
};

export function toMilestoneDTO(ms: MilestoneWithRelations): MilestoneDTO {
  return {
    id: ms.id,
    projectId: ms.projectId,
    name: ms.name,
    description: ms.description ?? undefined,
    date: ms.targetDate.toISOString(),
    color: ms.color ?? undefined,
    createdById: ms.createdById ?? undefined,
    createdByName: (ms.createdBy as { name?: string } | null)?.name,
    createdAt: ms.createdAt.toISOString(),
  };
}
