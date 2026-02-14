import { ProgressLog, Employee } from "@prisma/client";
import { toUserRef } from "./employeeMapper";

export interface ProgressLogDTO {
  id: string;
  taskId: string;
  userId: string;
  user?: ReturnType<typeof toUserRef>;
  reportType: string;
  progress: number;
  progressDelta?: number;
  notes?: string;
  blockerReason?: string;
  reportedAt: string;
}

type ProgressLogWithRelations = ProgressLog & {
  employee?: Partial<Employee> | null;
};

export function toProgressLogDTO(
  log: ProgressLogWithRelations,
): ProgressLogDTO {
  return {
    id: log.id,
    taskId: log.taskId,
    userId: log.employeeId,
    user: toUserRef(log.employee as { id: string; name: string } | null),
    reportType: log.reportType,
    progress: log.progressPercentage,
    progressDelta: log.progressDelta ?? undefined,
    notes: log.notes ?? undefined,
    blockerReason: log.blockerReason ?? undefined,
    reportedAt: log.reportedAt.toISOString(),
  };
}
