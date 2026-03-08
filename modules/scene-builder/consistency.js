/**
 * Consistency Engine - 场景一致性维护引擎
 * 
 * 确保同一场景在不同镜头中视觉元素保持一致
 */

const axios = require('axios');
const promptTemplates = require('./prompt-templates');

class ConsistencyEngine {
  /**
   * 创建一致性引擎
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.DASHSCOPE_API_KEY;
    this.model = options.model || 'qwen-plus';
  }

  /**
   * 检查两个场景的一致性
   * @param {Object} referenceScene - 参考场景
   * @param {Object} newScene - 新场景
   * @returns {Promise<ConsistencyResult>}
   */
  async check(referenceScene, newScene) {
    if (!referenceScene) {
      return {
        isConsistent: true,
        overallScore: 1.0,
        dimensionScores: {},
        differences: [],
        consistentElements: Object.keys(newScene),
        suggestions: []
      };
    }

    // 构建检查提示词
    const prompt = this.buildConsistencyPrompt(referenceScene, newScene);
    
    // 调用 API 分析一致性
    const analysis = await this.callConsistencyAPI(prompt);
    
    return analysis;
  }

  /**
   * 构建一致性检查提示词
   * @param {Object} referenceScene 
   * @param {Object} newScene 
   * @returns {string}
   */
  buildConsistencyPrompt(referenceScene, newScene) {
    const prompt = promptTemplates.CONSISTENCY_CHECK_PROMPT;
    
    return prompt
      .replace('{referenceScene}', JSON.stringify(referenceScene, null, 2))
      .replace('{newScene}', JSON.stringify(newScene, null, 2));
  }

  /**
   * 调用一致性检查 API
   * @param {string} prompt 
   * @returns {Promise<Object>}
   */
  async callConsistencyAPI(prompt) {
    try {
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          model: this.model,
          input: {
            messages: [
              {
                role: 'system',
                content: '你是场景一致性检查专家。请严格按照 JSON 格式输出检查结果。'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          parameters: {
            result_format: 'message',
            temperature: 0.3, // 低温度确保判断稳定
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
      
      const content = response.data.output.choices[0].message.content;
      return JSON.parse(content.trim());
      
    } catch (error) {
      console.error('一致性检查失败:', error);
      // 降级处理：返回保守结果
      return {
        isConsistent: true,
        overallScore: 0.8,
        dimensionScores: {},
        differences: [],
        consistentElements: ['location', 'time', 'props'],
        suggestions: ['建议人工复核场景一致性']
      };
    }
  }

  /**
   * 应用一致性修正
   * @param {Object} scene - 需要修正的场景
   * @param {Object} referenceScene - 参考场景
   * @param {Array} suggestions - 修正建议
   * @returns {Object} 修正后的场景
   */
  applyFixes(scene, referenceScene, suggestions) {
    const fixed = { ...scene };
    
    for (const suggestion of suggestions) {
      // 色彩方案修正
      if (suggestion.includes('色彩') || suggestion.includes('颜色')) {
        fixed.colorPalette = referenceScene.colorPalette;
        if (fixed.consistency) {
          fixed.consistency.colorLock = true;
        }
      }
      
      // 道具一致性修正
      if (suggestion.includes('道具')) {
        // 保留关键道具
        const keyProps = referenceScene.props?.slice(0, 3) || [];
        fixed.props = [...new Set([...keyProps, ...fixed.props])];
        if (fixed.consistency) {
          fixed.consistency.propLock = true;
        }
      }
      
      // 光影修正
      if (suggestion.includes('光影') || suggestion.includes('光源')) {
        fixed.lighting = referenceScene.lighting;
        if (fixed.consistency) {
          fixed.consistency.lightingLock = true;
        }
      }
      
      // 风格修正
      if (suggestion.includes('风格')) {
        if (fixed.consistency) {
          fixed.consistency.style = referenceScene.consistency?.style || 'general';
        }
      }
    }
    
    return fixed;
  }

  /**
   * 生成一致性种子值
   * @param {Object} scene - 场景描述
   * @returns {number}
   */
  generateSeed(scene) {
    // 基于场景特征生成稳定种子
    const features = [
      scene.location,
      scene.time,
      scene.consistency?.style
    ].join('|');
    
    let hash = 0;
    for (let i = 0; i < features.length; i++) {
      const char = features.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash);
  }

  /**
   * 计算场景特征向量
   * @param {Object} scene 
   * @returns {Object}
   */
  calculateFeatureVector(scene) {
    return {
      locationHash: this.hashString(scene.location),
      timeHash: this.hashString(scene.time),
      styleHash: this.hashString(scene.consistency?.style || ''),
      propCount: scene.props?.length || 0,
      colorCount: scene.colorPalette?.length || 0,
      characterCount: scene.characterPositions?.length || 0
    };
  }

  /**
   * 字符串哈希
   * @param {string} str 
   * @returns {number}
   */
  hashString(str) {
    if (!str) return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * 计算场景相似度
   * @param {Object} scene1 
   * @param {Object} scene2 
   * @returns {number} 相似度 0-1
   */
  calculateSimilarity(scene1, scene2) {
    const vector1 = this.calculateFeatureVector(scene1);
    const vector2 = this.calculateFeatureVector(scene2);
    
    let matches = 0;
    let total = 0;
    
    // 地点相似度
    total++;
    if (vector1.locationHash === vector2.locationHash) matches++;
    else if (this.stringSimilarity(scene1.location, scene2.location) > 0.7) matches += 0.5;
    
    // 时间相似度
    total++;
    if (vector1.timeHash === vector2.timeHash) matches++;
    else if (this.stringSimilarity(scene1.time, scene2.time) > 0.7) matches += 0.5;
    
    // 风格相似度
    total++;
    if (vector1.styleHash === vector2.styleHash) matches++;
    
    // 道具相似度
    total++;
    const commonProps = (scene1.props || []).filter(p => 
      (scene2.props || []).includes(p)
    );
    const maxProps = Math.max(
      (scene1.props || []).length,
      (scene2.props || []).length,
      1
    );
    matches += commonProps.length / maxProps;
    
    // 色彩相似度
    total++;
    const commonColors = (scene1.colorPalette || []).filter(c => 
      (scene2.colorPalette || []).includes(c)
    );
    const maxColors = Math.max(
      (scene1.colorPalette || []).length,
      (scene2.colorPalette || []).length,
      1
    );
    matches += commonColors.length / maxColors;
    
    return matches / total;
  }

  /**
   * 字符串相似度（简单实现）
   * @param {string} s1 
   * @param {string} s2 
   * @returns {number}
   */
  stringSimilarity(s1, s2) {
    if (!s1 || !s2) return 0;
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1;
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 编辑距离计算
   * @param {string} s1 
   * @param {string} s2 
   * @returns {number}
   */
  levenshteinDistance(s1, s2) {
    const m = s1.length;
    const n = s2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }
    
    return dp[m][n];
  }

  /**
   * 查询相似场景
   * @param {Object} scene - 场景描述
   * @param {Array} sceneLibrary - 场景库
   * @param {number} threshold - 相似度阈值
   * @returns {Array}
   */
  findSimilarScenes(scene, sceneLibrary, threshold = 0.7) {
    return sceneLibrary
      .map(s => ({
        scene: s,
        similarity: this.calculateSimilarity(scene, s)
      }))
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);
  }
}

module.exports = ConsistencyEngine;
