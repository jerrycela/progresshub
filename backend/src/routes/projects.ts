import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { projectService } from "../services/projectService";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { requireProjectMember } from "../middleware/projectAuth";
import { auditLog } from "../middleware/auditLog";
import { Prisma } from "@prisma/client";
import { PermissionLevel, ProjectStatus } from "@prisma/client";
import logger from "../config/logger";
import {
  sendSuccess,
  sendPaginatedSuccess,
  sendError,
} from "../utils/response";
import { sanitizeBody } from "../middleware/sanitize";
import { toProjectDTO } from "../mappers";
import { ErrorCodes } from "../types/shared-api";
import projectMembersRouter from "./projectMembers";
import prisma from "../config/database";

const router = Router();

/**
 * GET /api/projects/names
 * Public endpoint: returns only ACTIVE project id + name for login page
 */
router.get(
  "/names",
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projects = await prisma.project.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      sendSuccess(res, projects);
    } catch (error) {
      logger.error("Get project names error:", error);
      sendError(
        res,
        ErrorCodes.PROJECTS_FETCH_FAILED,
        "Failed to get project names",
        500,
      );
    }
  },
);

// 所有以下路由都需要認證
router.use(authenticate);
router.use(sanitizeBody);

/**
 * GET /api/projects
 * 取得專案列表
 */
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("status").optional().isIn(["ACTIVE", "COMPLETED", "PAUSED"]),
    query("search").optional().isString().trim(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_FAILED,
        "Invalid input",
        400,
        errors.array(),
      );
      return;
    }

    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await projectService.getProjects({
        page,
        limit,
        status: req.query.status as ProjectStatus | undefined,
        search: req.query.search as string,
        userId: req.user!.userId,
        userRole: req.user!.permissionLevel,
      });

      // Batch-resolve createdByName since Project model has no createdBy relation
      const creatorIds = [
        ...new Set(
          result.data
            .map((p) => p.createdById)
            .filter((id): id is string => id !== null),
        ),
      ];
      const creators =
        creatorIds.length > 0
          ? await prisma.employee.findMany({
              where: { id: { in: creatorIds } },
              select: { id: true, name: true },
            })
          : [];
      const creatorMap = new Map(creators.map((c) => [c.id, c.name]));

      const dtos = result.data.map((p) => ({
        ...toProjectDTO(p),
        createdByName: p.createdById
          ? creatorMap.get(p.createdById)
          : undefined,
      }));

      sendPaginatedSuccess(res, dtos, {
        total: result.total,
        page,
        limit,
      });
    } catch (error) {
      logger.error("Get projects error:", error);
      sendError(
        res,
        ErrorCodes.PROJECTS_FETCH_FAILED,
        "Failed to get projects",
        500,
      );
    }
  },
);

/**
 * GET /api/projects/:id
 * 取得單一專案
 */
router.get(
  "/:id",
  requireProjectMember("id"),
  [param("id").isString().trim().notEmpty().withMessage("Invalid project ID")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_FAILED,
        "Invalid input",
        400,
        errors.array(),
      );
      return;
    }

    try {
      const project = await projectService.getProjectById(req.params.id);
      if (!project) {
        sendError(res, ErrorCodes.PROJECT_NOT_FOUND, "Project not found", 404);
        return;
      }

      sendSuccess(res, toProjectDTO(project));
    } catch (error) {
      logger.error("Get project error:", error);
      sendError(
        res,
        ErrorCodes.PROJECT_FETCH_FAILED,
        "Failed to get project",
        500,
      );
    }
  },
);

/**
 * GET /api/projects/:id/stats
 * 取得專案統計資訊
 */
router.get(
  "/:id/stats",
  requireProjectMember("id"),
  [param("id").isString().trim().notEmpty().withMessage("Invalid project ID")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_FAILED,
        "Invalid input",
        400,
        errors.array(),
      );
      return;
    }

    try {
      const stats = await projectService.getProjectStats(req.params.id);
      sendSuccess(res, stats);
    } catch (error) {
      logger.error("Get project stats error:", error);
      sendError(
        res,
        ErrorCodes.PROJECT_STATS_FAILED,
        "Failed to get project stats",
        500,
      );
    }
  },
);

/**
 * GET /api/projects/:id/gantt
 * 取得甘特圖資料
 */
