import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding project members from existing data...");

  // Collect unique (projectId, employeeId) pairs
  const pairs = new Map<string, { projectId: string; employeeId: string }>();

  // From task assignments
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { assignedToId: { not: null } },
        { collaborators: { isEmpty: false } },
      ],
    },
    select: { projectId: true, assignedToId: true, collaborators: true },
  });

  for (const t of tasks) {
    if (t.assignedToId) {
      const key = `${t.projectId}|${t.assignedToId}`;
      pairs.set(key, { projectId: t.projectId, employeeId: t.assignedToId });
    }
    for (const c of t.collaborators) {
      const key = `${t.projectId}|${c}`;
      pairs.set(key, { projectId: t.projectId, employeeId: c });
    }
  }

  // From managed projects
  const managers = await prisma.employee.findMany({
    where: { managedProjects: { isEmpty: false } },
    select: { id: true, managedProjects: true },
  });

  for (const m of managers) {
    for (const pid of m.managedProjects) {
      const key = `${pid}|${m.id}`;
      pairs.set(key, { projectId: pid, employeeId: m.id });
    }
  }

  const data = Array.from(pairs.values());
  console.log(`Found ${data.length} unique project-employee pairs`);

  const result = await prisma.projectMember.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(`Created ${result.count} new project member records`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
