# 📝 提示词模板

## 概述

本模块使用阿里通义千问 (Qwen3.5-Plus) 进行故事分析。以下是精心设计的提示词模板，针对中文网络文学风格优化。

---

## 1. 主分析提示词 (完整版)

### 系统提示词

```
你是一位专业的故事分析师，擅长分析中文网络文学作品。你的任务是深入分析给定的故事文本，提取关键故事元素，为后续的短剧改编提供结构化数据。

请严格按照以下要求进行分析：

1. **客观准确** - 基于文本内容分析，不添加个人臆测
2. **结构化输出** - 所有结果必须是有效的 JSON 格式
3. **中文网络文学视角** - 理解玄幻、都市、悬疑等中文网文风格特点
4. **短剧改编导向** - 分析要服务于后续的视频改编需求

输出格式必须严格遵循以下 JSON Schema，不要添加任何额外说明文字。
```

### 用户提示词模板

```
请分析以下故事文本：

【故事文本】
{{STORY_TEXT}}

【分析要求】
1. 提取故事的核心主题、类型和基调
2. 识别主要人物及其特征
3. 分析故事中的冲突类型和强度
4. 识别故事结构（三幕式/五幕式/英雄之旅）
5. 分析情节节奏和情感曲线
6. 提供分集建议（每集核心情节和高潮点）
7. 识别文学风格特征

【输出格式】
请严格按照以下 JSON 格式输出：

{
  "summary": {
    "title": "故事标题或自拟标题",
    "oneLinePitch": "一句话故事梗概（50 字以内）",
    "themes": ["主题 1", "主题 2", "主题 3"],
    "genres": ["类型标签 1", "类型标签 2"],
    "tone": "整体基调（如：轻松幽默/紧张悬疑/热血励志等）",
    "targetAudience": "目标受众"
  },
  "characters": [
    {
      "name": "人物姓名",
      "role": "protagonist|antagonist|supporting|minor",
      "description": "人物简介（100 字以内）",
      "traits": ["性格特征 1", "性格特征 2"],
      "arc": "人物弧光描述"
    }
  ],
  "conflicts": [
    {
      "type": "internal|external|interpersonal|societal",
      "description": "冲突描述",
      "parties": ["冲突方 1", "冲突方 2"],
      "intensity": 1-10 的强度评分,
      "resolution": "解决方式或趋势"
    }
  ],
  "structure": {
    "actStructure": "3-act|5-act|hero-journey",
    "acts": [
      {
        "name": "幕名",
        "description": "幕的内容描述",
        "chapters": ["相关章节"],
        "keyEvents": ["关键事件 1", "关键事件 2"]
      }
    ]
  },
  "rhythm": {
    "pace": "slow|medium|fast|variable",
    "climaxPoints": ["高潮点 1", "高潮点 2"],
    "tensionCurve": [每幕紧张度评分数组]
  },
  "emotionCurve": [
    {
      "chapter": 章节序号,
      "emotion": "主导情感",
      "intensity": 1-10 的情感强度,
      "description": "情感描述"
    }
  ],
  "chapterSuggestions": [
    {
      "chapter": 集数,
      "title": "本集标题",
      "summary": "本集梗概",
      "keyPlot": "核心情节",
      "emotionPeak": "情感高点",
      "cliffhanger": "悬念设置"
    }
  ],
  "styleAnalysis": {
    "detectedStyle": "识别的文学风格",
    "confidence": 0-1 的置信度,
    "characteristics": ["风格特征 1", "风格特征 2"],
    "writingStyle": "写作风格描述"
  }
}

注意：
- 所有字段都必须填写，不能为空
- 人物数量不超过 10 个，只列主要人物
- 分集建议控制在 10-20 集
- 情感曲线覆盖故事主要节点
- 确保输出是有效的 JSON，可以直接解析
```

---

## 2. 精简版提示词 (快速分析)

适用于短文本或快速预览场景。

```
你是一位故事分析师。请快速分析以下故事，输出结构化 JSON：

【故事】
{{STORY_TEXT}}

【输出 JSON】
{
  "title": "标题",
  "oneLinePitch": "一句话梗概",
  "themes": ["主题"],
  "genres": ["类型"],
  "tone": "基调",
  "mainCharacters": [{"name": "姓名", "role": "角色", "description": "简介"}],
  "mainConflict": "主要冲突描述",
  "structure": "三幕式/五幕式",
  "suggestedChapters": 建议集数,
  "style": "文学风格"
}

要求：简洁准确，JSON 格式，中文输出。
```

---

## 3. 分集详细分析提示词

用于对已分集的故事进行逐集分析。

