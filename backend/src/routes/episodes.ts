import { Router } from 'express';
import * as episodeController from '../controllers/episodeController';

const router = Router();

/**
 * 分集管理路由
 * Base: /api/projects/:projectId/episodes
 */

// 创建分集
router.post('/', episodeController.createEpisode);

// 获取分集列表
router.get('/', episodeController.getEpisodes);

export default router;

/**
 * 独立分集路由
 * Base: /api/episodes/:id
 */
const episodeRouter = Router();

// 获取分集详情
episodeRouter.get('/:id', episodeController.getEpisode);

// 更新分集
episodeRouter.put('/:id', episodeController.updateEpisode);

// 删除分集
episodeRouter.delete('/:id', episodeController.deleteEpisode);

// 分集排序
episodeRouter.put('/:id/reorder', episodeController.reorderEpisode);

export { episodeRouter };
