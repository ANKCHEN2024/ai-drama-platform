/**
 * Prompt Templates - 提示词模板库
 * 
 * 包含场景分析、一致性检查、图像生成的提示词模板
 */

/**
 * 场景分析基础模板
 */
const SCENE_ANALYSIS_PROMPT = `
你是一位专业的影视场景分析师。请分析以下剧本/分镜描述，提取场景要素。

【输入】
{script}

【输出格式】
请严格按照以下 JSON 格式输出（不要输出其他内容）：
{
  "location": "地点描述",
  "time": "时间描述",
  "atmosphere": "氛围/情绪基调",
  "props": ["道具 1", "道具 2", "道具 3"],
  "characterPositions": [
    {"character": "角色名", "position": "位置描述", "action": "动作描述"}
  ],
  "lighting": "光影描述",
  "colorPalette": ["#主色 1", "#主色 2"],
  "imagePrompt": "用于图像生成的详细提示词"
}

【要求】
1. 地点要具体（如"现代办公室"而非"室内"）
2. 时间要明确（如"黄昏"而非"傍晚时分"）
3. 氛围要用情绪词（如"紧张压抑"、"温馨浪漫"）
4. 道具只列出关键物品（3-5 个）
5. 人物位置要具体（如"坐在办公桌前，面对电脑"）
6. 光影要说明方向和性质（如"左侧窗户自然光，柔和"）
7. 色彩方案用 HEX 色值（2-3 个主色）
8. 图像提示词要详细，适合 AI 图像生成
`;

/**
 * 场景分析增强模板（带风格指导）
 */
const ENHANCED_ANALYSIS_PROMPT = `
你是一位专业的影视场景分析师。请分析以下剧本/分镜描述，提取场景要素。

【输入剧本】
{script}

【风格指导】
- 目标风格：{style}
- 参考作品：{reference}
- 特殊要求：{requirements}

【输出格式】
请严格按照以下 JSON 格式输出：
{
  "location": "地点描述（具体、可视觉化）",
  "time": "时间描述（明确时间段）",
  "atmosphere": "氛围/情绪基调（2-3 个情绪词）",
  "props": ["关键道具 1", "关键道具 2", "关键道具 3"],
  "characterPositions": [
    {
      "character": "角色名",
      "position": "位置描述",
      "action": "动作描述",
      "facing": "朝向",
      "expression": "表情",
      "clothing": "服装描述"
    }
  ],
  "lighting": "光影描述（方向、性质、强度）",
  "colorPalette": ["#主色 1", "#主色 2", "#主色 3"],
  "imagePrompt": "详细的图像生成提示词（中文，包含所有视觉元素）",
  "negativePrompt": "负面提示词（要避免的元素）"
}

【分析指南】
1. 地点分析：识别具体场所类型，添加风格修饰词
2. 时间分析：提取明确时间信息，如未明确则根据上下文推断
3. 氛围分析：从剧情情绪推断氛围，使用视觉化的情绪词
4. 道具分析：列出对叙事重要的道具，避免过多细节（3-5 个）
5. 人物位置分析：描述角色在场景中的位置，包含动作、朝向、表情、服装
6. 光影分析：确定光源方向，描述光的性质
7. 色彩分析：根据氛围选择主色调，使用 HEX 色值表示
8. 图像提示词：整合以上所有元素，按"场景 - 人物 - 光影 - 风格"顺序组织
`;

/**
 * 一致性检查模板
 */
const CONSISTENCY_CHECK_PROMPT = `
你是场景一致性检查专家。请对比以下两个场景描述，判断是否一致。

【场景 A】（参考场景）
{referenceScene}

【场景 B】（新场景）
{newScene}

【检查维度】
1. 地点一致性：是否描述同一地点
2. 时间连贯性：时间是否合理连贯
3. 道具一致性：关键道具是否一致
4. 色彩统一性：色彩方案是否统一
5. 光影连贯性：光影方向是否一致
6. 风格一致性：整体风格是否匹配

【输出格式】
请严格按照以下 JSON 格式输出：
{
  "isConsistent": true/false,
  "overallScore": 0.0-1.0,
  "dimensionScores": {
    "location": 0.0-1.0,
    "time": 0.0-1.0,
    "props": 0.0-1.0,
    "colorPalette": 0.0-1.0,
    "lighting": 0.0-1.0,
    "style": 0.0-1.0
  },
  "differences": [
    {
      "dimension": "维度名",
      "reference": "参考场景的值",
      "new": "新场景的值",
      "severity": "low/medium/high",
      "impact": "对视觉一致性的影响描述"
    }
  ],
  "consistentElements": ["一致的元素 1", "一致的元素 2"],
  "suggestions": ["修改建议 1", "修改建议 2"]
}

【评分标准】
- 1.0: 完全一致
- 0.8-0.9: 高度一致，细微差异
- 0.6-0.7: 基本一致，部分差异
- 0.4-0.5: 一致性较差，明显差异
- 0.0-0.3: 严重不一致

【严重级别定义】
- low: 不影响视觉一致性，可接受
- medium: 可能影响一致性，建议修改
- high: 严重影响一致性，必须修改
`;

/**
 * 图像生成基础模板
 */
const IMAGE_GENERATION_PROMPT = `{location}，{time}，{atmosphere}。

场景中有：{props}。

人物位置：
{characterPositions}

光影效果：{lighting}。

色彩风格：{colorPalette}。

电影感，高细节，8K 分辨率，专业摄影。

负面提示词：模糊、低质量、变形、多余的手指、文字、水印`;

/**
 * 室内场景分析模板
 */