router.get(
  "/:id/gantt",
  requireProjectMember("id"),
  [param("id").isString().trim().notEmpty().withMessage("Invalid project ID")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_FAILED,
        "Invalid input",
        400,
        errors.array(),
      );
      return;
    }

    try {
      const ganttData = await projectService.getGanttData(req.params.id);
      sendSuccess(res, ganttData);
    } catch (error) {
      logger.error("Get gantt data error:", error);
      sendError(
        res,
        ErrorCodes.GANTT_FETCH_FAILED,
        "Failed to get gantt data",
        500,
      );
    }
  },
);

// Mount project members sub-router
router.use("/:projectId/members", projectMembersRouter);

/**
 * POST /api/projects
 * 建立專案（PM 和 Admin）
 */
router.post(
  "/",
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  [
    body("name")
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name is required (max 100 chars)"),
    body("description")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 5000 })
      .withMessage("Description must be at most 5000 chars"),
    body("startDate").isISO8601().withMessage("Valid start date is required"),
    body("endDate").isISO8601().withMessage("Valid end date is required"),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_FAILED,
        "Invalid input",
        400,
        errors.array(),
      );
      return;
    }

    try {
      // 驗證結束日期必須在開始日期之後
      if (new Date(req.body.endDate) <= new Date(req.body.startDate)) {
        sendError(
          res,
          ErrorCodes.INVALID_DATE_RANGE,
          "End date must be after start date",
          400,
        );
        return;
      }

      const project = await projectService.createProject(req.body);
      sendSuccess(res, project, 201);
    } catch (error) {
      logger.error("Create project error:", error);
      sendError(
        res,
        ErrorCodes.PROJECT_CREATE_FAILED,
        "Failed to create project",
        500,
      );
    }
  },
);

/**
 * PUT /api/projects/:id
 * 更新專案（PM 和 Admin）
 */
router.put(
  "/:id",
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  requireProjectMember("id"),
  auditLog("UPDATE_PROJECT"),
  [
    param("id").isString().trim().notEmpty().withMessage("Invalid project ID"),
    body("name").optional().isString().trim().isLength({ min: 1, max: 100 }),
    body("description")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 5000 })
      .withMessage("Description must be at most 5000 chars"),
    body("startDate").optional().isISO8601(),
    body("endDate").optional().isISO8601(),
    body("status").optional().isIn(["ACTIVE", "COMPLETED", "PAUSED"]),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_FAILED,
        "Invalid input",
        400,
        errors.array(),
      );
      return;
    }

    try {
      const existing = await projectService.getProjectById(req.params.id);
      if (!existing) {
        sendError(res, ErrorCodes.PROJECT_NOT_FOUND, "Project not found", 404);
        return;
      }

      // 驗證日期（如果有更新）
      const startDate = req.body.startDate
        ? new Date(req.body.startDate)
        : existing.startDate;
      const endDate = req.body.endDate
        ? new Date(req.body.endDate)
        : existing.endDate;

      if (endDate <= startDate) {
        sendError(
          res,
          ErrorCodes.INVALID_DATE_RANGE,
          "End date must be after start date",
          400,
        );
        return;
      }

      const project = await projectService.updateProject(
        req.params.id,
        req.body,
      );
      sendSuccess(res, project);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        sendError(res, ErrorCodes.PROJECT_NOT_FOUND, "Project not found", 404);
        return;
      }
      logger.error("Update project error:", error);
      sendError(
        res,
        ErrorCodes.PROJECT_UPDATE_FAILED,
        "Failed to update project",
        500,
      );
    }
  },
);

/**
 * DELETE /api/projects/:id
 * 刪除專案（僅 Admin）
 */
router.delete(
  "/:id",
  authorize(PermissionLevel.ADMIN),
  requireProjectMember("id"),
  auditLog("DELETE_PROJECT"),
  [param("id").isString().trim().notEmpty().withMessage("Invalid project ID")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_FAILED,
        "Invalid input",
        400,
        errors.array(),
      );
      return;
    }

    try {
      const existing = await projectService.getProjectById(req.params.id);
      if (!existing) {
        sendError(res, ErrorCodes.PROJECT_NOT_FOUND, "Project not found", 404);
        return;
      }

      await projectService.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        sendError(res, ErrorCodes.PROJECT_NOT_FOUND, "Project not found", 404);
        return;
      }
      logger.error("Delete project error:", error);
      sendError(
        res,
        ErrorCodes.PROJECT_DELETE_FAILED,
        "Failed to delete project",
        500,
      );
    }
  },
);

export default router;
