import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import prisma from "../config/database";
import { sendError } from "../utils/response";
import { ErrorCodes } from "../types/shared-api";
import { PermissionLevel } from "@prisma/client";
import { logger } from "../config/logger";

// Type-safe whitelist of resources that support ownership checks
type AuthzResource = "task" | "timeEntry" | "progressLog";

/**
 * Require the authenticated user to be a member of the project
 * identified by req.params[paramName]. ADMIN bypasses the check.
 */
export const requireProjectMember = (paramName: string) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        sendError(res, ErrorCodes.AUTH_REQUIRED, "未通過認證", 401);
        return;
      }

      // ADMIN bypasses project membership check
      if (user.permissionLevel === PermissionLevel.ADMIN) {
        next();
        return;
      }

      const projectId = req.params[paramName];
      if (!projectId) {
        sendError(
          res,
          ErrorCodes.VALIDATION_FAILED,
          "Missing project ID parameter",
          400,
        );
        return;
      }

      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_employeeId: {
            projectId,
            employeeId: user.userId,
          },
        },
      });

      if (!membership) {
        sendError(res, ErrorCodes.NOT_FOUND, "Resource not found", 404);
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require the authenticated user to own the resource (via project membership).
 * ADMIN only needs the resource to exist.
 * Non-ADMIN must be a member of the resource's project.
 *
 * On success, attaches the loaded record to (req as any).authorizedResource.
 */
export const requireResourceOwner = (
  resource: AuthzResource,
  idParam: string,
) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        sendError(res, ErrorCodes.AUTH_REQUIRED, "未通過認證", 401);
        return;
      }

      const resourceId = req.params[idParam];
      if (!resourceId) {
        sendError(
          res,
          ErrorCodes.VALIDATION_FAILED,
          "Missing resource ID parameter",
          400,
        );
        return;
      }

      if (user.permissionLevel === PermissionLevel.ADMIN) {
        // ADMIN: just verify the resource exists
        const record = await findResource(resource, resourceId);
        if (!record) {
          sendError(res, ErrorCodes.NOT_FOUND, "Resource not found", 404);
          return;
        }
        (req as any).authorizedResource = record;
        next();
        return;
      }

      // Non-ADMIN: verify resource exists AND user is a project member
      const record = await findResourceWithMembership(
        resource,
        resourceId,
        user.userId,
      );

      if (!record) {
        sendError(res, ErrorCodes.NOT_FOUND, "Resource not found", 404);
        return;
      }

      if (!hasProjectMembership(resource, record)) {
        sendError(res, ErrorCodes.NOT_FOUND, "Resource not found", 404);
        return;
      }

      (req as any).authorizedResource = record;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Populate req.authorizedProjectIds with the project IDs the user
 * is a member of. ADMIN skips (no filtering needed).
 */
export const requireProjectScope = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      sendError(res, ErrorCodes.AUTH_REQUIRED, "未通過認證", 401);
      return;
    }

    // ADMIN sees everything — no scope filter
    if (user.permissionLevel === PermissionLevel.ADMIN) {
      next();
      return;
    }

    const memberships = await prisma.projectMember.findMany({
      where: { employeeId: user.userId },
      select: { projectId: true },
    });

    const projectIds = memberships.map((m) => m.projectId);

    if (projectIds.length > 50) {
      logger.warn(
        `User ${user.userId} is a member of ${projectIds.length} projects (>50)`,
      );
    }

    (req as any).authorizedProjectIds = projectIds;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Build a Prisma where-clause fragment that scopes queries to
 * the given project IDs. Returns empty object when projectIds
 * is undefined (ADMIN — no filtering).
 */
export function buildProjectScopeFilter(projectIds?: string[]) {
  if (!projectIds) return {};
  return { projectId: { in: projectIds } };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Find a resource by ID (existence check only, no membership include).
 */
async function findResource(resource: AuthzResource, id: string) {
  switch (resource) {
    case "task":
      return prisma.task.findUnique({ where: { id } });
    case "timeEntry":
      return prisma.timeEntry.findUnique({ where: { id } });
    case "progressLog":
      return prisma.progressLog.findUnique({ where: { id } });
  }
}

/**
 * Find a resource and include project.members filtered to the given employeeId.
 * task and timeEntry use their direct projectId; progressLog goes through task.
 */
async function findResourceWithMembership(
  resource: AuthzResource,
  id: string,
  employeeId: string,
) {
  const memberInclude = {
    include: {
      members: { where: { employeeId } },
    },
  };

  switch (resource) {
    case "task":
      return prisma.task.findUnique({
        where: { id },
        include: { project: memberInclude },
      });
    case "timeEntry":
      return prisma.timeEntry.findUnique({
        where: { id },
        include: { project: memberInclude },
      });
    case "progressLog":
      return prisma.progressLog.findUnique({
        where: { id },
        include: { task: { include: { project: memberInclude } } },
      });
  }
}

/**
 * Check whether the loaded record (with includes) has at least one
 * project member entry, indicating the user belongs to the project.
 */
function hasProjectMembership(resource: AuthzResource, record: any): boolean {
  switch (resource) {
    case "task":
      return (record.project?.members?.length ?? 0) > 0;
    case "timeEntry":
      return (record.project?.members?.length ?? 0) > 0;
    case "progressLog":
      return (record.task?.project?.members?.length ?? 0) > 0;
  }
}
