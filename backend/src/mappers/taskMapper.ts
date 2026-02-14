import { Task, Employee, Project } from "@prisma/client";
import { toUserRef } from "./employeeMapper";
import { toProjectRef } from "./projectMapper";

export interface TaskDTO {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  progress: number;
  projectId: string;
  project?: ReturnType<typeof toProjectRef>;
  creatorId?: string;
  creator?: ReturnType<typeof toUserRef>;
  assigneeId?: string;
  assignee?: ReturnType<typeof toUserRef>;
  functionTags: string[];
  gitlabIssueId?: string;
  gitlabIssueUrl?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  blockerReason?: string;
  pauseReason?: string;
  pauseNote?: string;
  pausedAt?: string;
  dependsOnTaskIds?: string[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

type TaskWithRelations = Task & {
  project?: Partial<Project> | null;
  assignedTo?: Partial<Employee> | null;
  creator?: Partial<Employee> | null;
  gitlabIssueMapping?: { issueUrl: string; gitlabIssueId: number } | null;
};

export function toTaskDTO(task: TaskWithRelations): TaskDTO {
  return {
    id: task.id,
    title: task.name,
    description: task.description ?? undefined,
    status: task.status,
    priority: task.priority ?? undefined,
    progress: task.progressPercentage,
    projectId: task.projectId,
    project: toProjectRef(task.project as { id: string; name: string } | null),
    creatorId: task.creatorId ?? undefined,
    creator: toUserRef(task.creator as { id: string; name: string } | null),
    assigneeId: task.assignedToId ?? undefined,
    assignee: toUserRef(task.assignedTo as { id: string; name: string } | null),
    functionTags: task.functionTags,
    gitlabIssueId: task.gitlabIssueMapping?.gitlabIssueId?.toString(),
    gitlabIssueUrl: task.gitlabIssueMapping?.issueUrl,
    startDate: task.plannedStartDate?.toISOString(),
    dueDate: task.plannedEndDate?.toISOString(),
    estimatedHours: task.estimatedHours?.toNumber(),
    actualHours: task.actualHours?.toNumber(),
    blockerReason: task.blockerReason ?? undefined,
    pauseReason: task.pauseReason ?? undefined,
    pauseNote: task.pauseNote ?? undefined,
    pausedAt: task.pausedAt?.toISOString(),
    dependsOnTaskIds:
      task.dependencies.length > 0 ? task.dependencies : undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    closedAt: task.closedAt?.toISOString(),
  };
}
