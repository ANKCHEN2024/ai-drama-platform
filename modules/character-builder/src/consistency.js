/**
 * 一致性描述生成器
 * 负责生成用于 AI 视频生成的人物一致性描述
 */

const prompts = require('./prompts');

/**
 * 生成人物一致性描述
 * @param {Object} client - Dashscope 客户端
 * @param {Object} character - 人物档案
 * @param {Object} options - 生成选项
 * @returns {Promise<Object>} 一致性描述
 */
async function generate(client, character, options = {}) {
  const {
    model = 'qwen-plus',
    scene = null,
    emotion = null
  } = options;

  try {
    // 构建提示词
    const prompt = buildConsistencyPrompt(character, { scene, emotion });

    // 调用通义千问 API
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: prompts.CONSISTENCY_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    // 解析响应
    const content = response.choices[0].message.content;
    const result = JSON.parse(content);

    // 补充默认参数
    const consistency = {
      prompt: result.basePrompt || result.prompt || '',
      negativePrompt: result.negativePrompt || '',
      parameters: {
        seed: result.parameters?.seed || generateSeed(character.name),
        steps: result.parameters?.steps || 30,
        cfg: result.parameters?.cfg || 7.5,
        sampler: result.parameters?.sampler || 'DPM++ 2M Karras'
      },
      variants: result.variants || generateDefaultVariants(character),
      expressions: result.expressions || generateDefaultExpressions(character),
      angles: result.angles || generateDefaultAngles(character),
      qualityTags: result.qualityTags || [
        'photorealistic',
        '8k',
        'highly detailed',
        'professional photography',
        'cinematic lighting'
      ]
    };

    return consistency;
  } catch (error) {
    if (error instanceof SyntaxError) {
      // 如果解析失败，使用备用方法生成
      return generateFallback(character);
    }
    throw error;
  }
}

/**
 * 构建一致性提示词
 * @param {Object} character - 人物档案
 * @param {Object} options - 选项
 * @returns {string} 提示词
 */
function buildConsistencyPrompt(character, options) {
  const { scene, emotion } = options;

  const prompt = `请根据以下人物档案，生成用于 AI 图像/视频生成的一致性描述提示词。

## 人物档案
- 姓名：${character.name}
- 年龄：${character.age}
- 性别：${character.gender}
- 外貌：${character.appearance?.overallDescription || JSON.stringify(character.appearance)}
- 服装：${character.clothing?.overallDescription || JSON.stringify(character.clothing)}
- 性格：${character.personality?.description || JSON.stringify(character.personality)}

## 生成要求

### 基础提示词 (prompt)
包含以下元素：
- 年龄和性别
- 面部特征关键词
- 发型和发色
- 服装描述
- 气质和风格
- 使用英文关键词，逗号分隔

### 负面提示词 (negativePrompt)
排除以下效果：
- 卡通/动漫风格
- 低质量/模糊
- 变形/夸张
- 过度美颜

${scene ? `### 特定场景
场景：${scene}
请为该场景生成专门的提示词变体。` : ''}

${emotion ? `### 特定表情
表情：${emotion}
请为该表情生成专门的描述。` : ''}

## 输出格式
{
  "basePrompt": "...",
  "negativePrompt": "...",
  "parameters": { "seed": 数字，"steps": 30, "cfg": 7.5, "sampler": "..." },
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
  "qualityTags": [...]
}`;

  return prompt;
}

/**
 * 生成随机种子（基于人物名称）
 * @param {string} name - 人物名称
 * @returns {number} 种子值
 */
