import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/chat/completions', aiController.chatCompletions);
router.post('/embeddings', aiController.embeddings);

export default router;
