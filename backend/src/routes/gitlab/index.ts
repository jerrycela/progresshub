import { Router, Request, Response, NextFunction } from "express";
import instanceRoutes from "./instances";
import connectionRoutes from "./connections";
import activityRoutes from "./activities";
import issueRoutes from "./issues";
import webhookRoutes from "./webhook";
import { gitlabEnabled } from "../../config/env";

const router = Router();

// Guard: if GITLAB_ENCRYPTION_KEY is not set, all GitLab endpoints return a
// descriptive 503 instead of crashing with an obscure 500 deep in the service.
if (!gitlabEnabled) {
  router.use((_req: Request, res: Response, _next: NextFunction) => {
    res.status(503).json({
      success: false,
      error: {
        code: "GITLAB_NOT_CONFIGURED",
        message:
          "GitLab integration is not configured. " +
          "Set the GITLAB_ENCRYPTION_KEY environment variable to enable this feature.",
      },
    });
  });
} else {
  router.use("/instances", instanceRoutes);
  router.use("/connections", connectionRoutes);
  router.use("/activities", activityRoutes);
  router.use("/issues", issueRoutes);
  router.use("/webhook", webhookRoutes);
}

export default router;
