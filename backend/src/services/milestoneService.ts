import prisma from "../config/database";
import { Milestone, Prisma } from "@prisma/client";

type MilestoneWithCreator = Milestone & {
  createdBy?: { id: string; name: string } | null;
};

export class MilestoneService {
  async getMilestones(projectId?: string): Promise<MilestoneWithCreator[]> {
    const where: Prisma.MilestoneWhereInput = {};
    if (projectId) {
      where.projectId = projectId;
    }

    return prisma.milestone.findMany({
      where,
      orderBy: { targetDate: "asc" },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async getMilestoneById(id: string): Promise<MilestoneWithCreator | null> {
    return prisma.milestone.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async createMilestone(data: {
    projectId: string;
    name: string;
    description?: string;
    targetDate: Date;
    color?: string;
    createdById: string;
  }): Promise<MilestoneWithCreator> {
    return prisma.milestone.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        targetDate: data.targetDate,
        color: data.color,
        createdById: data.createdById,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async deleteMilestone(id: string): Promise<void> {
    await prisma.milestone.delete({ where: { id } });
  }
}

export const milestoneService = new MilestoneService();
