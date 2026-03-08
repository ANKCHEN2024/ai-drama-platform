# 📝 场景构建模块 - 提示词模板

## 1. 场景分析提示词

### 1.1 基础分析模板

```javascript
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
```

---

### 1.2 增强分析模板（带风格指导）

```javascript
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
1. 地点分析：
   - 识别具体场所类型
   - 添加风格修饰词（如"现代"、"复古"、"简约"）
   
2. 时间分析：
   - 提取明确时间信息
   - 如未明确，根据上下文推断合理时间
   
3. 氛围分析：
   - 从剧情情绪推断氛围
   - 使用视觉化的情绪词
   
4. 道具分析：
   - 列出对叙事重要的道具
   - 避免过多细节（3-5 个关键道具）
   
5. 人物位置分析：
   - 描述角色在场景中的位置
   - 包含动作、朝向、表情、服装
   
6. 光影分析：
   - 确定光源方向（左/右/前/后）
   - 描述光的性质（自然光/人造光/柔和/强烈）
   
7. 色彩分析：
   - 根据氛围选择主色调
   - 使用 HEX 色值表示
   
8. 图像提示词：
   - 整合以上所有元素
   - 按"场景 - 人物 - 光影 - 风格"顺序组织
   - 添加质量词（电影感、高细节、8K）

【示例输出】
{
  "location": "现代办公室",
  "time": "清晨",
  "atmosphere": "宁静、充满希望",
  "props": ["办公桌", "百叶窗", "白色咖啡杯"],
  "characterPositions": [
    {
      "character": "李明",
      "position": "坐在办公桌前",
      "action": "拿起咖啡杯喝咖啡",
      "facing": "面向电脑屏幕",
      "expression": "专注",
      "clothing": "白色衬衫，深色西装"
    }
  ],
  "lighting": "自然光，从左侧窗户透过百叶窗射入，形成条纹光影，柔和温暖",
  "colorPalette": ["#F5E6D3", "#8B7355", "#2C3E50"],
  "imagePrompt": "现代办公室，清晨阳光，百叶窗光影条纹，办公桌上有白色咖啡杯，一人坐在桌前，穿着白色衬衫和深色西装，专注表情，温暖色调，电影感，高细节，8K 分辨率",
  "negativePrompt": "模糊、低质量、变形、多余的手指、文字、水印"
}
`;
```

---

## 2. 一致性检查提示词

### 2.1 场景一致性对比

```javascript
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
```

---

### 2.2 连续性检查（多镜头）

```javascript
const CONTINUITY_CHECK_PROMPT = `
你是影视连续性检查专家。请检查以下一组镜头的场景连续性。

【场景设定】
{sceneSetting}

【镜头序列】
{shotSequence}

【检查项目】
1. 道具连续性：道具位置、状态是否连贯
2. 人物连续性：服装、位置、动作是否连贯
3. 光影连续性：光源方向、强度是否连贯
4. 时间连续性：时间流逝是否合理
5. 空间连续性：空间关系是否合理

【输出格式】
{
  "hasContinuityErrors": true/false,
  "errors": [
    {
      "type": "错误类型",
      "shotFrom": "镜头 X",
      "shotTo": "镜头 Y",
      "description": "错误描述",
      "severity": "low/medium/high",
      "suggestion": "修改建议"
    }
  ],
  "continuityNotes": ["连续性说明 1", "连续性说明 2"]
}

【常见错误类型】
- prop_mismatch: 道具不匹配
- costume_change: 服装变化
- position_jump: 位置跳跃
- lighting_shift: 光影突变
- time_inconsistency: 时间不一致
- spatial_error: 空间错误
`;
```

---

## 3. 图像生成提示词

### 3.1 基础图像提示词模板

```javascript
const IMAGE_GENERATION_PROMPT = `
{location}，{time}，{atmosphere}。

场景中有：{props}。

人物位置：
{characterPositions}

光影效果：{lighting}。

色彩风格：{colorPalette}。

电影感，高细节，8K 分辨率，专业摄影。

负面提示词：模糊、低质量、变形、多余的手指、文字、水印
`;
```

---

### 3.2 增强图像提示词模板（结构化）

```javascript
const ENHANCED_IMAGE_PROMPT = `
【场景描述】
{location}，{time}

【氛围基调】
{atmosphere}

【关键道具】
{props}

【人物描述】
{characterPositionsFormatted}

【光影设计】
{lighting}

【色彩方案】
主色调：{primaryColor}
辅助色：{secondaryColor}
强调色：{accentColor}

【构图建议】
{composition}

【风格参考】
{styleReference}

【质量要求】
电影感，高细节，8K 分辨率，专业摄影，景深效果

【负面提示词】
模糊、低质量、变形、多余的手指、文字、水印、噪点、过曝、欠曝
`;
```

---

### 3.3 风格化图像提示词模板

```javascript
const STYLED_IMAGE_PROMPT = `
{basePrompt}

【风格修饰词】
{styleModifiers}

【艺术家参考】
{artistReference}

【技术参数】
- 分辨率：8K
- 宽高比：16:9
- 景深：{depthOfField}
- 胶片模拟：{filmStock}

【负面提示词】
{negativePrompt}
`;

// 使用示例
const examplePrompt = STYLED_IMAGE_PROMPT.replace('{basePrompt}', '现代办公室，清晨阳光')
  .replace('{styleModifiers}', '电影感，暖色调，柔和光影')
  .replace('{artistReference}', '参考：罗杰·狄金斯摄影风格')
  .replace('{depthOfField}', '浅景深')
  .replace('{filmStock}', 'Kodak Portra 400')
  .replace('{negativePrompt}', '模糊、低质量、数码感');
