import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import videoController from '../controllers/videoController';

const router = Router();

router.use(authMiddleware);
router.use(videoController);

export default router;
