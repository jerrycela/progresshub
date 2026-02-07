import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { timeCategoryService } from "../services/timeCategoryService";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { PermissionLevel } from "@prisma/client";
import { sendSuccess, sendError, getSafeErrorMessage } from "../utils/response";

const router = Router();

router.use(authenticate);

/**
 * GET /api/time-categories
 * 取得工時類別列表
 */
router.get(
  "/",
  [query("includeInactive").optional().isBoolean().toBoolean()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // 只有管理員可以看到停用的類別
      let includeInactive = req.query.includeInactive as unknown as boolean;
      if (req.user?.permissionLevel !== "ADMIN") {
        includeInactive = false;
      }

      const categories =
        await timeCategoryService.getCategories(includeInactive);
      sendSuccess(res, categories);
    } catch (error) {
      sendError(
        res,
        "CATEGORIES_FETCH_FAILED",
        "Failed to get categories",
        500,
      );
    }
  },
);

/**
 * GET /api/time-categories/:id
 * 取得單一工時類別
 */
router.get(
  "/:id",
  [param("id").isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const category = await timeCategoryService.getCategoryById(req.params.id);
      if (!category) {
        sendError(res, "CATEGORY_NOT_FOUND", "Category not found", 404);
        return;
      }
      sendSuccess(res, category);
    } catch (error) {
      sendError(res, "CATEGORY_FETCH_FAILED", "Failed to get category", 500);
    }
  },
);

/**
 * POST /api/time-categories
 * 建立工時類別（僅限管理員）
 */
router.post(
  "/",
  authorize(PermissionLevel.ADMIN),
  [
    body("name").isString().trim().notEmpty().withMessage("Name is required"),
    body("color")
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage("Invalid color format"),
    body("billable").optional().isBoolean(),
    body("sortOrder").optional().isInt({ min: 0 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const category = await timeCategoryService.createCategory(req.body);
      sendSuccess(res, category, 201);
    } catch (error: unknown) {
      sendError(
        res,
        "CATEGORY_CREATE_FAILED",
        getSafeErrorMessage(error, "Failed to create category"),
        400,
      );
    }
  },
);

/**
 * PUT /api/time-categories/:id
 * 更新工時類別（僅限管理員）
 */
router.put(
  "/:id",
  authorize(PermissionLevel.ADMIN),
  [
    param("id").isUUID(),
    body("name").optional().isString().trim().notEmpty(),
    body("color")
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/),
    body("billable").optional().isBoolean(),
    body("isActive").optional().isBoolean(),
    body("sortOrder").optional().isInt({ min: 0 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const category = await timeCategoryService.updateCategory(
        req.params.id,
        req.body,
      );
      sendSuccess(res, category);
    } catch (error: unknown) {
      sendError(
        res,
        "CATEGORY_UPDATE_FAILED",
        getSafeErrorMessage(error, "Failed to update category"),
        400,
      );
    }
  },
);

/**
 * POST /api/time-categories/:id/deactivate
 * 停用工時類別（僅限管理員）
 */
router.post(
  "/:id/deactivate",
  authorize(PermissionLevel.ADMIN),
  [param("id").isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const category = await timeCategoryService.deactivateCategory(
        req.params.id,
      );
      sendSuccess(res, category);
    } catch (error: unknown) {
      sendError(
        res,
        "CATEGORY_DEACTIVATE_FAILED",
        getSafeErrorMessage(error, "Failed to deactivate category"),
        400,
      );
    }
  },
);

/**
 * POST /api/time-categories/:id/activate
 * 啟用工時類別（僅限管理員）
 */
router.post(
  "/:id/activate",
  authorize(PermissionLevel.ADMIN),
  [param("id").isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const category = await timeCategoryService.activateCategory(
        req.params.id,
      );
      sendSuccess(res, category);
    } catch (error: unknown) {
      sendError(
        res,
        "CATEGORY_ACTIVATE_FAILED",
        getSafeErrorMessage(error, "Failed to activate category"),
        400,
      );
    }
  },
);

/**
 * DELETE /api/time-categories/:id
 * 刪除工時類別（僅限管理員，需無關聯資料）
 */
router.delete(
  "/:id",
  authorize(PermissionLevel.ADMIN),
  [param("id").isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      await timeCategoryService.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error: unknown) {
      sendError(
        res,
        "CATEGORY_DELETE_FAILED",
        getSafeErrorMessage(error, "Failed to delete category"),
        400,
      );
    }
  },
);

/**
 * POST /api/time-categories/initialize
 * 初始化預設類別（僅限管理員）
 */
router.post(
  "/initialize",
  authorize(PermissionLevel.ADMIN),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const categories =
        await timeCategoryService.initializeDefaultCategories();
      sendSuccess(res, {
        message: "Default categories initialized",
        categories,
      });
    } catch (error) {
      sendError(
        res,
        "CATEGORIES_INIT_FAILED",
        "Failed to initialize categories",
        500,
      );
    }
  },
);

export default router;
