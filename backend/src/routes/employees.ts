import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { employeeService } from '../services/employeeService';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { PermissionLevel } from '@prisma/client';

const router = Router();

// 所有員工路由都需要認證
router.use(authenticate);

/**
 * GET /api/employees
 * 取得員工列表
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('department').optional().isString().trim(),
    query('permissionLevel').optional().isIn(['EMPLOYEE', 'PM', 'ADMIN']),
    query('search').optional().isString().trim(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await employeeService.getEmployees({
        page: req.query.page as unknown as number,
        limit: req.query.limit as unknown as number,
        department: req.query.department as string,
        permissionLevel: req.query.permissionLevel as PermissionLevel,
        search: req.query.search as string,
      });

      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: Math.ceil(result.total / (Number(req.query.limit) || 20)),
        },
      });
    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({ error: 'Failed to get employees' });
    }
  }
);

/**
 * GET /api/employees/:id
 * 取得單一員工
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid employee ID')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const employee = await employeeService.getEmployeeById(req.params.id);
      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }
      res.json(employee);
    } catch (error) {
      console.error('Get employee error:', error);
      res.status(500).json({ error: 'Failed to get employee' });
    }
  }
);

/**
 * POST /api/employees
 * 建立員工（僅 Admin）
 */
router.post(
  '/',
  authorize(PermissionLevel.ADMIN),
  [
    body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('slackUserId').isString().trim().notEmpty().withMessage('Slack User ID is required'),
    body('department').optional().isString().trim(),
    body('permissionLevel').optional().isIn(['EMPLOYEE', 'PM', 'ADMIN']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { email, slackUserId } = req.body;

      // 檢查 Email 是否已存在
      if (await employeeService.emailExists(email)) {
        res.status(409).json({ error: 'Email already exists' });
        return;
      }

      // 檢查 Slack User ID 是否已存在
      if (await employeeService.slackUserIdExists(slackUserId)) {
        res.status(409).json({ error: 'Slack User ID already exists' });
        return;
      }

      const employee = await employeeService.createEmployee(req.body);
      res.status(201).json(employee);
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({ error: 'Failed to create employee' });
    }
  }
);

/**
 * PUT /api/employees/:id
 * 更新員工（僅 Admin）
 */
router.put(
  '/:id',
  authorize(PermissionLevel.ADMIN),
  [
    param('id').isUUID().withMessage('Invalid employee ID'),
    body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('department').optional().isString().trim(),
    body('permissionLevel').optional().isIn(['EMPLOYEE', 'PM', 'ADMIN']),
    body('managedProjects').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { id } = req.params;

      // 檢查員工是否存在
      const existing = await employeeService.getEmployeeById(id);
      if (!existing) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      // 檢查 Email 是否已被其他人使用
      if (req.body.email && await employeeService.emailExists(req.body.email, id)) {
        res.status(409).json({ error: 'Email already exists' });
        return;
      }

      const employee = await employeeService.updateEmployee(id, req.body);
      res.json(employee);
    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({ error: 'Failed to update employee' });
    }
  }
);

/**
 * DELETE /api/employees/:id
 * 刪除員工（僅 Admin）
 */
router.delete(
  '/:id',
  authorize(PermissionLevel.ADMIN),
  [param('id').isUUID().withMessage('Invalid employee ID')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const existing = await employeeService.getEmployeeById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      await employeeService.deleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({ error: 'Failed to delete employee' });
    }
  }
);

export default router;
