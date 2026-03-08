import { Router } from 'express';
import { aiGenerationController } from '../controllers/aiGenerationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有 AI 生成相关的路由都需要认证
router.use(authenticate);

/**
 * @route POST /api/ai/generate/script
 * @desc 生成剧本
 * @access Private
 */
router.post('/generate/script', (req, res) =>
  aiGenerationController.generateScript(req, res)
);

/**
 * @route POST /api/ai/generate/storyboard
 * @desc 生成分镜
 * @access Private
 */
router.post('/generate/storyboard', (req, res) =>
  aiGenerationController.generateStoryboard(req, res)
);

/**
 * @route POST /api/ai/generate/video
 * @desc 生成视频（单个场景）
 * @access Private
 */
router.post('/generate/video', (req, res) =>
  aiGenerationController.generateVideo(req, res)
);

/**
 * @route POST /api/ai/generate/video/batch
 * @desc 批量生成视频（整个剧集）
 * @access Private
 */
router.post('/generate/video/batch', (req, res) =>
  aiGenerationController.generateVideoBatch(req, res)
);

/**
 * @route POST /api/ai/generate/compose
 * @desc 合成视频
 * @access Private
 */
router.post('/generate/compose', (req, res) =>
  aiGenerationController.composeVideo(req, res)
);

/**
 * @route GET /api/ai/task/:jobId/status
 * @desc 查询任务进度
 * @access Private
 */
router.get('/task/:jobId/status', (req, res) =>
  aiGenerationController.getTaskStatus(req, res)
);

/**
 * @route POST /api/ai/task/:jobId/cancel
 * @desc 取消任务
 * @access Private
 */
router.post('/task/:jobId/cancel', (req, res) =>
  aiGenerationController.cancelTask(req, res)
);

/**
 * @route POST /api/ai/task/:jobId/retry
 * @desc 重试失败的任务
 * @access Private
 */
router.post('/task/:jobId/retry', (req, res) =>
  aiGenerationController.retryTask(req, res)
);

/**
 * @route GET /api/ai/queue/stats
 * @desc 查询队列统计
 * @access Private
 */
router.get('/queue/stats', (req, res) =>
  aiGenerationController.getQueueStats(req, res)
);

/**
 * @route GET /api/ai/video/history
 * @desc 获取视频生成历史
 * @access Private
 */
router.get('/video/history', (req, res) =>
  aiGenerationController.getVideoHistory(req, res)
);

export default router;
