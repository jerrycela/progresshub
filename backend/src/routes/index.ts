import { Router } from "express";
import authRoutes from "./auth";
import employeeRoutes from "./employees";
import projectRoutes from "./projects";
import taskRoutes from "./tasks";
import progressRoutes from "./progress";
import timeEntryRoutes from "./timeEntries";
import timeCategoryRoutes from "./timeCategories";
import timeStatsRoutes from "./timeStats";
import milestoneRoutes from "./milestones";
import gitlabRoutes from "./gitlab";
import dashboardRoutes from "./dashboard";
import userSettingsRoutes from "./userSettings";
import slackRoutes from "./slack";
import { sendSuccess } from "../utils/response";
import { env } from "../config/env";

const router = Router();

// API Routes
router.use("/auth", authRoutes);
router.use("/employees", employeeRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/progress", progressRoutes);
router.use("/milestones", milestoneRoutes);
router.use("/time-entries", timeEntryRoutes);
router.use("/time-categories", timeCategoryRoutes);
router.use("/time-stats", timeStatsRoutes);
router.use("/gitlab", gitlabRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/user", userSettingsRoutes);

// Slack 路由同步掛載（條件式啟用）
if (env.SLACK_BOT_TOKEN) {
  router.use("/slack", slackRoutes);
}

// API Info（僅開發環境顯示完整端點列表，生產環境隱藏）
router.get("/", (_req, res) => {
  const info: Record<string, unknown> = {
    name: "ProgressHub API",
    version: "1.0.0",
  };

  if (env.NODE_ENV === "development") {
    info.endpoints = {
      auth: "/api/auth",
      employees: "/api/employees",
      projects: "/api/projects",
      tasks: "/api/tasks",
      progress: "/api/progress",
      milestones: "/api/milestones",
      timeEntries: "/api/time-entries",
      timeCategories: "/api/time-categories",
      timeStats: "/api/time-stats",
      slack: "/api/slack",
      gitlab: "/api/gitlab",
      dashboard: "/api/dashboard",
      user: "/api/user",
    };
  }

  sendSuccess(res, info);
});

export default router;
