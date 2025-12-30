import { Router } from 'express';
import { getUploadUrl } from '../controllers/uploads.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/signed-url', authenticate, getUploadUrl);

export default router;
