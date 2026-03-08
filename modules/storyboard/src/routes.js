/**
 * 分镜模块 API 路由
 * 
 * RESTful API 端点
 * 
 * @module api/routes
 */

const express = require('express');
const StoryboardService = require('../src/storyboard-service');
const { CameraAngle, StoryboardStatus } = require('../src/types');

const router = express.Router();

// 初始化服务（实际应从依赖注入容器获取）
let storyboardService;

function getService() {
  if (!storyboardService) {
    storyboardService = new StoryboardService({
      aliyun: {
        accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET
      },
      storage: null, // TODO: 配置 MinIO
      db: null // TODO: 配置数据库
    });
  }
  return storyboardService;
}

/**
 * @route   POST /api/v1/storyboards/generate
 * @desc    生成分镜（同步）
 * @access  Private
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      projectId,
      sceneId,
      sceneDescription,
      characters,
      action,
      cameraAngles,
      countPerAngle,
      style,
      aspectRatio,
      quality
    } = req.body;

    // 参数验证
    if (!projectId || !sceneId || !sceneDescription || !characters || !action) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '缺少必要参数：projectId, sceneId, sceneDescription, characters, action'
        }
      });
    }

    if (!cameraAngles || !Array.isArray(cameraAngles) || cameraAngles.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'cameraAngles 不能为空'
        }
      });
    }

    // 验证镜头角度
    const validAngles = Object.values(CameraAngle);
    const invalidAngles = cameraAngles.filter(a => !validAngles.includes(a));
    if (invalidAngles.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ANGLE',
          message: `无效的镜头角度：${invalidAngles.join(', ')}`,
          validAngles
        }
      });
    }

    // 调用服务
    const result = await getService().generateStoryboard({
      projectId,
      sceneId,
      sceneDescription,
      characters,
      action,
      cameraAngles,
      countPerAngle,
      style,
      aspectRatio,
      quality
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('生成分镜失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '分镜生成失败',
        raw: error.message
      }
    });
  }
});

/**
 * @route   POST /api/v1/storyboards/generate-async
 * @desc    生成分镜（异步）
 * @access  Private
 */
router.post('/generate-async', async (req, res) => {
  try {
    const {
      projectId,
      sceneId,
      sceneDescription,
      characters,
      action,
      cameraAngles,
      countPerAngle,
      style,
      aspectRatio,
      quality
    } = req.body;

    // 参数验证（同上）
    if (!projectId || !sceneId || !sceneDescription || !characters || !action) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必要参数' }
      });
    }

    const result = await getService().generateStoryboardAsync({
      projectId,
      sceneId,
      sceneDescription,
      characters,
      action,
      cameraAngles,
      countPerAngle,
      style,
      aspectRatio,
      quality
    });

    res.status(202).json(result);
  } catch (error) {
    console.error('异步生成分镜失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '任务提交失败' }
    });
  }
});

/**
 * @route   GET /api/v1/storyboards/tasks/:taskId
 * @desc    查询任务状态
 * @access  Private
 */
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const result = await getService().getTaskStatus(taskId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('查询任务状态失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '查询失败' }
    });
  }
});

/**
 * @route   GET /api/v1/storyboards/:storyboardId
 * @desc    获取分镜详情
 * @access  Private
 */
router.get('/:storyboardId', async (req, res) => {
  try {
    const { storyboardId } = req.params;
    const result = await getService().getStoryboard(storyboardId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('获取分镜详情失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取失败' }
    });
  }
});

/**
 * @route   PATCH /api/v1/storyboards/:storyboardId/select
 * @desc    选择分镜图像
 * @access  Private
 */
router.patch('/:storyboardId/select', async (req, res) => {
  try {
    const { storyboardId } = req.params;
    const { imageId, cameraAngle } = req.body;

    if (!imageId || !cameraAngle) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少 imageId 或 cameraAngle' }
      });
    }

    const result = await getService().selectImage(storyboardId, imageId, cameraAngle);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('选择分镜图像失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '选择失败' }
    });
  }
});

/**
 * @route   POST /api/v1/storyboards/:storyboardId/regenerate
 * @desc    重新生成分镜
 * @access  Private
 */
router.post('/:storyboardId/regenerate', async (req, res) => {
  try {
    const { storyboardId } = req.params;
    const { cameraAngles, count, seed } = req.body;

    if (!cameraAngles || !Array.isArray(cameraAngles)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'cameraAngles 不能为空' }
      });
    }

    const result = await getService().regenerateStoryboard(storyboardId, {
      cameraAngles,
      count,
      seed
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('重新生成分镜失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '重新生成失败' }
    });
  }
});

/**
 * @route   GET /api/v1/storyboards
 * @desc    获取分镜列表（按项目或场景）
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { projectId, sceneId, page = 1, limit = 20 } = req.query;

    if (!projectId && !sceneId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '需要提供 projectId 或 sceneId' }
      });
    }

    // TODO: 实现列表查询
    res.json({
      success: true,
      data: {
        storyboards: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0
        }
      }
    });
  } catch (error) {
    console.error('获取分镜列表失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取列表失败' }
    });
  }
});

module.exports = router;
