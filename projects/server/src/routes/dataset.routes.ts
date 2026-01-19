import { Router } from 'express';
import * as datasetController from '../controllers/dataset.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/upload', datasetController.uploadMiddleware, datasetController.uploadFile);
router.get('/', datasetController.list);
router.post('/folder', datasetController.createFolder);
router.delete('/folder/:id', datasetController.deleteFolder);
router.delete('/file/:id', datasetController.deleteFile);

export default router;