```

---

## 4. 特殊场景提示词

### 4.1 室内场景模板

```javascript
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
```

---

### 4.2 室外场景模板

```javascript
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
```

---

### 4.3 夜景场景模板

```javascript
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
```

---

## 5. 提示词优化技巧

### 5.1 权重控制

```javascript
// 使用括号增加权重
const weightedPrompt = `
(电影感：1.3), (高细节：1.2), 8K 分辨率，(专业摄影：1.1)
`;

// 使用括号减少权重
const reducedPrompt = `
现代办公室，清晨阳光，(背景：0.8), (次要道具：0.7)
`;
```

---

### 5.2 分镜提示词序列

```javascript
const SHOT_SEQUENCE_PROMPTS = {
  // 广角镜头
  wideShot: `{scene}，广角镜头，展现整体环境，建立镜头`,
  
  // 中景镜头
  mediumShot: `{scene}，中景镜头，聚焦人物上半身，展现动作和表情`,
  
  // 特写镜头
  closeUp: `{scene}，特写镜头，聚焦{focusElement}，强调细节`,
  
  // 过肩镜头
  overTheShoulder: `{scene}，过肩镜头，从{character}身后拍摄`,
  
  // 主观镜头
  pov: `{scene}，主观镜头，从{character}视角看到的内容`
};
```

---

### 5.3 情绪强化提示词

```javascript
const EMOTION_MODIFIERS = {
  // 紧张
  tense: '紧张氛围，压抑感，阴影浓重，高对比度',
  
  // 温馨
  warm: '温馨氛围，柔和光线，暖色调，舒适感',
  
  // 神秘
  mysterious: '神秘氛围，低照明，阴影交错，冷色调',
  
  // 浪漫
  romantic: '浪漫氛围，柔焦效果，粉色/紫色调，梦幻感',
  
  // 悲伤
  sad: '悲伤氛围，冷色调，低饱和度，阴雨天气',
  
  // 欢乐
  joyful: '欢乐氛围，明亮光线，高饱和度，暖色调'
};
```

---

## 6. 完整示例

### 6.1 示例输入

```
剧本片段：
"清晨，李明坐在办公室里，阳光透过百叶窗洒在桌面上。
他拿起咖啡杯，轻轻喝了一口，开始查看电脑上的文件。
办公室装修现代简约，墙上挂着一幅抽象画。"
```

### 6.2 示例输出

```json
{
  "location": "现代简约办公室",
  "time": "清晨",
  "atmosphere": "宁静、专注、充满希望",
  "props": [
    "办公桌",
    "百叶窗",
    "白色咖啡杯",
    "电脑显示器",
    "文件",
    "抽象画"
  ],
  "characterPositions": [
    {
      "character": "李明",
      "position": "坐在办公桌前",
      "action": "拿起咖啡杯喝咖啡，查看电脑文件",
      "facing": "面向电脑屏幕",
      "expression": "专注",
      "clothing": "白色衬衫，深色西装外套"
    }
  ],
  "lighting": "自然光，从左侧窗户透过百叶窗射入，形成条纹光影，柔和温暖",
  "colorPalette": ["#F5E6D3", "#8B7355", "#2C3E50"],
  "imagePrompt": "现代简约办公室，清晨阳光，百叶窗光影条纹，办公桌上有白色咖啡杯、电脑显示器和文件，墙上挂着抽象画，一人坐在桌前，穿着白色衬衫和深色西装外套，专注表情，温暖色调，电影感，高细节，8K 分辨率，专业摄影，景深效果",
  "negativePrompt": "模糊、低质量、变形、多余的手指、文字、水印、噪点、过曝、欠曝、杂乱"
}
```

---

### 6.3 示例图像生成提示词（英文版）

```
Modern minimalist office, early morning sunlight, venetian blind shadows creating striped patterns, 
office desk with white coffee cup, computer monitor and documents, abstract painting on wall, 
a person sitting at desk, wearing white shirt and dark suit jacket, focused expression, 
warm color tones, cinematic look, high detail, 8K resolution, professional photography, depth of field

Negative: blurry, low quality, deformed, extra fingers, text, watermark, noise, overexposed, underexposed, cluttered
```

---

## 7. 提示词库

### 7.1 地点修饰词库

```javascript
const LOCATION_MODIFIERS = {
  office: ['现代', '简约', '复古', '开放式', '独立', '豪华', '小型'],
  home: ['温馨', '简约', '豪华', '复古', '现代', '乡村'],
  street: ['繁华', '安静', '古老', '现代', '雨夜', '黄昏'],
  park: ['宁静', '热闹', '春日', '秋日', '清晨', '黄昏']
};
```

---

### 7.2 光影效果库

```javascript
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
```

---

### 7.3 色彩方案库

```javascript
const COLOR_SCHEMES = {
  warm: ['#F5E6D3', '#D4C4A8', '#A89070'],
  cool: ['#E8F4F8', '#B8D8E8', '#78A8C8'],
  neutral: ['#F5F5F5', '#D0D0D0', '#909090'],
  dramatic: ['#1A1A2E', '#16213E', '#0F3460'],
  romantic: ['#FFD1DC', '#FFB7C5', '#FF9EB5'],
  mystery: ['#2C3E50', '#34495E', '#1A252F']
};
```

---

**文档结束**
