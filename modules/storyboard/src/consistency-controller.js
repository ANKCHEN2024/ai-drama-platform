/**
 * 一致性控制器
 * 
 * 负责确保分镜图像的人物和场景一致性
 * 
 * @module services/consistency-controller
 */

const crypto = require('crypto');

class ConsistencyController {
  constructor(config = {}) {
    this.clipModel = config.clipModel; // CLIP 模型（可选，用于视觉相似度计算）
    this.threshold = config.threshold || 85; // 一致性阈值
  }

  /**
   * 生成人物一致性种子
   * 
   * 为同一个人物在不同分镜中生成固定种子
   * 
   * @param {string} characterId - 人物 ID
   * @param {string} projectId - 项目 ID
   * @param {string} version - 版本标识
   * @returns {number} 种子值
   */
  generateCharacterSeed(characterId, projectId, version = 'v1') {
    const hash = crypto.createHash('md5');
    hash.update(`${characterId}:${projectId}:${version}`);
    return parseInt(hash.digest('hex').substring(0, 8), 16);
  }

  /**
   * 生成场景一致性种子
   * 
   * 为同一个场景在不同分镜中生成固定种子
   * 
   * @param {string} sceneId - 场景 ID
   * @param {string} projectId - 项目 ID
   * @param {string} version - 版本标识
   * @returns {number} 种子值
   */
  generateSceneSeed(sceneId, projectId, version = 'v1') {
    const hash = crypto.createHash('md5');
    hash.update(`${sceneId}:${projectId}:${version}`);
    return parseInt(hash.digest('hex').substring(0, 8), 16);
  }

  /**
   * 构建一致性提示词
   * 
   * 在提示词中固定关键特征描述，确保一致性
   * 
   * @param {Object} character - 人物描述
   * @param {Object} scene - 场景描述
   * @returns {Object} 一致性提示词组件
   */
  buildConsistencyPrompts(character, scene) {
    // 提取人物固定特征
    const characterFeatures = [
      `${character.appearance.age}岁`,
      character.appearance.gender === 'male' ? '男性' : '女性',
      character.hairstyle.color + character.hairstyle.style,
      character.outfit.top,
      character.outfit.bottom
    ];

    // 提取场景固定特征
    const sceneFeatures = [
      scene.environment,
      scene.lighting,
      scene.colorTone,
      scene.timeOfDay
    ].filter(Boolean);

    return {
      characterPrompt: characterFeatures.join('，'),
      scenePrompt: sceneFeatures.join('，'),
      combinedPrompt: [...characterFeatures, ...sceneFeatures].join('，')
    };
  }

  /**
   * 计算视觉一致性分数
   * 
   * 使用 CLIP 模型计算两张图像的视觉特征相似度
   * 
   * @param {Buffer} image1Buffer - 图像 1 数据
   * @param {Buffer} image2Buffer - 图像 2 数据
   * @returns {Promise<number>} 一致性分数 (0-100)
   */
  async calculateVisualConsistency(image1Buffer, image2Buffer) {
    if (!this.clipModel) {
      // 如果没有 CLIP 模型，使用简化方法
      return this._calculateHashSimilarity(image1Buffer, image2Buffer);
    }

    try {
      // 使用 CLIP 模型提取特征
      const embedding1 = await this.clipModel.encode(image1Buffer);
      const embedding2 = await this.clipModel.encode(image2Buffer);

      // 计算余弦相似度
      const similarity = this._cosineSimilarity(embedding1, embedding2);
      
      // 转换为 0-100 分数
      return Math.round(similarity * 100 * 100) / 100;
    } catch (error) {
      console.error('CLIP 模型计算失败:', error);
      return this._calculateHashSimilarity(image1Buffer, image2Buffer);
    }
  }

