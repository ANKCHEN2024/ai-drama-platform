import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import audioController from '../controllers/audioController';

const router = Router();

router.use(authMiddleware);
router.use(audioController);

export default router;
