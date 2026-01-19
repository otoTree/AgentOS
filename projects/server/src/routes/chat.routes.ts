import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/sessions', chatController.listSessions);
router.post('/sessions', chatController.createSession);
router.delete('/sessions/:id', chatController.deleteSession);
router.get('/sessions/:id/messages', chatController.getMessages);
router.post('/message', chatController.sendMessage);

export default router;
