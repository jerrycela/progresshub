import { PrismaClient, PermissionLevel, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Department → FunctionType mapping (matches frontend mock)
const departmentToFunctionType: Record<string, string> = {
  ART: "ART",
  PROGRAMMING: "PROGRAMMING",
  PLANNING: "PLANNING",
  QA: "PLANNING",
  SOUND: "SOUND",
  MANAGEMENT: "PLANNING",
};

const functionTypeOverrides: Record<string, string> = {
  "emp-1": "PROGRAMMING",
  "emp-11": "ANIMATION",
};

async function main() {
  console.log("Seeding database...");

  // ============================================
  // Employees
  // ============================================
  const employees = [
    {
      id: "emp-1",
      name: "王小明",
      email: "wang@company.com",
      department: "ART",
      permissionLevel: PermissionLevel.EMPLOYEE,
      functionType: "PROGRAMMING",
    },
    {
      id: "emp-2",
      name: "林小美",
      email: "lin@company.com",
      department: "ART",
      permissionLevel: PermissionLevel.EMPLOYEE,
      functionType: "ART",
    },
    {
      id: "emp-3",
      name: "張大華",
      email: "zhang@company.com",
      department: "ART",
      permissionLevel: PermissionLevel.MANAGER,
      functionType: "ART",
    },
    {
      id: "emp-4",
      name: "陳志明",
      email: "chen@company.com",
      department: "PROGRAMMING",
      permissionLevel: PermissionLevel.EMPLOYEE,
      functionType: "PROGRAMMING",
    },
    {
      id: "emp-5",
      name: "李小龍",
      email: "li@company.com",
      department: "PROGRAMMING",
      permissionLevel: PermissionLevel.MANAGER,
      functionType: "PROGRAMMING",
    },
    {
      id: "emp-6",
      name: "黃美玲",
      email: "huang@company.com",
      department: "PLANNING",
      permissionLevel: PermissionLevel.PM,
      functionType: "PLANNING",
    },
    {
      id: "emp-7",
      name: "吳建國",
      email: "wu@company.com",
      department: "PLANNING",
      permissionLevel: PermissionLevel.PRODUCER,
      functionType: "PLANNING",
    },
    {
      id: "emp-8",
      name: "劉小芳",
      email: "liu@company.com",
      department: "QA",
      permissionLevel: PermissionLevel.EMPLOYEE,
      functionType: "PLANNING",
    },
    {
      id: "emp-9",
      name: "李美玲",
      email: "meiling@company.com",
      department: "ART",
      permissionLevel: PermissionLevel.EMPLOYEE,
      functionType: "ART",
    },
    {
      id: "emp-10",
      name: "張大偉",
      email: "dawei@company.com",
      department: "PLANNING",
      permissionLevel: PermissionLevel.PM,
      functionType: "PLANNING",
    },
    {
      id: "emp-11",
      name: "陳志豪",
      email: "zhihao@company.com",
      department: "ART",
      permissionLevel: PermissionLevel.EMPLOYEE,
      functionType: "ANIMATION",
    },
    {
      id: "emp-12",
      name: "林雅婷",
      email: "yating@company.com",
      department: "MANAGEMENT",
      permissionLevel: PermissionLevel.MANAGER,
      functionType: "PLANNING",
    },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { id: emp.id },
      update: {},
      create: {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        department: emp.department,
        permissionLevel: emp.permissionLevel,
        functionType: emp.functionType,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`,
        isActive: true,
      },
    });
  }
  console.log(`  Created ${employees.length} employees`);

  // ============================================
  // Projects
  // ============================================
  const projects = [
    {
      id: "proj-1",
      name: "魔法王國 Online",
      description: "大型多人線上角色扮演遊戲",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2026-06-30"),
      createdById: "emp-6",
    },
    {
      id: "proj-2",
      name: "星際戰艦",
      description: "太空策略遊戲",
      startDate: new Date("2025-06-01"),
      endDate: new Date("2026-12-31"),
      createdById: "emp-6",
    },
    {
      id: "proj-3",
      name: "賽車狂飆",
      description: "競速賽車遊戲",
      startDate: new Date("2025-03-01"),
      endDate: new Date("2025-12-31"),
      createdById: "emp-6",
    },
    {
      id: "proj-4",
      name: "新手教學系統",
      description: "開發新手引導與教學關卡",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-04-30"),
      createdById: "emp-10",
    },
    {
      id: "proj-5",
      name: "PVP 對戰系統",
      description: "玩家對戰系統開發",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-05-15"),
      createdById: "emp-10",
    },
    {
      id: "proj-6",
      name: "UI 改版計畫",
      description: "全面更新遊戲 UI 設計",
      startDate: new Date("2026-02-15"),
      endDate: new Date("2026-03-31"),
      createdById: "emp-10",
    },
  ];

  for (const proj of projects) {
    await prisma.project.upsert({
      where: { id: proj.id },
      update: {},
      create: proj,
    });
  }
  console.log(`  Created ${projects.length} projects`);

  // ============================================
  // Tasks
  // ============================================
  const tasks: Array<{
    id: string;
    projectId: string;
    name: string;
    description?: string;
    status: TaskStatus;
    progressPercentage: number;
    functionTags: string[];
    assignedToId?: string;
    creatorId?: string;
    plannedStartDate?: Date;
    plannedEndDate?: Date;
    dependencies?: string[];
    priority?: string;
    pauseReason?: string;
    pauseNote?: string;
    pausedAt?: Date;
    closedAt?: Date;
    collaborators?: string[];
  }> = [
    {
      id: "task-1",
      projectId: "proj-1",
      name: "設計主角立繪",
      description: "設計魔法王國主角的全身立繪，包含三套服裝",
      status: TaskStatus.UNCLAIMED,
      progressPercentage: 0,
      functionTags: ["ART"],
      creatorId: "emp-6",
      plannedStartDate: new Date("2026-02-01"),
      plannedEndDate: new Date("2026-02-15"),
    },
    {
      id: "task-2",
      projectId: "proj-1",
      name: "UI 介面設計",
      description: "設計遊戲主選單和背包介面",
      status: TaskStatus.UNCLAIMED,
      progressPercentage: 0,
      functionTags: ["ART"],
      creatorId: "emp-7",
      plannedStartDate: new Date("2026-02-05"),
      plannedEndDate: new Date("2026-02-20"),
    },
    {
      id: "task-3",
      projectId: "proj-2",
      name: "戰鬥系統開發",
      description: "開發太空戰鬥的核心邏輯",
      status: TaskStatus.IN_PROGRESS,
      progressPercentage: 25,
      functionTags: ["PROGRAMMING"],
      assignedToId: "emp-4",
      creatorId: "emp-5",
      plannedStartDate: new Date("2026-02-01"),
      plannedEndDate: new Date("2026-03-15"),
      collaborators: ["emp-5"],
    },
    {
      id: "task-4",
      projectId: "proj-1",
      name: "音效製作 - 戰鬥場景",
      description: "製作戰鬥場景的背景音樂和音效",
      status: TaskStatus.IN_PROGRESS,
      progressPercentage: 60,
      functionTags: ["SOUND"],
      assignedToId: "emp-1",
      creatorId: "emp-3",
      plannedStartDate: new Date("2026-02-10"),
      plannedEndDate: new Date("2026-02-28"),
    },
    {
      id: "task-5",
      projectId: "proj-3",
      name: "賽車模型建模",
      description: "建立 10 款賽車的 3D 模型",
      status: TaskStatus.IN_PROGRESS,
      progressPercentage: 80,
      functionTags: ["ART"],
      assignedToId: "emp-2",
      creatorId: "emp-2",
      plannedStartDate: new Date("2026-01-15"),
      plannedEndDate: new Date("2026-02-15"),
    },
    {
      id: "task-6",
      projectId: "proj-1",
      name: "測試關卡一",
      description: "測試第一關卡的所有功能",
      status: TaskStatus.UNCLAIMED,
      progressPercentage: 0,
      functionTags: ["PLANNING"],
      creatorId: "emp-6",
      plannedStartDate: new Date("2026-02-15"),
      plannedEndDate: new Date("2026-02-25"),
      dependencies: ["task-3"],
    },
    {
      id: "task-7",
      projectId: "proj-4",
      name: "實作新手教學流程邏輯",
      description: "根據企劃文件實作新手教學的程式邏輯",
      status: TaskStatus.IN_PROGRESS,
      progressPercentage: 65,
      functionTags: ["PROGRAMMING"],
      assignedToId: "emp-1",
      creatorId: "emp-10",
      plannedStartDate: new Date("2026-02-05"),
      plannedEndDate: new Date("2026-02-20"),
      dependencies: ["task-14"],
    },
    {
      id: "task-8",
      projectId: "proj-4",
      name: "新手教學 UI 設計",
      description: "設計新手教學介面與圖示",
      status: TaskStatus.CLAIMED,
      progressPercentage: 30,
      functionTags: ["ART"],
      assignedToId: "emp-9",
      creatorId: "emp-10",
      plannedStartDate: new Date("2026-02-10"),
      plannedEndDate: new Date("2026-02-25"),
      dependencies: ["task-14", "task-7"],
    },
    {
      id: "task-9",
      projectId: "proj-5",
      name: "PVP 匹配系統開發",
      description: "開發玩家配對演算法與後端 API",
      status: TaskStatus.UNCLAIMED,
      progressPercentage: 0,
      functionTags: ["PROGRAMMING"],
      creatorId: "emp-10",
      plannedStartDate: new Date("2026-02-15"),
      plannedEndDate: new Date("2026-03-15"),
    },
    {
      id: "task-10",
      projectId: "proj-5",
      name: "PVP 戰鬥特效製作",
      description: "製作 PVP 模式專屬技能特效",
      status: TaskStatus.UNCLAIMED,
      progressPercentage: 0,
      functionTags: ["VFX", "ART"],
      creatorId: "emp-10",
      plannedStartDate: new Date("2026-02-20"),
      plannedEndDate: new Date("2026-03-20"),
      dependencies: ["task-9"],
    },
    {
      id: "task-11",
      projectId: "proj-6",
      name: "主選單 UI 重新設計",
      description: "重新設計主選單介面",
      status: TaskStatus.DONE,
      progressPercentage: 100,
      functionTags: ["ART"],
      assignedToId: "emp-9",
      creatorId: "emp-10",
      plannedStartDate: new Date("2026-02-15"),
      plannedEndDate: new Date("2026-02-28"),
      closedAt: new Date("2026-02-25"),
    },
    {
      id: "task-12",
      projectId: "proj-6",
      name: "角色動畫優化",
      description: "優化角色移動與攻擊動畫",
      status: TaskStatus.IN_PROGRESS,
      progressPercentage: 45,
      functionTags: ["ANIMATION"],
      assignedToId: "emp-11",
      creatorId: "emp-10",
      plannedStartDate: new Date("2026-02-20"),
      plannedEndDate: new Date("2026-03-10"),
    },
    {
      id: "task-13",
      projectId: "proj-5",
      name: "背景音樂製作",
      description: "製作 PVP 戰鬥場景背景音樂",
      status: TaskStatus.UNCLAIMED,
      progressPercentage: 0,
      functionTags: ["SOUND"],
      creatorId: "emp-10",
      plannedStartDate: new Date("2026-03-01"),
      plannedEndDate: new Date("2026-03-25"),
      dependencies: ["task-9"],
    },
    {
      id: "task-14",
      projectId: "proj-4",
      name: "新手教學企劃文件",
      description: "撰寫新手教學流程與文案",
      status: TaskStatus.DONE,
      progressPercentage: 100,
      functionTags: ["PLANNING"],
      assignedToId: "emp-10",
      creatorId: "emp-10",
      plannedStartDate: new Date("2026-02-01"),
      plannedEndDate: new Date("2026-02-10"),
      closedAt: new Date("2026-02-08"),
    },
    {
      id: "task-15",
      projectId: "proj-4",
      name: "API 串接 - 用戶系統",
      description: "串接後端用戶登入與註冊 API",
      status: TaskStatus.PAUSED,
      progressPercentage: 40,
      functionTags: ["PROGRAMMING"],
      assignedToId: "emp-1",
      creatorId: "emp-10",
      plannedStartDate: new Date("2026-02-15"),
      plannedEndDate: new Date("2026-03-05"),
      pauseReason: "WAITING_TASK",
      pauseNote: "等待後端 API 完成，預計下週可繼續",
      pausedAt: new Date("2026-02-28T10:00:00Z"),
    },
  ];

  for (const task of tasks) {
    await prisma.task.upsert({
      where: { id: task.id },
      update: {},
      create: {
        id: task.id,
        projectId: task.projectId,
        name: task.name,
        description: task.description,
        status: task.status,
        progressPercentage: task.progressPercentage,
        functionTags: task.functionTags,
        assignedToId: task.assignedToId,
        creatorId: task.creatorId,
        plannedStartDate: task.plannedStartDate,
        plannedEndDate: task.plannedEndDate,
        dependencies: task.dependencies ?? [],
        collaborators: task.collaborators ?? [],
        priority: task.priority ?? "MEDIUM",
        pauseReason: task.pauseReason,
        pauseNote: task.pauseNote,
        pausedAt: task.pausedAt,
        closedAt: task.closedAt,
      },
    });
  }
  console.log(`  Created ${tasks.length} tasks`);

  // ============================================
  // Milestones
  // ============================================
  const milestones = [
    {
      id: "ms-1",
      projectId: "proj-1",
      name: "Alpha 測試",
      description: "內部功能測試版本",
      targetDate: new Date("2026-02-15"),
      color: "#F59E0B",
      createdById: "emp-7",
    },
    {
      id: "ms-2",
      projectId: "proj-1",
      name: "Beta 測試",
      description: "外部測試版本",
      targetDate: new Date("2026-03-01"),
      color: "#3B82F6",
      createdById: "emp-7",
    },
    {
      id: "ms-3",
      projectId: "proj-1",
      name: "正式上線",
      description: "遊戲正式發布",
      targetDate: new Date("2026-03-15"),
      color: "#10B981",
      createdById: "emp-3",
    },
    {
      id: "ms-4",
      projectId: "proj-2",
      name: "戰鬥系統完成",
      description: "核心戰鬥機制開發完成",
      targetDate: new Date("2026-02-20"),
      color: "#EF4444",
      createdById: "emp-5",
    },
  ];

  for (const ms of milestones) {
    await prisma.milestone.upsert({
      where: { id: ms.id },
      update: {},
      create: ms,
    });
  }
  console.log(`  Created ${milestones.length} milestones`);

  // ============================================
  // Task Notes
  // ============================================
  const taskNotes = [
    {
      id: "note-1",
      taskId: "task-3",
      content: "請注意這個功能需要和後端 API 同步，建議先確認 API 規格",
      authorId: "emp-5",
      authorName: "李小龍",
      authorRole: "MANAGER",
      createdAt: new Date("2026-02-03T10:00:00Z"),
    },
    {
      id: "note-2",
      taskId: "task-3",
      content: "已與後端確認 API 規格，可以開始實作",
      authorId: "emp-6",
      authorName: "黃美玲",
      authorRole: "PM",
      createdAt: new Date("2026-02-03T14:30:00Z"),
    },
    {
      id: "note-3",
      taskId: "task-4",
      content: "音效風格請參考魔法王國世界觀設定文件",
      authorId: "emp-7",
      authorName: "吳建國",
      authorRole: "PRODUCER",
      createdAt: new Date("2026-02-01T09:00:00Z"),
    },
  ];

  for (const note of taskNotes) {
    await prisma.taskNote.upsert({
      where: { id: note.id },
      update: {},
      create: note,
    });
  }
  console.log(`  Created ${taskNotes.length} task notes`);

  // ============================================
  // Progress Logs (sample data)
  // ============================================
  const progressLogs = [
    {
      id: "pl-1",
      taskId: "task-3",
      employeeId: "emp-4",
      progressPercentage: 10,
      reportType: "PROGRESS",
      progressDelta: 10,
      notes: "完成戰鬥系統基礎架構設計",
      reportedAt: new Date("2026-02-03T09:00:00Z"),
    },
    {
      id: "pl-2",
      taskId: "task-3",
      employeeId: "emp-4",
      progressPercentage: 25,
      reportType: "PROGRESS",
      progressDelta: 15,
      notes: "完成基礎攻擊邏輯",
      reportedAt: new Date("2026-02-07T17:00:00Z"),
    },
    {
      id: "pl-3",
      taskId: "task-4",
      employeeId: "emp-1",
      progressPercentage: 30,
      reportType: "PROGRESS",
      progressDelta: 30,
      notes: "完成戰鬥音效素材收集",
      reportedAt: new Date("2026-02-12T16:00:00Z"),
    },
    {
      id: "pl-4",
      taskId: "task-4",
      employeeId: "emp-1",
      progressPercentage: 60,
      reportType: "PROGRESS",
      progressDelta: 30,
      notes: "完成背景音樂初版混音",
      reportedAt: new Date("2026-02-15T14:00:00Z"),
    },
    {
      id: "pl-5",
      taskId: "task-5",
      employeeId: "emp-2",
      progressPercentage: 80,
      reportType: "PROGRESS",
      progressDelta: 20,
      notes: "完成 8 款賽車模型",
      reportedAt: new Date("2026-02-10T11:00:00Z"),
    },
    {
      id: "pl-6",
      taskId: "task-7",
      employeeId: "emp-1",
      progressPercentage: 65,
      reportType: "PROGRESS",
      progressDelta: 25,
      notes: "完成新手教學觸發與流程控制",
      reportedAt: new Date("2026-02-12T15:00:00Z"),
    },
    {
      id: "pl-7",
      taskId: "task-11",
      employeeId: "emp-9",
      progressPercentage: 100,
      reportType: "COMPLETE",
      progressDelta: 30,
      notes: "主選單 UI 設計完成，已交付審核",
      reportedAt: new Date("2026-02-25T10:00:00Z"),
    },
    {
      id: "pl-8",
      taskId: "task-12",
      employeeId: "emp-11",
      progressPercentage: 45,
      reportType: "PROGRESS",
      progressDelta: 20,
      notes: "完成角色移動動畫優化",
      reportedAt: new Date("2026-03-01T09:00:00Z"),
    },
  ];

  for (const pl of progressLogs) {
    await prisma.progressLog.upsert({
      where: { id: pl.id },
      update: {},
      create: pl,
    });
  }
  console.log(`  Created ${progressLogs.length} progress logs`);

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
