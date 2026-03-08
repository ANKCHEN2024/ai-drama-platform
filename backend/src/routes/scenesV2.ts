import { Router } from 'express';
import * as sceneController from '../controllers/sceneController';

const router = Router();

/**
 * 分镜管理路由
 * Base: /api/episodes/:episodeId/scenes
 */

// 创建分镜
router.post('/', sceneController.createScene);

// 获取分镜列表
router.get('/', sceneController.getScenes);

export default router;

/**
 * 独立分镜路由
 * Base: /api/scenes/:id
 */
const sceneRouter = Router();

// 获取分镜详情
sceneRouter.get('/:id', sceneController.getScene);

// 更新分镜
sceneRouter.put('/:id', sceneController.updateScene);

// 删除分镜
sceneRouter.delete('/:id', sceneController.deleteScene);

// 分镜排序
sceneRouter.put('/:id/reorder', sceneController.reorderScene);

export { sceneRouter };
