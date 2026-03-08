import { Router } from 'express';
import authController from '../controllers/authController';
import projectsRouter from './projects';
import scriptsRouter from './scripts';
import charactersRouter from './characters';
import storyboardsRouter from './storyboards';
import videosRouter from './videos';
import audiosRouter from './audios';
import composeRouter from './compose';
import queuesRouter from './queues';
import episodesRouter, { episodeRouter } from './episodes';
import scenesV2Router, { sceneRouter } from './scenesV2';
import seasonsRouter, { seasonRouter } from './seasons';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

// Health check - 放在最前面
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ai-drama-platform-backend',
    version: '2.0.0',
  });
});

router.use('/auth', authLimiter, authController);
router.use('/projects', projectsRouter);
router.use('/scripts', scriptsRouter);
router.use('/characters', charactersRouter);
router.use('/storyboards', storyboardsRouter);
router.use('/videos', videosRouter);
router.use('/audios', audiosRouter);
router.use('/compose', composeRouter);
router.use('/queues', queuesRouter);
// Phase 3 P2 - 分集与分镜管理
router.use('/projects/:projectId/seasons', seasonsRouter);
router.use('/projects/:projectId/episodes', episodesRouter);
router.use('/episodes/:episodeId/scenes', scenesV2Router);
router.use('/episodes', episodeRouter);
router.use('/seasons', seasonRouter);
router.use('/scenes', sceneRouter);

export default router;
