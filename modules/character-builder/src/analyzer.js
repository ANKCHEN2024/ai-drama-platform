/**
 * 人物分析器
 * 负责从文本中提取和分析人物信息
 */

const prompts = require('./prompts');

/**
 * 分析故事文本，提取人物信息
 * @param {Object} client - Dashscope 客户端
 * @param {string} text - 故事文本
 * @param {Object} options - 分析选项
 * @returns {Promise<Object>} 分析结果
 */
async function analyzeText(client, text, options = {}) {
  const {
    model = 'qwen-plus',
    temperature = 0.7,
    maxTokens = 3000,
    extractRelationships = true,
    generateConsistency = true
  } = options;

  // 构建提示词
  const prompt = buildAnalysisPrompt(text, {
    extractRelationships,
    generateConsistency
  });

  try {
    // 调用通义千问 API
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: prompts.SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }
    });

    // 解析响应
    const content = response.choices[0].message.content;
    const result = JSON.parse(content);

    // 验证结果
    validateAnalysisResult(result);

    // 估算 token 使用
    const tokensUsed = estimateTokens(text, content);

    return {
      characters: result.characters || [],
      metadata: {
        confidence: result.metadata?.confidence || 0.85,
        tokensUsed,
        model
      }
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response as JSON. Response may not be valid JSON.');
    }
    throw error;
  }
}

/**
 * 构建分析提示词
 * @param {string} text - 故事文本
 * @param {Object} options - 选项
 * @returns {string} 提示词
 */
function buildAnalysisPrompt(text, options) {
  const { extractRelationships, generateConsistency } = options;

  let prompt = `请分析以下故事文本，提取所有人物信息并生成详细的人物档案。

## 故事文本
${text}

## 输出格式
请严格按照以下 JSON 格式输出（不要输出其他内容）：

{
  "characters": [
    {
      "id": "char_001",
      "name": "人物姓名",
      "age": 年龄数字，
      "gender": "男/女/其他",
      "role": "主角/配角/反派",
      "appearance": {
        "face": { "shape": "...", "skinTone": "...", "features": "..." },
        "hair": { "color": "...", "length": "...", "style": "...", "texture": "..." },
        "eyes": { "color": "...", "shape": "...", "description": "..." },
        "body": { "height": "...", "build": "...", "posture": "..." },
        "distinguishingFeatures": [],
        "overallDescription": "完整的视觉化外貌描述"
      },
      "personality": {
        "traits": [],
        "description": "...",
        "behaviorPatterns": {
          "speakingStyle": "...",
          "reactionToStress": "...",
          "socialBehavior": "...",
          "decisionMaking": "..."
        },
        "likes": [],
        "dislikes": [],
        "motivations": { "goal": "...", "fear": "...", "desire": "..." }
      },
      "clothing": {
        "style": "...",
        "colors": [],
        "types": { "casual": "...", "formal": "...", "work": "...", "special": "..." },
        "accessories": [],
        "overallDescription": "..."
      },
      ${extractRelationships ? `"relationships": [
        {
          "characterName": "...",
          "type": "...",
          "description": "...",
          "intensity": 1-10,
          "dynamics": "..."
        }
      ],` : ''}
      ${generateConsistency ? `"consistency": {
        "prompt": "用于 AI 生成的正向提示词",
        "negativePrompt": "负面提示词",
        "parameters": { "seed": 数字，"steps": 30, "cfg": 7.5 },
        "expressions": {
          "neutral": "...",
          "happy": "...",
          "sad": "...",
          "angry": "...",
          "surprised": "...",
          "focused": "..."
        }
      }` : ''}
    }
  ],
  "metadata": {
    "characterCount": 数字，
    "sourceTextLength": 数字，
    "confidence": 0-1
  }
}

## 分析要点
1. 外貌描述要具体、可视觉化，避免抽象词汇
2. 性格分析要基于文本中的行为和对话
3. 服装描述要考虑人物的职业、年龄、场景
4. 一致性提示词要包含关键视觉元素
5. 如文本信息不足，可合理推断但降低置信度`;

  return prompt;
}

/**
 * 验证分析结果
 * @param {Object} result - 分析结果
 * @throws {Error} 验证失败时抛出错误
 */
function validateAnalysisResult(result) {
  if (!result || typeof result !== 'object') {
    throw new Error('Invalid result: must be an object');
  }

  if (!Array.isArray(result.characters)) {
    throw new Error('Invalid result: characters must be an array');
  }

  for (const char of result.characters) {
    if (!char.name || typeof char.name !== 'string') {
      throw new Error('Invalid character: name is required');
    }

    if (!char.appearance || typeof char.appearance !== 'object') {
      throw new Error(`Invalid character ${char.name}: appearance is required`);
    }

    if (!char.personality || typeof char.personality !== 'object') {
      throw new Error(`Invalid character ${char.name}: personality is required`);
    }

    if (!char.clothing || typeof char.clothing !== 'object') {
      throw new Error(`Invalid character ${char.name}: clothing is required`);
    }
  }
}

/**
 * 估算 token 使用量
 * @param {string} input - 输入文本
 * @param {string} output - 输出文本
 * @returns {number} 估算的 token 数
 */
function estimateTokens(input, output) {
  // 简单估算：中文约 1.5 字符/token，英文约 4 字符/token
  const chineseRegex = /[\u4e00-\u9fa5]/g;
  const inputChinese = (input.match(chineseRegex) || []).length;
  const outputChinese = (output.match(chineseRegex) || []).length;
  
  const inputEnglish = input.length - inputChinese;
  const outputEnglish = output.length - outputChinese;
  
  const inputTokens = Math.ceil(inputChinese / 1.5) + Math.ceil(inputEnglish / 4);
  const outputTokens = Math.ceil(outputChinese / 1.5) + Math.ceil(outputEnglish / 4);
  
  return inputTokens + outputTokens;
}

/**
 * 从文本中提取人物名称
 * @param {string} text - 故事文本
 * @returns {string[]} 人物名称列表
 */
function extractCharacterNames(text) {
  // 简单的人物名称提取逻辑
  // 实际应用中可以使用更复杂的 NLP 技术
  const names = [];
  
  // 匹配常见的中文人名模式
  const namePattern = /([A-Z][a-z]{1,3}[·]?[A-Z][a-z]{1,3}|[\u4e00-\u9fa5]{2,4})/g;
  const matches = text.match(namePattern);
  
  if (matches) {
    // 过滤常见非人名词汇
    const commonWords = ['但是', '所以', '因为', '如果', '虽然', '然而', '而且', '并且'];
    names.push(...matches.filter(name => !commonWords.includes(name)));
  }
  
  return [...new Set(names)]; // 去重
}

module.exports = {
  analyzeText,
  buildAnalysisPrompt,
  validateAnalysisResult,
  estimateTokens,
  extractCharacterNames
};
