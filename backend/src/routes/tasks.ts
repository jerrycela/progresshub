import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { sanitizeBody } from "../middleware/sanitize";
import taskCrudRoutes from "./taskCrudRoutes";
import taskActionRoutes from "./taskActionRoutes";
import taskNoteRoutes from "./taskNoteRoutes";

const router = Router();

// 所有任務路由都需要認證
router.use(authenticate);
router.use(sanitizeBody);

// 掛載順序重要：CRUD 路由中 /pool 必須在 /:id 之前
router.use(taskCrudRoutes);
router.use(taskActionRoutes);
router.use(taskNoteRoutes);

export default router;
