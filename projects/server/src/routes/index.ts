import { Router } from 'express';
import { checkHealth } from '../controllers/health.controller';
import aiRoutes from './ai.routes';
import skillRoutes from './skill.routes';
import datasetRoutes from './dataset.routes';
import workbenchRoutes from './workbench.routes';
import adminRoutes from './admin.routes';
import chatRoutes from './chat.routes';
import authRoutes from './auth.routes';

const router = Router();

router.get('/health', checkHealth);

router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);
router.use('/skills', skillRoutes); // v1/skills (Registry)
router.use('/dataset', datasetRoutes);
router.use('/workbench', workbenchRoutes);
router.use('/admin', adminRoutes);
router.use('/chat', chatRoutes);

export default router;