const INDOOR_SCENE_PROMPT = `
【室内场景分析】

请分析以下室内场景：
{script}

【关注要点】
1. 房间类型和功能
2. 家具布局和风格
3. 室内光源（窗户、灯具）
4. 墙面颜色和材质
5. 地面材质
6. 装饰元素
7. 人物与空间的关系

【输出格式】
{
  "roomType": "房间类型",
  "furniture": ["家具 1", "家具 2"],
  "lightSources": ["光源 1", "光源 2"],
  "wallColor": "#颜色",
  "floorMaterial": "地面材质",
  "decorations": ["装饰 1", "装饰 2"],
  "spatialLayout": "空间布局描述",
  "imagePrompt": "完整的图像生成提示词"
}
`;

/**
 * 室外场景分析模板
 */
const OUTDOOR_SCENE_PROMPT = `
【室外场景分析】

请分析以下室外场景：
{script}

【关注要点】
1. 地点类型（街道、公园、广场等）
2. 建筑风格
3. 自然元素（树木、水体等）
4. 天气状况
5. 时间光影
6. 人物活动
7. 环境氛围

【输出格式】
{
  "locationType": "地点类型",
  "architecture": "建筑风格描述",
  "naturalElements": ["元素 1", "元素 2"],
  "weather": "天气状况",
  "timeLighting": "时间光影描述",
  "activities": "人物活动描述",
  "atmosphere": "环境氛围",
  "imagePrompt": "完整的图像生成提示词"
}
`;

/**
 * 夜景场景分析模板
 */
const NIGHT_SCENE_PROMPT = `
【夜景场景分析】

请分析以下夜景场景：
{script}

【关注要点】
1. 光源类型（路灯、车灯、霓虹灯等）
2. 光影对比
3. 色彩倾向（冷色调为主）
4. 阴影处理
5. 氛围营造
6. 能见度

【输出格式】
{
  "lightSources": ["路灯", "霓虹灯"],
  "lightContrast": "高对比/低对比",
  "colorTendency": "冷色调/暖色调",
  "shadowHandling": "阴影描述",
  "mood": "氛围描述",
  "visibility": "能见度描述",
  "imagePrompt": "夜景图像生成提示词，强调光影对比和色彩氛围"
}
`;

/**
 * 分镜提示词序列
 */
const SHOT_SEQUENCE_PROMPTS = {
  // 广角镜头
  wideShot: '{scene}，广角镜头，展现整体环境，建立镜头',
  
  // 中景镜头
  mediumShot: '{scene}，中景镜头，聚焦人物上半身，展现动作和表情',
  
  // 特写镜头
  closeUp: '{scene}，特写镜头，聚焦{focusElement}，强调细节',
  
  // 过肩镜头
  overTheShoulder: '{scene}，过肩镜头，从{character}身后拍摄',
  
  // 主观镜头
  pov: '{scene}，主观镜头，从{character}视角看到的内容'
};

/**
 * 情绪修饰词库
 */
const EMOTION_MODIFIERS = {
  tense: '紧张氛围，压抑感，阴影浓重，高对比度',
  warm: '温馨氛围，柔和光线，暖色调，舒适感',
  mysterious: '神秘氛围，低照明，阴影交错，冷色调',
  romantic: '浪漫氛围，柔焦效果，粉色/紫色调，梦幻感',
  sad: '悲伤氛围，冷色调，低饱和度，阴雨天气',
  joyful: '欢乐氛围，明亮光线，高饱和度，暖色调'
};

/**
 * 地点修饰词库
 */
const LOCATION_MODIFIERS = {
  office: ['现代', '简约', '复古', '开放式', '独立', '豪华', '小型'],
  home: ['温馨', '简约', '豪华', '复古', '现代', '乡村'],
  street: ['繁华', '安静', '古老', '现代', '雨夜', '黄昏'],
  park: ['宁静', '热闹', '春日', '秋日', '清晨', '黄昏']
};

/**
 * 光影效果库
 */
const LIGHTING_EFFECTS = {
  natural: [
    '柔和自然光',
    '强烈阳光',
    '漫射光',
    '逆光',
    '侧光'
  ],
  artificial: [
    '暖色台灯光',
    '冷色荧光灯光',
    '霓虹灯光',
    '烛光',
    '聚光灯'
  ],
  dramatic: [
    '高对比度光影',
    '百叶窗条纹光影',
    '树影斑驳',
    '水面反射光',
    '玻璃折射光'
  ]
};

/**
 * 色彩方案库
 */
const COLOR_SCHEMES = {
  warm: ['#F5E6D3', '#D4C4A8', '#A89070'],
  cool: ['#E8F4F8', '#B8D8E8', '#78A8C8'],
  neutral: ['#F5F5F5', '#D0D0D0', '#909090'],
  dramatic: ['#1A1A2E', '#16213E', '#0F3460'],
  romantic: ['#FFD1DC', '#FFB7C5', '#FF9EB5'],
  mystery: ['#2C3E50', '#34495E', '#1A252F']
};

module.exports = {
  SCENE_ANALYSIS_PROMPT,
  ENHANCED_ANALYSIS_PROMPT,
  CONSISTENCY_CHECK_PROMPT,
  IMAGE_GENERATION_PROMPT,
  INDOOR_SCENE_PROMPT,
  OUTDOOR_SCENE_PROMPT,
  NIGHT_SCENE_PROMPT,
  SHOT_SEQUENCE_PROMPTS,
  EMOTION_MODIFIERS,
  LOCATION_MODIFIERS,
  LIGHTING_EFFECTS,
  COLOR_SCHEMES
};
