/**
 * 提示词模板管理
 * 提供各类提示词模板
 */

/**
 * 系统提示词 - 基础版本
 */
const SYSTEM_PROMPT = `你是一个专业的人物分析师，擅长从故事文本中提取和分析人物信息。

你的任务是：
1. 仔细阅读故事文本，识别所有人物
2. 分析每个人物的外貌特征、性格特点、服装风格
3. 梳理人物之间的关系
4. 生成用于 AI 视频生成的人物一致性描述

请确保输出格式为标准 JSON，遵循预定义的数据结构。`;

/**
 * 系统提示词 - 增强版本
 */
const ENHANCED_SYSTEM_PROMPT = `你是一位资深的人物设计师和 AI 提示词工程师，服务于国产 AI 短剧生成平台。

## 你的专业能力
- 精准提取文本中的人物信息
- 深度分析人物性格和行为模式
- 设计符合角色设定的外貌和服装
- 生成高质量的 AI 图像生成提示词

## 输出要求
1. 必须输出完整的人物档案 JSON
2. 外貌描述要具体可视觉化
3. 性格分析要有深度和层次
4. 一致性描述要适合 AI 视频生成
5. 保持人物特征的连贯性和一致性

## 注意事项
- 不要虚构文本中未提及的信息
- 如信息不足，可合理推断但需标注置信度
- 提示词要使用英文关键词以便 AI 理解
- 避免过度美化或夸张描述`;

/**
 * 一致性描述系统提示词
 */
const CONSISTENCY_SYSTEM_PROMPT = `你是一位 AI 图像生成提示词专家，专注于创建高质量、一致性的人物描述提示词。

## 你的任务
根据人物档案生成用于 Stable Diffusion / Midjourney 等 AI 图像生成工具的提示词。

## 提示词要求
1. 使用英文关键词
2. 包含具体的视觉元素
3. 添加质量和风格标签
4. 提供负面提示词排除不想要的效果
5. 支持多场景和多表情变体

## 输出格式
必须输出标准 JSON 格式。`;

/**
 * 人物分析提示词模板
 */
const CHARACTER_ANALYSIS_PROMPT = `请分析以下故事文本，提取所有人物信息并生成详细的人物档案。

## 故事文本
{{story_text}}

## 输出格式
请严格按照以下 JSON 格式输出：

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
      "relationships": [
        {
          "characterName": "...",
          "type": "...",
          "description": "...",
          "intensity": 1-10,
          "dynamics": "..."
        }
      ],
      "consistency": {
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
      }
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

/**
 * 一致性描述生成提示词
 */
const CONSISTENCY_PROMPT = `请根据以下人物档案，生成用于 AI 图像/视频生成的一致性描述提示词。

## 人物档案
- 姓名：{{name}}
- 年龄：{{age}}
- 性别：{{gender}}
- 外貌：{{appearance}}
- 服装：{{clothing}}
- 性格：{{personality}}

## 生成要求

### 基础提示词 (prompt)
包含以下元素：
- 年龄和性别
- 面部特征关键词
- 发型和发色
- 服装描述
- 气质和风格
- 使用英文关键词，逗号分隔

示例格式：
"A 25-year-old Chinese woman, oval face, fair skin, long black straight hair, deep brown almond eyes, wearing professional white shirt and black pencil skirt, elegant and confident, photorealistic, 8k, highly detailed"

### 负面提示词 (negativePrompt)
排除以下效果：
- 卡通/动漫风格
- 低质量/模糊
- 变形/夸张
- 过度美颜

示例：
"cartoon, anime, low quality, blurry, deformed, exaggerated, over-beautified, 3d render, illustration"

### 场景变体
为以下场景生成变体提示词：
1. 办公室工作场景
2. 居家休闲场景
3. 户外场景
4. 夜晚场景
5. 正式场合
6. 休闲社交

### 表情变体
为以下表情生成描述：
1. 中性表情
2. 开心微笑
3. 悲伤难过
4. 愤怒生气
5. 惊讶吃惊
6. 专注认真

