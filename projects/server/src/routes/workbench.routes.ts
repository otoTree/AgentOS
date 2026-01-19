import { Router } from 'express';
import * as workbenchController from '../controllers/workbench.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Skills CRUD
router.post('/skills', workbenchController.createSkill);
router.patch('/skills/:id', workbenchController.updateSkill);
router.delete('/skills/:id', workbenchController.deleteSkill);

// Skill Files
router.get('/skills/:id/files', workbenchController.getFile);
router.put('/skills/:id/files', workbenchController.updateFiles);
router.delete('/skills/:id/files', workbenchController.deleteFile);

// Deployment
router.post('/skills/:id/deploy', workbenchController.deploySkill);

export default router;
