/**
 * 核心故事分析器
 * Story Analyzer Core
 */

const crypto = require('crypto');

class StoryAnalyzer {
  constructor(client, promptManager, parser, validator, config) {
    this.client = client;
    this.promptManager = promptManager;
    this.parser = parser;
    this.validator = validator;
    this.config = config;
    this.cache = new Map(); // 简单内存缓存，生产环境用 Redis
    this.history = new Map();
  }

  /**
   * 分析单个故事
   */
  async analyze(text, options = {}) {
    const startTime = Date.now();
    const analysisId = this.generateId();

    try {
      // 1. 输入验证
      if (!text || typeof text !== 'string') {
        throw new Error('INVALID_INPUT: 文本不能为空');
      }

      if (text.length > this.config.maxTextLength) {
        throw new Error(`TEXT_TOO_LONG: 文本超过 ${this.config.maxTextLength} 字符限制`);
      }

      // 2. 检查缓存
      const cacheKey = this.getCacheKey(text, options);
      if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        return {
          success: true,
          data: cached,
          meta: {
            fromCache: true,
            model: this.config.model,
            processingTime: Date.now() - startTime
          }
        };
      }

      // 3. 准备提示词
      const template = this.promptManager.getTemplate('main-analysis');
      const userPrompt = this.promptManager.render(template.user, {
        STORY_TEXT: text
      });

      // 4. 调用通义千问 API
      let response;
      let lastError;
      
      for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
        try {
          response = await this.client.generate({
            messages: [
              { role: 'system', content: template.system },
              { role: 'user', content: userPrompt }
            ],
            parameters: {
              temperature: 0.7,
              max_tokens: 4096,
              result_format: 'json'
            }
          });
          break;
        } catch (error) {
          lastError = error;
          if (attempt < this.config.retryAttempts) {
            await this.sleep(this.config.retryDelay * attempt);
          }
        }
      }

      if (!response) {
        throw new Error(`API_ERROR: 调用失败 - ${lastError?.message}`);
      }

      // 5. 解析响应
      const parsedData = this.parser.parse(response);

      // 6. 验证数据
      const validation = this.validator.validate(parsedData);
      if (!validation.valid) {
        console.warn('数据验证警告:', validation.errors);
      }

      // 7. 构建结果
      const result = {
        analysisId,
        timestamp: Date.now(),
        textLength: text.length,
        ...parsedData
      };

      // 8. 缓存结果
      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, result);
      }

      // 9. 存储历史
      this.history.set(analysisId, {
        ...result,
        text: text.substring(0, 500) // 只存储前 500 字符
      });

      return {
        success: true,
        data: result,
        warnings: validation.errors,
        meta: {
          fromCache: false,
          model: this.config.model,
          tokens: response.usage || {},
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: this.getErrorCode(error.message),
          message: error.message
        },
        data: {
          analysisId,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * 批量分析
   */
  async analyzeBatch(texts, options = {}) {
    const taskId = this.generateId();
    
    // 异步处理
    this.processBatch(taskId, texts, options);

    return {
      success: true,
      data: {
        taskId,
        status: 'pending',
        totalTasks: texts.length,
        estimatedTime: texts.length * 5 // 预估每篇 5 秒
      }
    };
  }

  async processBatch(taskId, texts, options) {
    const results = [];
    
    for (const item of texts) {
      try {
        const result = await this.analyze(item.text, item.options || options);
        results.push({
          id: item.id,
          status: result.success ? 'success' : 'failed',
          data: result.data,
          error: result.error
        });
      } catch (error) {
        results.push({
          id: item.id,
          status: 'failed',
          error: { message: error.message }
        });
      }
    }

    // 存储批处理结果
    this.cache.set(`batch:${taskId}`, {
      taskId,
      status: 'completed',
      progress: 100,
      results,
      completedAt: Date.now()
    });
  }

  /**
   * 获取批处理状态
   */
  async getBatchStatus(taskId) {
    const batchData = this.cache.get(`batch:${taskId}`);
    
    if (!batchData) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: '任务不存在' }
      };
    }

    return {
      success: true,
      data: batchData
    };
  }

  /**
   * 获取历史
   */
  async getHistory(query = {}) {
    const items = Array.from(this.history.values()).map(item => ({
      analysisId: item.analysisId,
      title: item.summary?.title || '未命名',
      textLength: item.textLength,
      timestamp: item.timestamp,
      themes: item.summary?.themes || [],
      genres: item.summary?.genres || []
    }));

    return {
      success: true,
      data: {
        items,
        pagination: {
          page: query.page || 1,
          pageSize: query.pageSize || 20,
          total: items.length,
          totalPages: Math.ceil(items.length / (query.pageSize || 20))
        }
      }
    };
  }

  /**
   * 获取详情
   */
  async getDetail(analysisId) {
    const item = this.history.get(analysisId);
    
    if (!item) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: '分析记录不存在' }
      };
    }

    return {
      success: true,
      data: item
    };
  }

  // 工具方法
  generateId() {
    return `sa_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  getCacheKey(text, options) {
    const keyData = JSON.stringify({ text: text.substring(0, 1000), options });
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  getErrorCode(message) {
    if (message.includes('INVALID_INPUT')) return 'INVALID_INPUT';
    if (message.includes('TEXT_TOO_LONG')) return 'TEXT_TOO_LONG';
    if (message.includes('API_ERROR')) return 'API_ERROR';
    return 'INTERNAL_ERROR';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { StoryAnalyzer };
