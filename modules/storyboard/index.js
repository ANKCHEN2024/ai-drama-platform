/**
 * 分镜生成模块入口
 * 
 * AI 短剧平台 - 分镜生成模块
 * 
 * @module storyboard
 * 
 * @example
 * const storyboard = require('./modules/storyboard');
 * 
 * // 初始化
 * await storyboard.init({
 *   aliyun: { accessKeyId, accessKeySecret },
 *   storage: minioClient,
 *   db: database
 * });
 * 
 * // 生成分镜
 * const result = await storyboard.generate({
 *   projectId: 'proj_123',
 *   sceneId: 'scene_456',
 *   sceneDescription: '现代化办公室',
 *   characters: [...],
 *   action: '主角走向办公桌',
 *   cameraAngles: ['full_shot', 'medium_shot', 'close_up']
 * });
 */

const StoryboardService = require('./src/storyboard-service');
const WanXClient = require('./src/wanx-client');
const ConsistencyController = require('./src/consistency-controller');
const types = require('./src/types');
const routes = require('./src/routes');

let initialized = false;
let config = {};

/**
 * 初始化模块
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.aliyun - 阿里云配置
 * @param {Object} options.storage - 存储配置 (MinIO)
 * @param {Object} options.db - 数据库配置
 * @param {Object} options.consistency - 一致性控制配置
 */
function init(options = {}) {
  config = {
    aliyun: options.aliyun || {
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET
    },
    storage: options.storage || null,
    db: options.db || null,
    consistency: options.consistency || {
      threshold: 85
    }
  };

  // 验证必要配置
  if (!config.aliyun.accessKeyId || !config.aliyun.accessKeySecret) {
    throw new Error('阿里云 API 密钥未配置');
  }

  initialized = true;
  console.log('[Storyboard Module] 初始化完成');
}

/**
 * 获取服务实例
 * 
 * @returns {StoryboardService} 分镜服务实例
 */
function getService() {
  if (!initialized) {
    init();
  }

  return new StoryboardService({
    aliyun: config.aliyun,
    storage: config.storage,
    db: config.db
  });
}

/**
 * 获取一致性控制器实例
 * 
 * @returns {ConsistencyController} 一致性控制器实例
 */
function getConsistencyController() {
  return new ConsistencyController(config.consistency);
}

/**
 * 获取通义万相客户端实例
 * 
 * @returns {WanXClient} 通义万相客户端实例
 */
function getWanXClient() {
  return new WanXClient(config.aliyun);
}

module.exports = {
  // 初始化
  init,
  
  // 服务实例
  getService,
  getConsistencyController,
  getWanXClient,
  
  // 类型导出
  types,
  
  // API 路由
  routes,
  
  // 便捷方法
  generate: async (request) => {
    const service = getService();
    return service.generateStoryboard(request);
  },
  
  generateAsync: async (request) => {
    const service = getService();
    return service.generateStoryboardAsync(request);
  },
  
  getStoryboard: async (storyboardId) => {
    const service = getService();
    return service.getStoryboard(storyboardId);
  },
  
  selectImage: async (storyboardId, imageId, cameraAngle) => {
    const service = getService();
    return service.selectImage(storyboardId, imageId, cameraAngle);
  },
  
  regenerate: async (storyboardId, options) => {
    const service = getService();
    return service.regenerateStoryboard(storyboardId, options);
  },
  
  // 常量导出
  CameraAngle: types.CameraAngle,
  StoryboardStatus: types.StoryboardStatus,
  QualityLevel: types.QualityLevel,
  AspectRatio: types.AspectRatio
};