function generateSeed(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * 生成默认场景变体
 * @param {Object} character - 人物档案
 * @returns {Object} 场景变体
 */
function generateDefaultVariants(character) {
  const basePrompt = buildBasePrompt(character);
  
  return {
    office: {
      prompt: `${basePrompt}, sitting at office desk, working on computer, professional environment`,
      lighting: 'natural light from window, soft office lighting',
      background: 'modern office interior, clean and minimal',
      mood: 'professional and focused'
    },
    home: {
      prompt: `${basePrompt}, relaxing at home, sitting on sofa, casual pose`,
      lighting: 'warm indoor lighting, cozy atmosphere',
      background: 'comfortable living room, bookshelf in background',
      mood: 'relaxed and comfortable'
    },
    outdoor: {
      prompt: `${basePrompt}, walking outdoors, city street or park`,
      lighting: 'natural daylight, sunny or overcast',
      background: 'urban landscape or green park',
      mood: 'casual and free'
    },
    night: {
      prompt: `${basePrompt}, night scene, city lights`,
      lighting: 'neon lights, street lamps, dramatic lighting',
      background: 'city nightlife, blurred lights',
      mood: 'mysterious and romantic'
    },
    formal: {
      prompt: `${basePrompt}, formal attire, business meeting or event`,
      lighting: 'indoor event lighting, elegant',
      background: 'conference room or banquet hall',
      mood: 'elegant and sophisticated'
    },
    casual: {
      prompt: `${basePrompt}, casual outfit, weekend scene`,
      lighting: 'natural light, relaxed',
      background: 'cafe or bookstore',
      mood: 'laid-back and friendly'
    }
  };
}

/**
 * 生成默认表情描述
 * @param {Object} character - 人物档案
 * @returns {Object} 表情描述
 */
function generateDefaultExpressions(character) {
  return {
    neutral: 'calm expression, neutral gaze, relaxed facial muscles',
    happy: 'gentle smile, eyes slightly curved, warm and friendly',
    sad: 'slightly furrowed brow, eyes showing sadness, downturned mouth',
    angry: 'furrowed brows, intense gaze, firm expression',
    surprised: 'eyes slightly widened, eyebrows raised, open mouth',
    focused: 'concentrated gaze, serious expression, attentive'
  };
}

/**
 * 生成默认镜头角度
 * @param {Object} character - 人物档案
 * @returns {Object} 镜头角度
 */
function generateDefaultAngles(character) {
  return {
    front: 'front view, full face visible, direct eye contact',
    side: '45-degree side view, showing facial profile',
    back: 'back view, showing hairstyle and posture',
    closeup: 'close-up shot, focusing on facial features and expression',
    medium: 'medium shot, upper body visible',
    full: 'full body shot, showing complete outfit and posture'
  };
}

/**
 * 构建基础提示词
 * @param {Object} character - 人物档案
 * @returns {string} 基础提示词
 */
function buildBasePrompt(character) {
  const parts = [];
  
  // 年龄和性别
  const ageGender = `${character.age}-year-old ${character.gender === '女' ? 'Chinese woman' : character.gender === '男' ? 'Chinese man' : 'Chinese person'}`;
  parts.push(ageGender);
  
  // 面部特征
  if (character.appearance?.face) {
    const face = character.appearance.face;
    if (face.shape) parts.push(`${translateFaceShape(face.shape)} face`);
    if (face.skinTone) parts.push(`${translateSkinTone(face.skinTone)} skin`);
    if (face.features) parts.push(face.features);
  }
  
  // 头发
  if (character.appearance?.hair) {
    const hair = character.appearance.hair;
    const hairDesc = [];
    if (hair.color) hairDesc.push(translateColor(hair.color));
    if (hair.length) hairDesc.push(translateHairLength(hair.length));
    if (hair.texture) hairDesc.push(translateHairTexture(hair.texture));
    if (hairDesc.length > 0) parts.push(`${hairDesc.join(' ')} hair`);
  }
  
  // 眼睛
  if (character.appearance?.eyes) {
    const eyes = character.appearance.eyes;
    if (eyes.color) parts.push(`${translateColor(eyes.color)} eyes`);
    if (eyes.shape) parts.push(`${eyes.shape} eyes`);
  }
  
  // 服装
  if (character.clothing?.overallDescription) {
    parts.push(character.clothing.overallDescription);
  } else if (character.clothing?.style) {
    parts.push(translateClothingStyle(character.clothing.style));
  }
  
  // 气质
  if (character.personality?.traits?.length > 0) {
    const traits = character.personality.traits.slice(0, 3).map(t => translateTrait(t));
    if (traits.length > 0) parts.push(`${traits.join(', ')}气质`);
  }
  
  // 质量标签
  parts.push('photorealistic', '8k', 'highly detailed');
  
  return parts.join(', ');
}

/**
 * 备用生成方法（不依赖 AI）
 * @param {Object} character - 人物档案
 * @returns {Object} 一致性描述
 */
function generateFallback(character) {
  const basePrompt = buildBasePrompt(character);
  
  return {
    prompt: basePrompt,
    negativePrompt: 'cartoon, anime, low quality, blurry, deformed, exaggerated, over-beautified, 3d render, illustration',
    parameters: {
      seed: generateSeed(character.name),
      steps: 30,
      cfg: 7.5,
      sampler: 'DPM++ 2M Karras'
    },
    variants: generateDefaultVariants(character),
    expressions: generateDefaultExpressions(character),
    angles: generateDefaultAngles(character),
    qualityTags: [
      'photorealistic',
      '8k',
      'highly detailed',
      'professional photography',
      'cinematic lighting'
    ]
  };
}

// 翻译辅助函数
function translateFaceShape(shape) {
  const map = {
    '瓜子脸': 'oval',
    '圆脸': 'round',
    '方脸': 'square',
    '长脸': 'long',
    '心形脸': 'heart-shaped'
  };
  return map[shape] || shape;
}

function translateSkinTone(tone) {
  const map = {
    '白皙': 'fair',
    '小麦色': 'wheat',
    '健康色': 'healthy tan',
    '偏黄': 'warm'
  };
  return map[tone] || tone;
}

function translateColor(color) {
  const map = {
    '乌黑': 'black',
    '黑色': 'black',
    '棕色': 'brown',
    '深棕色': 'deep brown',
    '金色': 'blonde',
    '白色': 'white'
  };
  return map[color] || color;
}

function translateHairLength(length) {
  const map = {
    '长发': 'long',
    '短发': 'short',
    '中长发': 'medium-length',
    '及肩': 'shoulder-length'
  };
  return map[length] || length;
}

function translateHairTexture(texture) {
  const map = {
    '直发': 'straight',
    '卷发': 'curly',
    '微卷': 'wavy'
  };
  return map[texture] || texture;
}

function translateClothingStyle(style) {
  const map = {
    '职业简约风': 'professional minimalist style',
    '休闲风': 'casual style',
    '运动风': 'sporty style',
    '优雅风': 'elegant style'
  };
  return map[style] || style;
}

function translateTrait(trait) {
  const map = {
    '独立': 'independent',
    '坚强': 'strong',
    '温柔': 'gentle',
    '专业': 'professional',
    '自信': 'confident',
    '活泼': 'lively',
    '冷静': 'calm'
  };
  return map[trait] || trait;
}

module.exports = {
  generate,
  buildConsistencyPrompt,
  generateSeed,
  generateDefaultVariants,
  generateDefaultExpressions,
  generateDefaultAngles,
  buildBasePrompt,
  generateFallback
};
