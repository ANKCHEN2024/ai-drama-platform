import { Router } from 'express';
import * as seasonController from '../controllers/seasonController';

const router = Router();

/**
 * 分季管理路由
 * Base: /api/projects/:projectId/seasons
 */

// 创建分季
router.post('/', seasonController.createSeason);

// 获取分季列表
router.get('/', seasonController.getSeasons);

export default router;

/**
 * 独立分季路由
 * Base: /api/seasons/:id
 */
const seasonRouter = Router();

// 获取分季详情
seasonRouter.get('/:id', seasonController.getSeasonById);

// 更新分季
seasonRouter.put('/:id', seasonController.updateSeason);

// 删除分季
seasonRouter.delete('/:id', seasonController.deleteSeason);

export { seasonRouter };