  /**
   * 计算多张图像的平均一致性分数
   * 
   * @param {Array<Buffer>} imageBuffers - 图像数据数组
   * @returns {Promise<Object>} 一致性统计
   */
  async calculateGroupConsistency(imageBuffers) {
    if (imageBuffers.length < 2) {
      return {
        average: 100,
        min: 100,
        max: 100,
        pairwise: []
      };
    }

    const pairwiseScores = [];
    
    // 计算所有图像对的相似度
    for (let i = 0; i < imageBuffers.length; i++) {
      for (let j = i + 1; j < imageBuffers.length; j++) {
        const score = await this.calculateVisualConsistency(
          imageBuffers[i],
          imageBuffers[j]
        );
        pairwiseScores.push({
          image1Index: i,
          image2Index: j,
          score
        });
      }
    }

    const scores = pairwiseScores.map(s => s.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    return {
      average: Math.round(average * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      pairwise: pairwiseScores
    };
  }

  /**
   * 检查一致性是否达标
   * 
   * @param {number} score - 一致性分数
   * @returns {boolean} 是否达标
   */
  isConsistent(score) {
    return score >= this.threshold;
  }

  /**
   * 生成一致性报告
   * 
   * @param {Object} consistencyScores - 一致性分数对象
   * @returns {Object} 一致性报告
   */
  generateConsistencyReport(consistencyScores) {
    const report = {
      overall: {
        average: 0,
        passed: true,
        details: []
      },
      byAngle: {}
    };

    let totalScore = 0;
    let count = 0;

    for (const [angle, scores] of Object.entries(consistencyScores)) {
      const angleReport = {
        angle,
        average: scores.average,
        min: scores.min,
        max: scores.max,
        passed: this.isConsistent(scores.average),
        recommendation: this._getRecommendation(scores.average)
      };

      report.byAngle[angle] = angleReport;
      totalScore += scores.average;
      count++;

      if (!angleReport.passed) {
        report.overall.passed = false;
      }
    }

    report.overall.average = count > 0 ? Math.round((totalScore / count) * 100) / 100 : 0;

    return report;
  }

  /**
   * 根据一致性分数给出建议
   * 
   * @private
   * @param {number} score - 一致性分数
   * @returns {string} 建议
   */
  _getRecommendation(score) {
    if (score >= 90) {
      return '一致性优秀，无需调整';
    } else if (score >= 85) {
      return '一致性良好，可接受';
    } else if (score >= 75) {
      return '一致性一般，建议调整种子值或参考图强度';
    } else {
      return '一致性较差，建议重新生成或使用更强的人物参考';
    }
  }

  /**
   * 简化方法：基于哈希的相似度计算
   * 
   * @private
   * @param {Buffer} buffer1 - 图像 1 数据
   * @param {Buffer} buffer2 - 图像 2 数据
   * @returns {number} 相似度分数
   */
  _calculateHashSimilarity(buffer1, buffer2) {
    // 简化版本：实际应使用感知哈希 (pHash)
    const hash1 = crypto.createHash('md5').update(buffer1).digest('hex');
    const hash2 = crypto.createHash('md5').update(buffer2).digest('hex');

    // 计算哈希差异
    let diff = 0;
    for (let i = 0; i < Math.min(hash1.length, hash2.length); i++) {
      if (hash1[i] !== hash2[i]) diff++;
    }

    // 转换为相似度分数
    const similarity = 1 - (diff / Math.max(hash1.length, hash2.length));
    return Math.round(similarity * 100 * 100) / 100;
  }

  /**
   * 计算余弦相似度
   * 
   * @private
   * @param {Array<number>} vec1 - 向量 1
   * @param {Array<number>} vec2 - 向量 2
   * @returns {number} 余弦相似度
   */
  _cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('向量维度不匹配');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * 调整提示词以增强一致性
   * 
   * @param {string} originalPrompt - 原始提示词
   * @param {Object} consistencyPrompts - 一致性提示词组件
   * @param {number} weight - 一致性权重 (0-1)
   * @returns {string} 调整后的提示词
   */
  enhancePromptForConsistency(originalPrompt, consistencyPrompts, weight = 0.3) {
    // 在提示词开头添加强一致性关键词
    const consistencyKeywords = [
      '保持一致的人物特征',
      '保持相同的服装和发型',
      '保持场景一致性',
      '相同的光线和色调'
    ];

    const consistencyPrefix = consistencyKeywords.join('，') + '，';
    
    return consistencyPrefix + originalPrompt;
  }

  /**
   * 创建参考图配置
   * 
   * @param {string} referenceImageUrl - 参考图 URL
   * @param {number} strength - 参考强度 (0-1)
   * @returns {Object} 参考图配置
   */
  createReferenceConfig(referenceImageUrl, strength = 0.7) {
    return {
      referenceImage: referenceImageUrl,
      referenceStrength: Math.max(0, Math.min(1, strength)),
      referenceType: 'character', // 'character' | 'scene' | 'style'
      applyToAllAngles: true
    };
  }
}

module.exports = ConsistencyController;
