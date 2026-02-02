import { Router } from 'express';
import authRoutes from './auth';
import employeeRoutes from './employees';
import projectRoutes from './projects';
import taskRoutes from './tasks';
import progressRoutes from './progress';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/progress', progressRoutes);

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
    },
  });
});

export default router;
