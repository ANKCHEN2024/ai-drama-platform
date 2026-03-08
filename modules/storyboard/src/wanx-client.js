/**
 * 阿里通义万相 API 客户端
 * 
 * 负责与阿里云 DashScope API 交互，生成分镜图像
 * 
 * @module services/wanx-client
 */

const crypto = require('crypto');
const axios = require('axios');

class WanXClient {
  constructor(config = {}) {
    this.accessKeyId = config.accessKeyId || process.env.ALIYUN_ACCESS_KEY_ID;
    this.accessKeySecret = config.accessKeySecret || process.env.ALIYUN_ACCESS_KEY_SECRET;
    this.endpoint = config.endpoint || 'https://dashscope.aliyuncs.com';
    this.timeout = config.timeout || 60000; // 60 秒超时
    
    if (!this.accessKeyId || !this.accessKeySecret) {
      throw new Error('阿里云 API 密钥未配置');
    }
  }

  /**
   * 生成图像（文生图）
   * 
   * @param {Object} options - 生成选项
   * @param {string} options.prompt - 正向提示词
   * @param {string} options.negativePrompt - 负面提示词
   * @param {string} options.size - 图像尺寸 (1024*1024, 720*1280, 1280*720)
   * @param {number} options.count - 生成数量 (1-4)
   * @param {number} options.seed - 随机种子 (可选，用于一致性控制)
   * @param {string} options.style - 风格 (<auto>, <photographic>, <anime>, etc.)
   * @param {string} options.referenceImage - 参考图 URL (可选)
   * @param {number} options.referenceStrength - 参考强度 0-1 (可选)
   * 
   * @returns {Promise<Object>} 任务 ID 和结果
   */
  async generateImage(options) {
    const {
      prompt,
      negativePrompt = '',
      size = '1024*1024',
      count = 4,
      seed,
      style = '<auto>',
      referenceImage,
      referenceStrength = 0.7
    } = options;

    // 构建请求体
    const requestBody = {
      model: 'wanx-v1',
      input: {
        prompt: prompt,
        negative_prompt: negativePrompt
      },
      parameters: {
        style: style,
        size: size,
        n: Math.min(count, 4), // 最多 4 张
        seed: seed || this._generateSeed()
      }
    };

    // 如果有参考图，添加到请求
    if (referenceImage) {
      requestBody.input.ref_img = referenceImage;
      requestBody.parameters.ref_strength = referenceStrength;
    }

    try {
      // 调用异步生成 API
      const response = await axios.post(
        `${this.endpoint}/api/v1/services/aigc/text-generation/generation`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.accessKeySecret}`,
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable'
          },
          timeout: this.timeout
        }
      );

      const taskId = response.data.output.task_id;
      
      return {
        success: true,
        taskId,
        message: '任务已提交，请轮询查询结果'
      };
    } catch (error) {
      return this._handleError(error);
    }
  }

  /**
   * 查询任务状态
   * 
   * @param {string} taskId - 任务 ID
   * @returns {Promise<Object>} 任务状态和结果
   */
  async queryTask(taskId) {
    try {
      const response = await axios.get(
        `${this.endpoint}/api/v1/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessKeySecret}`
          },
          timeout: 30000
        }
      );

      const { task_status, results, message } = response.data.output;

      const statusMap = {
        'PENDING': 'pending',
        'RUNNING': 'running',
        'SUCCEEDED': 'succeeded',
        'FAILED': 'failed',
        'CANCELED': 'canceled'
      };

      return {
        success: true,
        status: statusMap[task_status] || 'unknown',
        images: results ? results.map(r => r.url) : [],
        message: message || ''
      };
    } catch (error) {
      return this._handleError(error);
    }
  }

  /**
   * 等待任务完成（轮询）
   * 
   * @param {string} taskId - 任务 ID
   * @param {Object} options - 轮询选项
   * @param {number} options.interval - 轮询间隔 (毫秒)
   * @param {number} options.timeout - 超时时间 (毫秒)
   * @returns {Promise<Object>} 最终结果
   */
  async waitForCompletion(taskId, options = {}) {
    const {
      interval = 3000,  // 3 秒
      timeout = 120000  // 2 分钟
    } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await this.queryTask(taskId);
      
      if (!result.success) {
        return result;
      }

      if (result.status === 'succeeded') {
        return {
          success: true,
          status: 'completed',
          images: result.images
        };
      }

      if (result.status === 'failed' || result.status === 'canceled') {
        return {
          success: false,
          status: result.status,
          message: result.message
        };
      }

      // 等待下一次轮询
      await this._sleep(interval);
    }

    return {
      success: false,
      status: 'timeout',
      message: '任务超时'
    };
  }

  /**
   * 批量生成图像（多个提示词）
   * 
   * @param {Array<string>} prompts - 提示词数组
   * @param {Object} options - 生成选项
   * @returns {Promise<Array>} 所有任务结果
   */
  async batchGenerate(prompts, options = {}) {
    const tasks = prompts.map(prompt => 
      this.generateImage({ ...options, prompt })
    );

    const results = await Promise.allSettled(tasks);
    
    return results.map((result, index) => ({
      prompt: prompts[index],
      success: result.status === 'fulfilled',
      value: result.status === 'fulfilled' ? result.value : null,
      reason: result.status === 'rejected' ? result.reason.message : null
    }));
  }

  /**
   * 生成一致性种子值
   * 
   * @param {string} identifier - 标识符 (如人物 ID)
   * @param {string} projectSeed - 项目种子
   * @returns {number} 种子值
   */
  generateConsistentSeed(identifier, projectSeed = '') {
    const hash = crypto.createHash('md5');
    hash.update(identifier + projectSeed);
    return parseInt(hash.digest('hex').substring(0, 8), 16);
  }

  /**
   * 构建镜头角度提示词
   * 
   * @param {string} cameraAngle - 镜头角度
   * @returns {string} 镜头描述
   */
  buildCameraAnglePrompt(cameraAngle) {
    const anglePrompts = {
      'extreme_long_shot': '大远景镜头，展现宏大的环境，人物在画面中很小，强调场景规模，电影感构图',
      'long_shot': '远景镜头，展示人物全身和周围环境，人物占画面约 25%，环境细节清晰',
      'full_shot': '全景镜头，人物全身在画面中，清晰展示人物和环境关系，标准电影镜头',
      'medium_long_shot': '中全景镜头，人物膝盖以上，兼顾人物动作和环境',
      'medium_shot': '中景镜头，人物腰部以上，突出人物表情和上半身动作，经典对话镜头',
      'medium_close_up': '中近景镜头，人物胸部以上，强调面部表情和情感',
      'close_up': '近景镜头，人物肩部以上，聚焦面部表情，情感强烈',
      'extreme_close_up': '特写镜头，聚焦人物面部局部或眼睛/嘴巴，极致情感表达，细节丰富'
    };

    return anglePrompts[cameraAngle] || anglePrompts['medium_shot'];
  }

  /**
   * 构建完整提示词
   * 
   * @param {Object} options - 提示词组件
   * @returns {string} 完整提示词
   */
  buildPrompt(options) {
    const {
      sceneDescription,
      characters,
      action,
      cameraAngle,
      style = '电影感写实',
      aspectRatio = '16:9',
      quality = 'high'
    } = options;

    // 镜头角度描述
    const anglePrompt = this.buildCameraAnglePrompt(cameraAngle);

    // 人物描述
    const charPrompts = characters.map(char => {
      const parts = [
        char.name,
        `${char.appearance.age}岁`,
        char.appearance.gender === 'male' ? '男性' : '女性',
        char.hairstyle.color + char.hairstyle.style,
        char.outfit.top,
        char.outfit.bottom,
        char.expression,
        char.pose
      ];
      return parts.join('，');
    }).join('，');

    // 质量修饰词
    const qualityModifiers = {
      'standard': '高质量',
      'high': '专业摄影，8K 分辨率，细节丰富',
      'ultra': '大师级摄影，8K 超高清，极致细节，电影级调色'
    };

    // 组合完整提示词
    const prompt = `${style}风格，${anglePrompt}，${sceneDescription}，${charPrompts}，${action}，${qualityModifiers[quality] || qualityModifiers['high']}`;

    return prompt;
  }

  /**
   * 获取默认负面提示词
   * 
   * @returns {string} 负面提示词
   */
  getDefaultNegativePrompt() {
    return '模糊，低质量，变形，畸变，多余手指，多余肢体，水印，文字，签名，logo，卡通，动画，3D 渲染，过曝，欠曝，噪点，色偏，不自然，丑陋，恐怖';
  }

  /**
   * 生成随机种子
   * 
   * @private
   * @returns {number} 随机种子
   */
  _generateSeed() {
    return Math.floor(Math.random() * 2147483647);
  }

  /**
   * 延迟函数
   * 
   * @private
   * @param {number} ms - 毫秒数
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 错误处理
   * 
   * @private
   * @param {Error} error - 错误对象
   * @returns {Object} 错误响应
   */
  _handleError(error) {
    const errorCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message;

    const errorMap = {
      400: { code: 'INVALID_REQUEST', message: '请求参数错误' },
      401: { code: 'AUTH_FAILED', message: '认证失败，请检查 API 密钥' },
      429: { code: 'RATE_LIMIT', message: 'API 调用频率超限' },
      500: { code: 'SERVER_ERROR', message: '服务器内部错误' },
      503: { code: 'SERVICE_UNAVAILABLE', message: '服务暂时不可用' }
    };

    const mappedError = errorMap[errorCode] || {
      code: 'UNKNOWN_ERROR',
      message: errorMessage
    };

    return {
      success: false,
      error: {
        code: mappedError.code,
        message: mappedError.message,
        raw: errorMessage
      }
    };
  }
}

module.exports = WanXClient;
