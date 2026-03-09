import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import {
  authenticate,
  authorize,
  AuthRequest,
  isProjectMember,
} from "../middleware/auth";
import { PermissionLevel, Prisma } from "@prisma/client";
import { sendSuccess, sendError } from "../utils/response";
import { milestoneService } from "../services/milestoneService";
import { toMilestoneDTO } from "../mappers";
import { sanitizeBody } from "../middleware/sanitize";

import { ErrorCodes } from "../types/shared-api";
const router = Router();

router.use(authenticate);
router.use(sanitizeBody);

/**
 * GET /api/milestones
 * 取得里程碑列表（可依 projectId 篩選）
 */
router.get(
  "/",
  [query("projectId").optional().isString().trim()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projectId = req.query.projectId as string | undefined;

      // Project membership check when projectId is specified
      if (projectId) {
        if (
          !(await isProjectMember(
            req.user?.userId ?? "",
            projectId,
            req.user?.permissionLevel!,
          ))
        ) {
          sendError(
            res,
            ErrorCodes.PERM_DENIED,
            "Not a member of this project",
            403,
          );
          return;
        }
      }

      const milestones = await milestoneService.getMilestones(projectId);
      sendSuccess(res, milestones.map(toMilestoneDTO));
    } catch (error) {
      sendError(
        res,
        ErrorCodes.MILESTONES_FETCH_FAILED,
        "Failed to get milestones",
        500,
      );
    }
  },
);

/**
 * POST /api/milestones
 * 新增里程碑（PM, PRODUCER, ADMIN）
 */
router.post(
  "/",
  authorize(
    PermissionLevel.PM,
    PermissionLevel.PRODUCER,
    PermissionLevel.ADMIN,
  ),
  [
    body("projectId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Project ID is required"),
    body("name")
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Name is required"),
    body("description").optional().isString().trim(),
    body("date").isISO8601().withMessage("Valid date is required"),
    body("color").optional().isString().trim(),
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
      const milestone = await milestoneService.createMilestone({
        projectId: req.body.projectId,
        name: req.body.name,
        description: req.body.description,
        targetDate: new Date(req.body.date),
        color: req.body.color,
        createdById: req.user?.userId ?? "",
      });
      sendSuccess(res, toMilestoneDTO(milestone), 201);
    } catch (error) {
      sendError(
        res,
        ErrorCodes.MILESTONE_CREATE_FAILED,
        "Failed to create milestone",
        500,
      );
    }
  },
);

/**
 * PUT /api/milestones/:id
 * 更新里程碑（PM, PRODUCER, ADMIN）
 */
router.put(
  "/:id",
  authorize(
    PermissionLevel.PM,
    PermissionLevel.PRODUCER,
    PermissionLevel.ADMIN,
  ),
  [
    param("id")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Invalid milestone ID"),
    body("name")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Name must be 1-200 characters"),
    body("description").optional().isString().trim(),
    body("date").optional().isISO8601().withMessage("Valid date is required"),
    body("color").optional().isString().trim(),
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
      const existing = await milestoneService.getMilestoneById(req.params.id);
      if (!existing) {
        sendError(
          res,
          ErrorCodes.MILESTONE_NOT_FOUND,
          "Milestone not found",
          404,
        );
        return;
      }

      // Project membership check
      if (
        !(await isProjectMember(
          req.user?.userId ?? "",
          existing.projectId,
          req.user?.permissionLevel!,
        ))
      ) {
        sendError(
          res,
          ErrorCodes.PERM_DENIED,
          "Not a member of this project",
          403,
        );
        return;
      }

      const updateData: {
        name?: string;
        description?: string;
        targetDate?: Date;
        color?: string;
      } = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.description !== undefined)
        updateData.description = req.body.description;
      if (req.body.date !== undefined)
        updateData.targetDate = new Date(req.body.date);
      if (req.body.color !== undefined) updateData.color = req.body.color;

      const updated = await milestoneService.updateMilestone(
        req.params.id,
        updateData,
      );
      sendSuccess(res, toMilestoneDTO(updated));
    } catch (error: unknown) {
      // Handle race condition: milestone deleted between check and update
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        sendError(
          res,
          ErrorCodes.MILESTONE_NOT_FOUND,
          "Milestone not found",
          404,
        );
        return;
      }
      sendError(
        res,
        ErrorCodes.MILESTONE_UPDATE_FAILED,
        "Failed to update milestone",
        500,
      );
    }
  },
);

/**
 * DELETE /api/milestones/:id
 * 刪除里程碑（PM, PRODUCER, ADMIN）
 */
router.delete(
  "/:id",
  authorize(
    PermissionLevel.PM,
    PermissionLevel.PRODUCER,
    PermissionLevel.ADMIN,
  ),
  [
    param("id")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Invalid milestone ID"),
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
      const existing = await milestoneService.getMilestoneById(req.params.id);
      if (!existing) {
        sendError(
          res,
          ErrorCodes.MILESTONE_NOT_FOUND,
          "Milestone not found",
          404,
        );
        return;
      }

      // Project membership check
      if (
        !(await isProjectMember(
          req.user?.userId ?? "",
          existing.projectId,
          req.user?.permissionLevel!,
        ))
      ) {
        sendError(
          res,
          ErrorCodes.PERM_DENIED,
          "Not a member of this project",
          403,
        );
        return;
      }

      await milestoneService.deleteMilestone(req.params.id);
      res.status(204).send();
    } catch (error) {
      sendError(
        res,
        ErrorCodes.MILESTONE_DELETE_FAILED,
        "Failed to delete milestone",
        500,
      );
    }
  },
);

export default router;