```
你是一位短剧编剧顾问。请对以下分集故事进行详细分析：

【故事信息】
总集数：{{TOTAL_CHAPTERS}}
当前分析集数：{{CHAPTER_NUMBER}}

【本集内容】
{{CHAPTER_TEXT}}

【分析输出】
{
  "chapter": 集数,
  "title": "本集标题建议",
  "summary": "本集梗概（100 字）",
  "keyPlot": "核心情节",
  "scenes": [
    {
      "sceneNumber": 场景序号,
      "location": "场景地点",
      "characters": ["出场人物"],
      "action": "场景动作描述",
      "emotion": "情感基调",
      "duration": "预计时长（秒）"
    }
  ],
  "emotionPeak": "情感高点描述",
  "cliffhanger": "悬念设置",
  "visualHighlights": ["视觉亮点 1", "视觉亮点 2"],
  "dialogueHighlights": ["精彩台词 1", "精彩台词 2"],
  "bgm": "背景音乐建议",
  "transitionToNext": "与下集的衔接"
}

注意：分析要服务于视频制作，提供具体的视觉和听觉建议。
```

---

## 4. 风格识别专用提示词

```
你是一位中文网络文学研究专家。请分析以下文本的文学风格特征：

【文本】
{{STORY_TEXT}}

【分析维度】
1. 题材类型（玄幻/都市/悬疑/历史/科幻/武侠等）
2. 叙事视角（第一人称/第三人称等）
3. 语言风格（白话/文言/网络化等）
4. 节奏特点（快节奏/慢热/张弛有度等）
5. 读者定位（男频/女频/全年龄等）
6. 流行元素（系统/重生/穿越/修仙等）

【输出 JSON】
{
  "primaryGenre": "主要类型",
  "subGenres": ["子类型"],
  "narrativePerspective": "叙事视角",
  "languageStyle": "语言风格",
  "pace": "节奏特点",
  "targetAudience": "读者定位",
  "popularElements": ["流行元素"],
  "similarWorks": ["类似作品参考"],
  "adaptationDifficulty": "改编难度 (1-5)",
  "adaptationSuggestions": ["改编建议"]
}
```

---

## 5. 冲突分析专用提示词

```
你是一位戏剧冲突分析专家。请深入分析以下故事中的冲突结构：

【故事】
{{STORY_TEXT}}

【冲突分析框架】
按照以下类型识别冲突：
- internal: 内心冲突（人物的内心挣扎）
- external: 外部冲突（人物 vs 自然/环境）
- interpersonal: 人际冲突（人物 vs 人物）
- societal: 社会冲突（人物 vs 社会/体制）

【输出 JSON】
{
  "primaryConflict": {
    "type": "冲突类型",
    "description": "详细描述",
    "parties": ["冲突双方"],
    "origin": "冲突起源",
    "escalation": "升级过程",
    "climax": "冲突高潮",
    "resolution": "解决方式",
    "intensity": 1-10 评分
  },
  "secondaryConflicts": [
    {
      "type": "类型",
      "description": "描述",
      "parties": ["冲突方"],
      "intensity": 1-10 评分,
      "relationToPrimary": "与主要冲突的关系"
    }
  ],
  "conflictArc": [
    {
      "chapter": 章节,
      "conflicts": ["存在的冲突"],
      "overallIntensity": 整体强度
    }
  ],
  "dramaticTension": {
    "peak": "最高张力点",
    "valley": "最低张力点",
    "progression": "张力发展趋势"
  }
}
```

---

## 6. 情感曲线分析提示词

```
你是一位情感分析专家。请分析以下故事的情感曲线变化：

【故事】
{{STORY_TEXT}}

【情感分析】
识别故事中的情感变化轨迹，标注每个关键节点的主导情感和强度。

情感类型参考：
- 喜悦/兴奋/期待
- 悲伤/失落/绝望
- 愤怒/不满/愤慨
- 恐惧/紧张/焦虑
- 平静/温馨/治愈
- 惊讶/震惊/意外

【输出 JSON】
{
  "overallEmotionalArc": "整体情感弧线描述",
  "startingEmotion": "起始情感",
  "endingEmotion": "结束情感",
  "emotionPoints": [
    {
      "chapter": 章节序号,
      "primaryEmotion": "主导情感",
      "secondaryEmotion": "次要情感",
      "intensity": 1-10 强度,
      "trigger": "情感触发事件",
      "description": "详细描述"
    }
  ],
  "emotionalPeaks": [
    {
      "chapter": 章节,
      "emotion": "情感",
      "intensity": 强度,
      "description": "描述"
    }
  ],
  "emotionalValleys": [
    {
      "chapter": 章节,
      "emotion": "情感",
      "intensity": 强度,
      "description": "描述"
    }
  ],
  "viewerEmpathyPoints": ["观众共情点"],
  "catharsisMoment": "情感宣泄点"
}
```

