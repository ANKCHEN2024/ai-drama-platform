/**
 * Character Builder Module
 * 人物构建模块 - AI 短剧平台
 * 
 * @author Subagent-03
 * @version 1.0.0
 */

const Dashscope = require('dashscope');
const { v4: uuidv4 } = require('uuid');
const prompts = require('./prompts');
const analyzer = require('./analyzer');
const profile = require('./profile');
const consistency = require('./consistency');

class CharacterBuilder {
  /**
   * 创建人物构建器实例
   * @param {Object} options - 配置选项
   * @param {string} options.apiKey - 阿里通义千问 API Key
   * @param {string} options.model - 模型名称 (默认：qwen-plus)
   * @param {number} options.temperature - 温度参数 (默认：0.7)
   * @param {number} options.maxTokens - 最大 token 数 (默认：3000)
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.DASHSCOPE_API_KEY;
    this.model = options.model || 'qwen-plus';
    this.temperature = options.temperature || 0.7;
    this.maxTokens = options.maxTokens || 3000;

    if (!this.apiKey) {
      throw new Error('DASHSCOPE_API_KEY is required. Set it via options or environment variable.');
    }

    // 初始化 Dashscope 客户端
    this.client = new Dashscope({ apiKey: this.apiKey });
  }

  /**
   * 从故事文本分析人物
   * @param {string} text - 故事文本或人物描述
   * @param {Object} options - 分析选项
   * @returns {Promise<Object>} 人物分析结果
   */
  async analyze(text, options = {}) {
    const startTime = Date.now();
    
    try {
      // 验证输入
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Invalid input: text must be a non-empty string');
      }

      // 调用分析器
      const analysisResult = await analyzer.analyzeText(this.client, text, {
        model: options.model || this.model,
        temperature: options.temperature || this.temperature,
        maxTokens: options.maxTokens || this.maxTokens,
        extractRelationships: options.extractRelationships !== false,
        generateConsistency: options.generateConsistency !== false
      });

      // 处理结果
      const characters = analysisResult.characters.map(char => ({
        ...char,
        id: char.id || `char_${uuidv4().substring(0, 8)}`,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'story_text_analysis',
          confidence: analysisResult.metadata?.confidence || 0.85,
          version: 1
        }
      }));

      return {
        success: true,
        data: {
          characters,
          metadata: {
            processingTime: Date.now() - startTime,
            model: this.model,
            tokensUsed: analysisResult.metadata?.tokensUsed || 0,
            characterCount: characters.length
          }
        },
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: {
          code: error.code || 'ANALYSIS_ERROR',
          message: error.message,
          details: error.details
        }
      };
    }
  }

  /**
   * 生成人物一致性描述
   * @param {Object} character - 人物档案
   * @param {Object} options - 生成选项
   * @returns {Promise<Object>} 一致性描述
   */
  async generateConsistency(character, options = {}) {
    try {
      const result = await consistency.generate(this.client, character, {
        model: options.model || this.model,
        scene: options.scene,
        emotion: options.emotion
      });

      return {
        success: true,
        data: result,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: {
          code: error.code || 'CONSISTENCY_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * 更新人物档案
   * @param {string} characterId - 人物 ID
   * @param {Object} updates - 更新内容
   * @returns {Promise<Object>} 更新结果
   */
  async updateCharacter(characterId, updates) {
    try {
      const updatedProfile = await profile.update(characterId, updates);
      
      return {
        success: true,
        data: {
          id: characterId,
          updatedAt: new Date().toISOString(),
          changes: Object.keys(updates)
        },
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: {
          code: error.code || 'UPDATE_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * 批量分析多个文本片段
   * @param {string[]} texts - 文本数组
   * @param {Object} options - 分析选项
   * @returns {Promise<Object>} 合并后的人物分析结果
   */
  async batchAnalyze(texts, options = {}) {
    const startTime = Date.now();
    
    try {
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error('Invalid input: texts must be a non-empty array');
      }

      // 逐个分析
      const results = [];
      for (const text of texts) {
        const result = await this.analyze(text, options);
        if (result.success) {
          results.push(result.data);
        }
      }

      // 合并人物（如果启用）
      let characters = [];
      if (options.mergeCharacters !== false) {
        characters = await profile.mergeCharacters(results.flatMap(r => r.characters));
      } else {
        characters = results.flatMap(r => r.characters);
      }

      return {
        success: true,
        data: {
          characters,
          metadata: {
            processingTime: Date.now() - startTime,
            textsProcessed: texts.length,
            characterCount: characters.length,
            mergedCount: options.mergeCharacters !== false ? characters.length : 0
          }
        },
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: {
          code: error.code || 'BATCH_ANALYSIS_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * 获取提示词模板
   * @param {string} type - 模板类型
   * @returns {string} 提示词模板
   */
  getPromptTemplate(type) {
    return prompts.getTemplate(type);
  }
}

// 导出
module.exports = CharacterBuilder;

// 便捷导出
module.exports.CharacterBuilder = CharacterBuilder;
module.exports.analyzer = analyzer;
module.exports.profile = profile;
module.exports.consistency = consistency;
module.exports.prompts = prompts;
