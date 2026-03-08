/**
 * Scene Builder - 场景构建模块入口
 * 
 * @module scene-builder
 * @author AI 短剧平台开发团队
 * @version 1.0.0
 */

const SceneAnalyzer = require('./analyzer');
const ConsistencyEngine = require('./consistency');
const SceneStorage = require('./storage');
const promptTemplates = require('./prompt-templates');

class SceneBuilder {
  /**
   * 创建场景构建器实例
   * @param {Object} options - 配置选项
   * @param {string} options.apiKey - 阿里通义千问 API Key
   * @param {string} options.model - 模型名称（默认：qwen-plus）
   * @param {Object} options.storage - 存储配置
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.DASHSCOPE_API_KEY;
    this.model = options.model || 'qwen-plus';
    
    // 初始化子模块
    this.analyzer = new SceneAnalyzer({
      apiKey: this.apiKey,
      model: this.model
    });
    
    this.consistency = new ConsistencyEngine();
    this.storage = new SceneStorage(options.storage);
    this.prompts = promptTemplates;
  }

  /**
   * 分析剧本生成场景描述
   * @param {string} script - 剧本片段或分镜描述
   * @param {Object} options - 选项
   * @param {string} options.sceneId - 场景 ID（用于一致性）
   * @param {string} options.episodeId - 集数 ID
   * @param {string} options.style - 风格指定
   * @returns {Promise<SceneDescription>} 场景描述对象
   */
  async analyze(script, options = {}) {
    // 1. 基础分析
    const analysis = await this.analyzer.analyze(script, {
      style: options.style
    });

    // 2. 一致性检查（如果提供了 sceneId）
    if (options.sceneId) {
      const existingScene = await this.storage.getScene(options.sceneId);
      if (existingScene) {
        const consistencyCheck = await this.consistency.check(
          existingScene,
          analysis
        );
        
        if (!consistencyCheck.isConsistent) {
          // 应用一致性修正
          analysis = this.consistency.applyFixes(
            analysis,
            existingScene,
            consistencyCheck.suggestions
          );
        }
      }
    }

    // 3. 生成场景 ID
    const sceneId = options.sceneId || this.generateSceneId();
    
    // 4. 组装完整场景描述
    const sceneDescription = {
      sceneId,
      episodeId: options.episodeId,
      ...analysis,
      metadata: {
        shotIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft'
      }
    };

    return sceneDescription;
  }

  /**
   * 生成场景图像
   * @param {SceneDescription} description - 场景描述
   * @param {Object} options - 选项
   * @param {number} options.width - 图像宽度
   * @param {number} options.height - 图像高度
   * @param {number} options.seed - 随机种子
   * @returns {Promise<{imageUrl: string, seed: number}>}
   */
  async generateImage(description, options = {}) {
    const imagePrompt = description.imagePrompt;
    const negativePrompt = description.negativePrompt || 
      '模糊、低质量、变形、多余的手指、文字、水印';
    
    const seed = options.seed || description.consistency?.baseSeed || 
      Math.floor(Math.random() * 1000000);
    
    // 调用阿里通义万相 API 生成图像
    const result = await this.analyzer.generateImage({
      prompt: imagePrompt,
      negativePrompt,
      seed,
      width: options.width || 1920,
      height: options.height || 1080,
      model: process.env.WANX_MODEL || 'wanx-v1'
    });

    return {
      imageUrl: result.url,
      seed,
      width: options.width || 1920,
      height: options.height || 1080,
      model: process.env.WANX_MODEL || 'wanx-v1',
      generationTime: result.generationTime
    };
  }

  /**
   * 保存场景到存储
   * @param {SceneDescription} scene - 场景描述
   * @returns {Promise<void>}
   */
  async saveScene(scene) {
    await this.storage.saveScene(scene);
  }

  /**
   * 查询场景
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Scene[]>}
   */
  async queryScenes(filters = {}) {
    return await this.storage.queryScenes(filters);
  }

  /**
   * 获取场景详情
   * @param {string} sceneId - 场景 ID
   * @returns {Promise<SceneDescription>}
   */
  async getScene(sceneId) {
    return await this.storage.getScene(sceneId);
  }

  /**
   * 检查场景一致性
   * @param {string} referenceSceneId - 参考场景 ID
   * @param {SceneDescription} newScene - 新场景描述
   * @returns {Promise<ConsistencyResult>}
   */
  async checkConsistency(referenceSceneId, newScene) {
    const referenceScene = await this.storage.getScene(referenceSceneId);
    return await this.consistency.check(referenceScene, newScene);
  }

  /**
   * 生成场景 ID
   * @returns {string}
   */
  generateSceneId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `scene_${timestamp}_${random}`;
  }

  /**
   * 获取提示词模板
   * @param {string} name - 模板名称
   * @returns {string}
   */
  getPromptTemplate(name) {
    return this.prompts[name];
  }
}

// 导出
module.exports = SceneBuilder;
module.exports.SceneAnalyzer = SceneAnalyzer;
module.exports.ConsistencyEngine = ConsistencyEngine;
module.exports.SceneStorage = SceneStorage;
module.exports.promptTemplates = promptTemplates;
