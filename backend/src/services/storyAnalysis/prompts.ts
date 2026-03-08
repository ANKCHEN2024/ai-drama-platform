interface PromptTemplate {
  system: string;
  user: string;
}

export class PromptManager {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates(): void {
    this.templates.set('main-analysis', {
      system: `你是一位专业的故事分析师，擅长分析中文网络文学作品。你的任务是深入分析给定的故事文本，提取关键故事元素，为后续的短剧改编提供结构化数据。

请严格按照以下要求进行分析：
1. **客观准确** - 基于文本内容分析，不添加个人臆测
2. **结构化输出** - 所有结果必须是有效的 JSON 格式
3. **中文网络文学视角** - 理解玄幻、都市、悬疑等中文网文风格特点
4. **短剧改编导向** - 分析要服务于后续的视频改编需求

输出格式必须严格遵循 JSON Schema，不要添加任何额外说明文字。`,
      user: `请分析以下故事文本：

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
      "arc": "人物弧光描述",
      "appearance": "外貌描述",
      "gender": "性别",
      "ageRange": "年龄范围"
    }
  ],
  "scenes": [
    {
      "name": "场景名称",
      "description": "场景描述",
      "locationType": "场景类型（如：室内/室外/宫殿/森林等）",
      "timeOfDay": "时间（白天/黑夜/黎明/黄昏等）",
      "atmosphere": "氛围描述",
      "visualStyle": "视觉风格"
    }
  ],
  "conflicts": [
    {
      "type": "internal|external|interpersonal|societal",
      "description": "冲突描述",
      "parties": ["冲突方 1", "冲突方 2"],
      "intensity": 5,
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
    "tensionCurve": [1, 3, 5, 8, 10]
  },
  "emotionCurve": [
    {
      "chapter": 1,
      "emotion": "主导情感",
      "intensity": 5,
      "description": "情感描述"
    }
  ],
  "chapterSuggestions": [
    {
      "chapter": 1,
      "title": "本集标题",
      "summary": "本集梗概",
      "keyPlot": "核心情节",
      "emotionPeak": "情感高点",
      "cliffhanger": "悬念设置"
    }
  ],
  "styleAnalysis": {
    "detectedStyle": "识别的文学风格",
    "confidence": 0.8,
    "characteristics": ["风格特征 1", "风格特征 2"],
    "writingStyle": "写作风格描述"
  }
}

注意：
- 所有字段都必须填写，不能为空
- 人物数量不超过 10 个，只列主要人物
- 分集建议控制在 10-20 集
- 情感曲线覆盖故事主要节点
- 确保输出是有效的 JSON，可以直接解析`
    });

    this.templates.set('quick-analysis', {
      system: '你是一位故事分析师。请快速分析故事，输出结构化 JSON。',
      user: `请快速分析以下故事：

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
  "suggestedChapters": 10,
  "style": "文学风格"
}

要求：简洁准确，JSON 格式，中文输出。`
    });
  }

  getTemplate(name: string): PromptTemplate {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }
    return template;
  }

  render(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  addTemplate(name: string, template: PromptTemplate): void {
    this.templates.set(name, template);
  }
}
