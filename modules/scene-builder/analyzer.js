/**
 * Scene Analyzer - 场景分析器
 * 
 * 使用阿里通义千问 API 分析剧本，提取场景要素
 */

const axios = require('axios');
const promptTemplates = require('./prompt-templates');

class SceneAnalyzer {
  /**
   * 创建场景分析器
   * @param {Object} options - 配置选项
   * @param {string} options.apiKey - API Key
   * @param {string} options.model - 模型名称
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.DASHSCOPE_API_KEY;
    this.model = options.model || 'qwen-plus';
    
    this.apiEndpoint = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
  }

  /**
   * 分析剧本生成场景描述
   * @param {string} script - 剧本片段
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 场景分析结果
   */
  async analyze(script, options = {}) {
    // 验证输入
    this.validateScript(script);
    
    // 构建提示词
    const prompt = this.buildAnalysisPrompt(script, options);
    
    // 调用 API
    const response = await this.callQwenAPI(prompt);
    
    // 解析结果
    const analysis = this.parseResponse(response);
    
    // 验证结果
    this.validateAnalysis(analysis);
    
    return analysis;
  }

  /**
   * 验证剧本输入
   * @param {string} script 
   */
  validateScript(script) {
    if (!script || typeof script !== 'string') {
      throw new Error('剧本输入无效');
    }
    
    if (script.trim().length < 20) {
      throw new Error('剧本描述太短，无法分析（至少 20 个字符）');
    }
    
    if (script.trim().length > 5000) {
      throw new Error('剧本描述太长（最多 5000 个字符）');
    }
  }

  /**
   * 构建分析提示词
   * @param {string} script 
   * @param {Object} options 
   * @returns {string}
   */
  buildAnalysisPrompt(script, options = {}) {
    let prompt = promptTemplates.SCENE_ANALYSIS_PROMPT;
    
    // 替换剧本内容
    prompt = prompt.replace('{script}', script);
    
    // 如果有风格指导，使用增强模板
    if (options.style) {
      prompt = promptTemplates.ENHANCED_ANALYSIS_PROMPT
        .replace('{script}', script)
        .replace('{style}', options.style)
        .replace('{reference}', options.reference || '无')
        .replace('{requirements}', options.requirements || '无');
    }
    
    return prompt;
  }

  /**
   * 调用通义千问 API
   * @param {string} prompt 
   * @returns {Promise<string>}
   */
  async callQwenAPI(prompt) {
    try {
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: this.model,
          input: {
            messages: [
              {
                role: 'system',
                content: '你是专业的影视场景分析师。请严格按照 JSON 格式输出分析结果。'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          parameters: {
            result_format: 'message',
            temperature: 0.7,
            max_tokens: 2000
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      return response.data.output.choices[0].message.content;
      
    } catch (error) {
      if (error.response) {
        throw new Error(`API 调用失败：${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('API 调用超时，请重试');
      } else {
        throw new Error(`API 调用失败：${error.message}`);
      }
    }
  }

  /**
   * 解析 API 响应
   * @param {string} response 
   * @returns {Object}
   */
  parseResponse(response) {
    try {
      // 清理响应文本（移除 markdown 代码块标记）
      let cleaned = response.trim();
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      
      // 解析 JSON
      const analysis = JSON.parse(cleaned);
      
      return analysis;
      
    } catch (error) {
      console.error('解析响应失败:', response);
      throw new Error(`场景分析结果解析失败：${error.message}`);
    }
  }

  /**
   * 验证分析结果
   * @param {Object} analysis 
   */
  validateAnalysis(analysis) {
    const requiredFields = ['location', 'time', 'imagePrompt'];
    
    for (const field of requiredFields) {
      if (!analysis[field]) {
        throw new Error(`分析结果缺少必要字段：${field}`);
      }
    }
    
    // 验证字段类型
    if (typeof analysis.location !== 'string') {
      throw new Error('location 必须是字符串');
    }
    
    if (!Array.isArray(analysis.props)) {
      analysis.props = [];
    }
    
    if (!Array.isArray(analysis.characterPositions)) {
      analysis.characterPositions = [];
    }
    
    // 验证色彩方案
    if (Array.isArray(analysis.colorPalette)) {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      analysis.colorPalette = analysis.colorPalette.filter(color => 
        typeof color === 'string' && hexRegex.test(color)
      );
    } else {
      analysis.colorPalette = [];
    }
  }

  /**
   * 生成场景图像（调用通义万相）
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async generateImage(options) {
    const { prompt, negativePrompt, seed, width, height, model } = options;
    
    try {
      // 调用通义万相 API
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-to-image/generation',
        {
          model: model || 'wanx-v1',
          input: {
            prompt: prompt,
            negative_prompt: negativePrompt
          },
          parameters: {
            style: '<auto>',
            size: `${width}*${height}`,
            n: 1,
            seed: seed
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable'
          },
          timeout: 60000
        }
      );
      
      // 异步任务需要轮询结果
      const taskId = response.data.output.task_id;
      return await this.pollImageTask(taskId);
      
    } catch (error) {
      throw new Error(`图像生成失败：${error.message}`);
    }
  }

  /**
   * 轮询图像生成任务
   * @param {string} taskId 
   * @returns {Promise<Object>}
   */
  async pollImageTask(taskId) {
    const maxAttempts = 30;
    const interval = 2000; // 2 秒
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, interval));
      
      const response = await axios.get(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      const taskStatus = response.data.output.task_status;
      
      if (taskStatus === 'SUCCEEDED') {
        return {
          url: response.data.output.results[0].url,
          generationTime: i * interval / 1000
        };
      } else if (taskStatus === 'FAILED') {
        throw new Error('图像生成任务失败');
      }
    }
    
    throw new Error('图像生成任务超时');
  }

  /**
   * 检测场景风格
   * @param {Object} analysis 
   * @returns {string}
   */
  detectStyle(analysis) {
    const location = analysis.location.toLowerCase();
    const atmosphere = analysis.atmosphere?.toLowerCase() || '';
    
    // 基于地点判断
    if (location.includes('办公室') || location.includes('办公')) {
      return 'modern_office';
    }
    if (location.includes('家') || location.includes('卧室') || location.includes('客厅')) {
      return 'home_warm';
    }
    if (location.includes('街道') && (atmosphere.includes('神秘') || atmosphere.includes('黑暗'))) {
      return 'mystery_dark';
    }
    if (atmosphere.includes('浪漫')) {
      return 'romantic_soft';
    }
    if (atmosphere.includes('恐怖') || atmosphere.includes('惊悚')) {
      return 'horror_gloomy';
    }
    
    return 'general';
  }
}

module.exports = SceneAnalyzer;
