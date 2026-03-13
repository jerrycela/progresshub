import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { employeeService } from "../services/employeeService";
import {
  authenticate,
  authorize,
  AuthRequest,
  authorizeSelfOrAdmin,
  invalidateAuthCache,
} from "../middleware/auth";
import { auditLog } from "../middleware/auditLog";
import { PermissionLevel } from "@prisma/client";
import {
  sendSuccess,
  sendPaginatedSuccess,
  sendError,
} from "../utils/response";
import { sanitizeBody } from "../middleware/sanitize";
import { toUserDTO } from "../mappers";

import { ErrorCodes } from "../types/shared-api";
import logger from "../config/logger";
const router = Router();

// 所有員工路由都需要認證
router.use(authenticate);
router.use(sanitizeBody);

/**
 * GET /api/employees
 * 取得員工列表
 */
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 500 }).toInt(),
    query("department").optional().isString().trim(),
    query("permissionLevel")
      .optional()
      .isIn(["EMPLOYEE", "PM", "PRODUCER", "MANAGER", "ADMIN"]),
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

      const result = await employeeService.getEmployees({
        page,
        limit,
        department: req.query.department as string,
        permissionLevel: req.query.permissionLevel as PermissionLevel,
        search: req.query.search as string,
      });

      sendPaginatedSuccess(res, result.data.map(toUserDTO), {
        total: result.total,
        page,
        limit,
      });
    } catch (error) {
      logger.error("Get employees error:", error);
      sendError(
        res,
        ErrorCodes.EMPLOYEES_FETCH_FAILED,
        "Failed to get employees",
        500,
      );
    }
  },
);

/**
 * GET /api/employees/:id
 * 取得單一員工
 */
router.get(
  "/:id",
  [param("id").isString().trim().notEmpty().withMessage("Invalid employee ID")],
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
      const employee = await employeeService.getEmployeeById(req.params.id);
      if (!employee) {
        sendError(
          res,
          ErrorCodes.EMPLOYEE_NOT_FOUND,
          "Employee not found",
          404,
        );
        return;
      }
      sendSuccess(res, toUserDTO(employee));
    } catch (error) {
      logger.error("Get employee by ID error:", error);
      sendError(
        res,
        ErrorCodes.EMPLOYEE_FETCH_FAILED,
        "Failed to get employee",
        500,
      );
    }
  },
);

/**
 * POST /api/employees
 * 建立員工（僅 Admin）
 */
router.post(
  "/",
  authorize(PermissionLevel.ADMIN),
  [
    body("name")
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Name is required (max 50 chars)"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("slackUserId").optional().isString().trim(),
    body("department").optional().isString().trim(),
    body("permissionLevel")
      .optional()
      .isIn(["EMPLOYEE", "PM", "PRODUCER", "MANAGER", "ADMIN"]),
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
      const { email, slackUserId } = req.body;

      // 檢查 Email 是否已存在
      if (await employeeService.emailExists(email)) {
        sendError(res, ErrorCodes.EMAIL_EXISTS, "Email already exists", 409);
        return;
      }

      // 檢查 Slack User ID 是否已存在
      if (
        slackUserId &&
        (await employeeService.slackUserIdExists(slackUserId))
      ) {
        sendError(
          res,
          ErrorCodes.SLACK_ID_EXISTS,
          "Slack User ID already exists",
          409,
        );
        return;
      }

      const employee = await employeeService.createEmployee(req.body);
      sendSuccess(res, toUserDTO(employee), 201);
    } catch (error) {
      logger.error("Create employee error:", error);
      sendError(
        res,
        ErrorCodes.EMPLOYEE_CREATE_FAILED,
        "Failed to create employee",
        500,
      );
    }
  },
);

/**
 * PUT /api/employees/:id
 * 更新員工（僅 Admin）
 */
