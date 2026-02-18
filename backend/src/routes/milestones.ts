import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { PermissionLevel } from "@prisma/client";
import { sendSuccess, sendError } from "../utils/response";
import { milestoneService } from "../services/milestoneService";
import { toMilestoneDTO } from "../mappers";

const router = Router();

router.use(authenticate);

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
      const milestones = await milestoneService.getMilestones(projectId);
      sendSuccess(res, milestones.map(toMilestoneDTO));
    } catch (error) {
      sendError(
        res,
        "MILESTONES_FETCH_FAILED",
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
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
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
        "MILESTONE_CREATE_FAILED",
        "Failed to create milestone",
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
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const existing = await milestoneService.getMilestoneById(req.params.id);
      if (!existing) {
        sendError(res, "MILESTONE_NOT_FOUND", "Milestone not found", 404);
        return;
      }

      await milestoneService.deleteMilestone(req.params.id);
      res.status(204).send();
    } catch (error) {
      sendError(
        res,
        "MILESTONE_DELETE_FAILED",
        "Failed to delete milestone",
        500,
      );
    }
  },
);

export default router;