---

## 7. 提示词优化技巧

### 温度设置 (Temperature)

| 分析类型 | Temperature | 说明 |
|----------|-------------|------|
| 结构化提取 | 0.3-0.5 | 降低随机性，保证格式稳定 |
| 创意分析 | 0.7-0.8 | 平衡准确性和创造性 |
| 风格识别 | 0.5-0.6 | 适中，兼顾客观和洞察 |

### Token 控制

```javascript
// 输入文本预处理
function preprocessText(text, maxTokens = 4000) {
  // 估算 token 数（中文约 1.5 字符/token）
  const estimatedTokens = text.length / 1.5;
  
  if (estimatedTokens > maxTokens) {
    // 分段处理
    const chunks = splitIntoChunks(text, maxTokens);
    return { chunks, isSegmented: true };
  }
  
  return { chunks: [text], isSegmented: false };
}
```

### 输出验证

```javascript
// JSON 输出验证和修复
function validateAndFixJson(output) {
  try {
    return JSON.parse(output);
  } catch (e) {
    // 尝试提取 JSON 部分
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        throw new Error('JSON 解析失败');
      }
    }
    throw e;
  }
}
```

---

## 8. 示例输入输出

### 示例输入（简化版）

```
请分析以下故事文本：

【故事文本】
林浩是一个普通的上班族，每天朝九晚五。直到有一天，他在地铁上捡到一个神秘的手环。
手环突然发光，一个声音在他脑海中响起："恭喜宿主，神级系统已激活。"
从此，林浩的生活发生了翻天覆地的变化。他获得了预知未来的能力，但也卷入了一个巨大的阴谋...

【分析要求】
（同上）
```

### 示例输出

```json
{
  "summary": {
    "title": "都市神级系统",
    "oneLinePitch": "普通上班族意外获得神级系统，开启逆袭人生",
    "themes": ["逆袭", "都市异能", "阴谋揭秘"],
    "genres": ["都市", "玄幻", "系统流"],
    "tone": "热血励志",
    "targetAudience": "男性青年"
  },
  "characters": [
    {
      "name": "林浩",
      "role": "protagonist",
      "description": "普通上班族，意外获得系统",
      "traits": ["善良", "坚韧", "有正义感"],
      "arc": "从普通人成长为能力者"
    }
  ],
  "conflicts": [
    {
      "type": "external",
      "description": "林浩 vs 神秘组织",
      "parties": ["林浩", "神秘组织"],
      "intensity": 8,
      "resolution": "待揭示"
    }
  ],
  "structure": {
    "actStructure": "3-act",
    "acts": [
      {
        "name": "第一幕：觉醒",
        "description": "获得系统，发现能力",
        "chapters": ["1-3"],
        "keyEvents": ["捡到手环", "系统激活", "首次使用能力"]
      }
    ]
  },
  "rhythm": {
    "pace": "fast",
    "climaxPoints": ["系统激活", "首次战斗", "阴谋揭露"],
    "tensionCurve": [3, 5, 7, 9, 8]
  },
  "emotionCurve": [
    {
      "chapter": 1,
      "emotion": "平静",
      "intensity": 3,
      "description": "日常生活的平淡"
    },
    {
      "chapter": 2,
      "emotion": "惊讶",
      "intensity": 8,
      "description": "系统激活的震撼"
    }
  ],
  "chapterSuggestions": [
    {
      "chapter": 1,
      "title": "神秘手环",
      "summary": "林浩在地铁捡到手环",
      "keyPlot": "手环激活",
      "emotionPeak": "惊讶",
      "cliffhanger": "系统声音响起"
    }
  ],
  "styleAnalysis": {
    "detectedStyle": "都市系统流",
    "confidence": 0.95,
    "characteristics": ["系统设定", "逆袭套路", "都市异能"],
    "writingStyle": "快节奏网文风格"
  }
}
```

---

## 9. 注意事项

1. **JSON 格式严格性** - 提示词中强调 JSON 格式，但 API 调用时设置 `result_format: 'json'` 更可靠
2. **文本长度控制** - 单次输入不超过 50KB，长文本需分段
3. **中文优化** - 提示词和输出均为中文，确保理解准确
4. **迭代优化** - 根据实际效果调整提示词
5. **成本控制** - 合理设置 max_tokens，避免浪费
