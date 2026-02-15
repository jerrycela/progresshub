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

// Conditionally mount Slack routes only when configured
if (env.SLACK_BOT_TOKEN) {
  import("./slack").then((slackRoutes) => {
    router.use("/slack", slackRoutes.default);
  });
}

// API Info
router.get("/", (_req, res) => {
  sendSuccess(res, {
    name: "ProgressHub API",
    version: "1.0.0",
    endpoints: {
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
    },
  });
});

export default router;
