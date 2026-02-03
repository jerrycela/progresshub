import { Router } from 'express';
import instanceRoutes from './instances';
import connectionRoutes from './connections';
import activityRoutes from './activities';
import issueRoutes from './issues';
import webhookRoutes from './webhook';

const router = Router();

router.use('/instances', instanceRoutes);
router.use('/connections', connectionRoutes);
router.use('/activities', activityRoutes);
router.use('/issues', issueRoutes);
router.use('/webhook', webhookRoutes);

export default router;
