import { Router } from 'express';
import { syncUser, getCurrentUser, updateProfile } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/sync', authenticate, syncUser);
router.get('/me', authenticate, getCurrentUser);
router.put('/me', authenticate, updateProfile);

export default router;
