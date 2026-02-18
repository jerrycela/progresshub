import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { employeeService } from "../services/employeeService";
import {
  authenticate,
  authorize,
  AuthRequest,
  authorizeSelfOrAdmin,
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
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("department").optional().isString().trim(),
    query("permissionLevel")
      .optional()
      .isIn(["EMPLOYEE", "PM", "PRODUCER", "MANAGER", "ADMIN"]),
    query("search").optional().isString().trim(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
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
      sendError(res, "EMPLOYEES_FETCH_FAILED", "Failed to get employees", 500);
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
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const employee = await employeeService.getEmployeeById(req.params.id);
      if (!employee) {
        sendError(res, "EMPLOYEE_NOT_FOUND", "Employee not found", 404);
        return;
      }
      sendSuccess(res, toUserDTO(employee));
    } catch (error) {
      sendError(res, "EMPLOYEE_FETCH_FAILED", "Failed to get employee", 500);
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
      .isLength({ min: 1, max: 100 })
      .withMessage("Name is required"),
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
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const { email, slackUserId } = req.body;

      // 檢查 Email 是否已存在
      if (await employeeService.emailExists(email)) {
        sendError(res, "EMAIL_EXISTS", "Email already exists", 409);
        return;
      }

      // 檢查 Slack User ID 是否已存在
      if (
        slackUserId &&
        (await employeeService.slackUserIdExists(slackUserId))
      ) {
        sendError(res, "SLACK_ID_EXISTS", "Slack User ID already exists", 409);
        return;
      }

      const employee = await employeeService.createEmployee(req.body);
      sendSuccess(res, toUserDTO(employee), 201);
    } catch (error) {
      sendError(
        res,
        "EMPLOYEE_CREATE_FAILED",
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
    body("name").optional().isString().trim().isLength({ min: 1, max: 100 }),
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
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const { id } = req.params;

      // 檢查員工是否存在
      const existing = await employeeService.getEmployeeById(id);
      if (!existing) {
        sendError(res, "EMPLOYEE_NOT_FOUND", "Employee not found", 404);
        return;
      }

      // 非 ADMIN 使用者不能修改權限相關欄位
      const isAdmin = req.user?.permissionLevel === PermissionLevel.ADMIN;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { permissionLevel, managedProjects, ...safeBody } = req.body;
      const updateData = isAdmin ? req.body : safeBody;

      // 檢查 Email 是否已被其他人使用
      if (
        updateData.email &&
        (await employeeService.emailExists(updateData.email, id))
      ) {
        sendError(res, "EMAIL_EXISTS", "Email already exists", 409);
        return;
      }

      const employee = await employeeService.updateEmployee(id, updateData);
      sendSuccess(res, toUserDTO(employee));
    } catch (error) {
      sendError(
        res,
        "EMPLOYEE_UPDATE_FAILED",
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
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const existing = await employeeService.getEmployeeById(req.params.id);
      if (!existing) {
        sendError(res, "EMPLOYEE_NOT_FOUND", "Employee not found", 404);
        return;
      }

      await employeeService.softDeleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error) {
      sendError(
        res,
        "EMPLOYEE_DELETE_FAILED",
        "Failed to delete employee",
        500,
      );
    }
  },
);

export default router;
