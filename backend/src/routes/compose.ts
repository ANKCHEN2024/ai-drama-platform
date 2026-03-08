import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import compositeController from '../controllers/compositeController';

const router = Router();

router.use(authMiddleware);
router.use(compositeController);

export default router;
