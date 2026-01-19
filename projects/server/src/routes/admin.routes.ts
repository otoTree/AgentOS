import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
// import { checkPermission } from '../middleware/rbac.middleware'; 
// Note: We need a global/system admin check, not team based. For now just auth.

const router = Router();

router.use(authMiddleware);

// Providers
router.get('/models/providers', adminController.getProviders);
router.post('/models/providers', adminController.saveProvider);
router.delete('/models/providers/:id', adminController.deleteProvider);
router.get('/models/providers/:id/test', adminController.testConnection);

// Models
router.post('/models/providers/:providerId/models', adminController.addModel);
router.patch('/models/models/:id', adminController.updateModel);
router.delete('/models/models/:id', adminController.deleteModel);

export default router;
