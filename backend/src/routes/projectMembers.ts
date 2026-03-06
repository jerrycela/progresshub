import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { AuthRequest, JwtPayload } from "../middleware/auth";
import prisma from "../config/database";
import logger from "../config/logger";
import { sendSuccess, sendError } from "../utils/response";
import { ErrorCodes } from "../types/shared-api";

const router = Router({ mergeParams: true });

/**
 * Check if user can manage project members
 */
async function canManageMembers(
  user: JwtPayload,
  projectId: string,
  targetEmployeeIds?: string[],
): Promise<boolean> {
  if (user.permissionLevel === "ADMIN") return true;

  if (user.permissionLevel === "PM" || user.permissionLevel === "PRODUCER") {
    const pm = await prisma.employee.findUnique({
      where: { id: user.userId },
      select: { managedProjects: true },
    });
    return pm?.managedProjects.includes(projectId) ?? false;
  }

  if (user.permissionLevel === "MANAGER") {
    const manager = await prisma.employee.findUnique({
      where: { id: user.userId },
      select: { department: true },
    });
    if (!manager?.department) return false;

    if (targetEmployeeIds && targetEmployeeIds.length > 0) {
      const targets = await prisma.employee.findMany({
        where: { id: { in: targetEmployeeIds } },
        select: { department: true },
      });
      return targets.every((t) => t.department === manager.department);
    }
    return true;
  }

  return false;
}

/**
 * GET /api/projects/:projectId/members
 */
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            permissionLevel: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    sendSuccess(res, members);
  } catch (error) {
    logger.error("List project members error:", error);
    sendError(
      res,
      ErrorCodes.SERVER_ERROR,
      "Failed to list project members",
      500,
    );
  }
});

/**
 * POST /api/projects/:projectId/members
 */
router.post(
  "/",
  [
    body("employeeIds")
      .isArray({ min: 1 })
      .withMessage("employeeIds must be a non-empty array"),
    body("employeeIds.*")
      .isString()
      .withMessage("Each employeeId must be a string"),
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
      const { projectId } = req.params;
      const { employeeIds } = req.body;

      const allowed = await canManageMembers(req.user!, projectId, employeeIds);
      if (!allowed) {
        sendError(res, ErrorCodes.AUTH_UNAUTHORIZED, "Permission denied", 403);
        return;
      }

      const result = await prisma.projectMember.createMany({
        data: employeeIds.map((employeeId: string) => ({
          projectId,
          employeeId,
          addedById: req.user!.userId,
        })),
        skipDuplicates: true,
      });

      sendSuccess(res, { count: result.count }, 201);
    } catch (error) {
      logger.error("Add project members error:", error);
      sendError(
        res,
        ErrorCodes.SERVER_ERROR,
        "Failed to add project members",
        500,
      );
    }
  },
);

/**
 * DELETE /api/projects/:projectId/members/:employeeId
 */
router.delete(
  "/:employeeId",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { projectId, employeeId } = req.params;

      const allowed = await canManageMembers(req.user!, projectId, [
        employeeId,
      ]);
      if (!allowed) {
        sendError(res, ErrorCodes.AUTH_UNAUTHORIZED, "Permission denied", 403);
        return;
      }

      await prisma.projectMember.delete({
        where: {
          projectId_employeeId: { projectId, employeeId },
        },
      });

      // Return 200 with null data instead of 204 empty body
      // to avoid apiDeleteUnwrap parse error on frontend
      sendSuccess(res, null);
    } catch (error) {
      logger.error("Remove project member error:", error);
      sendError(
        res,
        ErrorCodes.SERVER_ERROR,
        "Failed to remove project member",
        500,
      );
    }
  },
);

export default router;