router.put(
  "/:id",
  authorizeSelfOrAdmin,
  auditLog("UPDATE_EMPLOYEE"),
  [
    param("id").isString().trim().notEmpty().withMessage("Invalid employee ID"),
    body("name").optional().isString().trim().isLength({ min: 1, max: 50 }),
    body("email").optional().isEmail().normalizeEmail(),
    body("department").optional().isString().trim(),
    body("permissionLevel")
      .optional()
      .isIn(["EMPLOYEE", "PM", "PRODUCER", "MANAGER", "ADMIN"]),
    body("managedProjects").optional().isArray(),
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
      const { id } = req.params;

      // 檢查員工是否存在
      const existing = await employeeService.getEmployeeById(id);
      if (!existing) {
        sendError(
          res,
          ErrorCodes.EMPLOYEE_NOT_FOUND,
          "Employee not found",
          404,
        );
        return;
      }

      const requesterLevel = req.user?.permissionLevel;
      const isAdmin = requesterLevel === PermissionLevel.ADMIN;
      const isManager = requesterLevel === PermissionLevel.MANAGER;

      // Role hierarchy numeric mapping for comparison
      const ROLE_RANK: Record<PermissionLevel, number> = {
        [PermissionLevel.EMPLOYEE]: 1,
        [PermissionLevel.MANAGER]: 2,
        [PermissionLevel.PRODUCER]: 3,
        [PermissionLevel.PM]: 3,
        [PermissionLevel.ADMIN]: 4,
      };

      // MANAGER can only edit accounts strictly below their own level (EMPLOYEE only),
      // plus their own profile (self-edit)
      const isSelfEdit = req.user?.userId === id;
      if (isManager && !isSelfEdit) {
        const targetRank =
          ROLE_RANK[existing.permissionLevel as PermissionLevel];
        const managerRank = ROLE_RANK[PermissionLevel.MANAGER];
        if (targetRank >= managerRank) {
          sendError(
            res,
            ErrorCodes.AUTH_UNAUTHORIZED,
            "MANAGER 只能編輯 EMPLOYEE 層級的帳號",
            403,
          );
          return;
        }
      }

      // MANAGER cannot set permissionLevel to anything above EMPLOYEE
      if (isManager && req.body.permissionLevel) {
        const requestedRank =
          ROLE_RANK[req.body.permissionLevel as PermissionLevel];
        const managerRank = ROLE_RANK[PermissionLevel.MANAGER];
        if (requestedRank >= managerRank) {
          sendError(
            res,
            ErrorCodes.AUTH_UNAUTHORIZED,
            "MANAGER 無法將帳號權限提升至 MANAGER 或以上層級",
            403,
          );
          return;
        }
      }

      // 非 ADMIN 使用者不能修改權限相關欄位
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {
        permissionLevel,
        managedProjects,
        slackUserId,
        isActive,
        ...safeBody
      } = req.body;
      const updateData = isAdmin ? req.body : safeBody;

      // 檢查 Email 是否已被其他人使用
      if (
        updateData.email &&
        (await employeeService.emailExists(updateData.email, id))
      ) {
        sendError(res, ErrorCodes.EMAIL_EXISTS, "Email already exists", 409);
        return;
      }

      const employee = await employeeService.updateEmployee(id, updateData);

      // Immediately evict from auth cache when an account is disabled,
      // so the 5-minute TTL cannot be exploited for continued access.
      if (isAdmin && isActive === false) {
        invalidateAuthCache(id);
      }

      sendSuccess(res, toUserDTO(employee));
    } catch (error) {
      logger.error("Update employee error:", error);
      sendError(
        res,
        ErrorCodes.EMPLOYEE_UPDATE_FAILED,
        "Failed to update employee",
        500,
      );
    }
  },
);

/**
 * DELETE /api/employees/:id
 * 刪除員工（僅 Admin）
 */
router.delete(
  "/:id",
  authorize(PermissionLevel.ADMIN),
  auditLog("DELETE_EMPLOYEE"),
  [param("id").isString().trim().notEmpty().withMessage("Invalid employee ID")],
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
      const existing = await employeeService.getEmployeeById(req.params.id);
      if (!existing) {
        sendError(
          res,
          ErrorCodes.EMPLOYEE_NOT_FOUND,
          "Employee not found",
          404,
        );
        return;
      }

      await employeeService.softDeleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error("Delete employee error:", error);
      sendError(
        res,
        ErrorCodes.EMPLOYEE_DELETE_FAILED,
        "Failed to delete employee",
        500,
      );
    }
  },
);

export default router;