## 输出格式
{
  "basePrompt": "...",
  "negativePrompt": "...",
  "parameters": { "seed": 12345, "steps": 30, "cfg": 7.5, "sampler": "DPM++ 2M Karras" },
  "variants": {
    "office": { "prompt": "...", "lighting": "...", "background": "...", "mood": "..." },
    "home": { ... },
    "outdoor": { ... },
    "night": { ... },
    "formal": { ... },
    "casual": { ... }
  },
  "expressions": {
    "neutral": "...",
    "happy": "...",
    "sad": "...",
    "angry": "...",
    "surprised": "...",
    "focused": "..."
  },
  "angles": {
    "front": "...",
    "side": "...",
    "back": "...",
    "closeup": "...",
    "medium": "...",
    "full": "..."
  },
  "qualityTags": ["photorealistic", "8k", "highly detailed", "professional photography", "cinematic lighting"]
}`;

/**
 * 人物关系分析提示词
 */
const RELATIONSHIP_PROMPT = `请分析以下文本中的人物关系网络。

## 故事文本
{{story_text}}

## 已识别人物
{{character_list}}

## 任务
1. 识别所有人物之间的关系类型
2. 分析关系的强度和动态
3. 发现潜在的关系冲突或张力
4. 梳理关系发展脉络

## 输出格式
{
  "relationships": [
    {
      "character1": "人物 A",
      "character2": "人物 B",
      "type": "关系类型",
      "description": "详细描述",
      "intensity": 1-10,
      "history": "关系历史",
      "conflicts": ["冲突点 1", "冲突点 2"],
      "dynamics": "互动方式",
      "evolution": "关系发展趋势"
    }
  ],
  "relationshipMap": "文字描述的关系图谱",
  "keyDynamics": ["关键关系动态 1", "关键关系动态 2"]
}`;

/**
 * 提示词质量检查
 */
const QUALITY_CHECK_PROMPT = `请检查以下人物提示词的质量。

## 待检查提示词
{{prompt}}

## 检查维度
1. 一致性：核心特征是否明确
2. 可视觉化：描述是否具体可呈现
3. 完整性：是否包含必要元素
4. 兼容性：是否适合目标 AI 模型
5. 冲突检测：是否有矛盾描述

## 输出格式
{
  "score": 1-10,
  "issues": [
    { "type": "问题类型", "description": "...", "suggestion": "..." }
  ],
  "improvements": ["改进建议 1", "改进建议 2"],
  "optimizedPrompt": "优化后的提示词"
}`;

/**
 * 中文提示词转英文
 */
const TRANSLATE_PROMPT = `请将以下中文人物描述转换为适合 AI 图像生成的英文提示词。

## 中文描述
{{chinese_description}}

## 转换规则
1. 保留核心视觉元素
2. 使用 AI 友好的英文词汇
3. 添加质量增强标签
4. 优化语法结构

## 输出格式
{
  "enPrompt": "英文提示词",
  "enNegativePrompt": "英文负面提示词",
  "keyTags": ["tag1", "tag2", ...]
}`;

/**
 * 获取提示词模板
 * @param {string} type - 模板类型
 * @returns {string} 提示词模板
 */
function getTemplate(type) {
  const templates = {
    'system': SYSTEM_PROMPT,
    'system-enhanced': ENHANCED_SYSTEM_PROMPT,
    'consistency-system': CONSISTENCY_SYSTEM_PROMPT,
    'character-analysis': CHARACTER_ANALYSIS_PROMPT,
    'consistency': CONSISTENCY_PROMPT,
    'relationship': RELATIONSHIP_PROMPT,
    'quality-check': QUALITY_CHECK_PROMPT,
    'translate': TRANSLATE_PROMPT
  };
  
  return templates[type] || templates['system'];
}

/**
 * 渲染模板（替换变量）
 * @param {string} template - 模板字符串
 * @param {Object} variables - 变量对象
 * @returns {string} 渲染后的模板
 */
function render(template, variables) {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    result = result.replace(new RegExp(placeholder, 'g'), stringValue);
  }
  
  return result;
}

/**
 * 获取所有模板类型
 * @returns {string[]} 模板类型列表
 */
function getTemplateTypes() {
  return [
    'system',
    'system-enhanced',
    'consistency-system',
    'character-analysis',
    'consistency',
    'relationship',
    'quality-check',
    'translate'
  ];
}

module.exports = {
  SYSTEM_PROMPT,
  ENHANCED_SYSTEM_PROMPT,
  CONSISTENCY_SYSTEM_PROMPT,
  CHARACTER_ANALYSIS_PROMPT,
  CONSISTENCY_PROMPT,
  RELATIONSHIP_PROMPT,
  QUALITY_CHECK_PROMPT,
  TRANSLATE_PROMPT,
  getTemplate,
  render,
  getTemplateTypes
};
