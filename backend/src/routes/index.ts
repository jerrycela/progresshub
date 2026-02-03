import { Router } from 'express';
import authRoutes from './auth';
import employeeRoutes from './employees';
import projectRoutes from './projects';
import taskRoutes from './tasks';
import progressRoutes from './progress';
import timeEntryRoutes from './timeEntries';
import timeCategoryRoutes from './timeCategories';
import timeStatsRoutes from './timeStats';
import slackRoutes from './slack';
import gitlabRoutes from './gitlab';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/progress', progressRoutes);
router.use('/time-entries', timeEntryRoutes);
router.use('/time-categories', timeCategoryRoutes);
router.use('/time-stats', timeStatsRoutes);
router.use('/slack', slackRoutes);
router.use('/gitlab', gitlabRoutes);

// API Info
router.get('/', (req, res) => {
  res.json({
    name: 'ProgressHub API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      employees: '/api/employees',
      projects: '/api/projects',
      tasks: '/api/tasks',
      progress: '/api/progress',
      timeEntries: '/api/time-entries',
      timeCategories: '/api/time-categories',
      timeStats: '/api/time-stats',
      slack: '/api/slack',
      gitlab: '/api/gitlab',
    },
  });
});

export default router;
