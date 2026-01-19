import { Router } from 'express';
import * as skillController from '../controllers/skill.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/rbac.middleware';
import { PERMISSIONS } from '@agentos/service/core/team/constants';

const router = Router();

router.use(authMiddleware);

// For List, we manually handle it inside controller or use a permissive check
// Because List might be mixed (Public + Team).
// But checkPermission middleware enforces teamId presence if applied.
// Let's modify list to be open, and controller handles filtering.
router.get('/', skillController.list);

router.get('/:id', checkPermission(PERMISSIONS.SKILL_READ), skillController.get);
router.post('/:id/run', checkPermission(PERMISSIONS.SKILL_RUN), skillController.run);

export default router;
