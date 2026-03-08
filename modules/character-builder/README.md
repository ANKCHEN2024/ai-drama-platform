# 人物构建模块 (Character Builder)

## 模块概述

人物构建模块负责从故事文本中提取和分析人物信息，生成详细的人物档案，并输出用于视频生成的人物一致性描述。

### 核心功能
- 📖 从故事文本中自动提取人物信息
- 🎭 生成详细人物档案（外貌、性格、关系、服装）
- 🖼️ 生成人物一致性描述（用于 AI 视频生成）
- 🔄 支持人物档案的更新和迭代

### 技术栈
- **AI 模型**: 阿里通义千问 (Qwen)
- **运行时**: Node.js 20+
- **输入格式**: JSON / Markdown / 纯文本
- **输出格式**: JSON (人物档案)

---

## 模块架构

```
character-builder/
├── src/
│   ├── index.js           # 模块入口
│   ├── analyzer.js        # 人物分析器
│   ├── profile.js         # 档案生成器
│   ├── consistency.js     # 一致性描述生成
│   └── prompts.js         # 提示词模板
├── tests/
│   └── analyzer.test.js   # 单元测试
├── README.md              # 本文档
├── api.md                 # API 接口定义
├── schema.md              # 数据结构定义
└── prompts.md             # 提示词模板
```

---

## 工作流程

```
┌─────────────────┐
│  输入故事文本   │
│  /人物描述      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  通义千问 API   │
│  人物分析       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  人物档案生成   │
│  (外貌/性格/    │
│   关系/服装)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  一致性描述生成 │
│  (用于视频生成) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  输出 JSON      │
└─────────────────┘
```

---

## 使用示例

### 基本用法

```javascript
const CharacterBuilder = require('./src/index');

const builder = new CharacterBuilder({
  apiKey: process.env.DASHSCOPE_API_KEY,
  model: 'qwen-plus'
});

// 从故事文本分析人物
const story = `
  林小雅，25 岁，是一家广告公司的创意总监。
  她有一头乌黑的长发，总是穿着得体的职业装。
  性格独立坚强，但内心柔软。
  与同事张伟是多年的好友...
`;

const result = await builder.analyze(story);
console.log(result.characters);
```

### 输出示例

```json
{
  "characters": [
    {
      "id": "char_001",
      "name": "林小雅",
      "age": 25,
      "gender": "女",
      "appearance": {
        "hair": "乌黑长发",
        "eyes": "明亮有神",
        "height": "165cm",
        "build": "匀称",
        "features": "五官精致，气质优雅"
      },
      "personality": {
        "traits": ["独立", "坚强", "柔软", "专业"],
        "description": "外表强势独立，内心温柔善良，工作上严谨专业"
      },
      "clothing": {
        "style": "职业装",
        "colors": ["黑色", "白色", "灰色"],
        "description": "得体的职业套装，简约大方"
      },
      "relationships": [
        {
          "character": "张伟",
          "type": "好友",
          "description": "多年同事兼好友"
        }
      ],
      "consistency": {
        "prompt": "一位 25 岁中国女性，乌黑长发，穿着职业装，气质优雅专业",
        "negativePrompt": "卡通，动漫，低质量",
        "seed": 12345
      }
    }
  ]
}
```

---

## API 集成

### 阿里通义千问配置

```javascript
// 环境变量
DASHSCOPE_API_KEY=your_api_key_here

// 推荐模型
- qwen-plus: 标准版，性价比高
- qwen-max: 高级版，效果更好
- qwen-turbo: 快速版，响应快
```

### 调用限制

| 模型 | QPS | TPM | 价格 |
|------|-----|-----|------|
| qwen-turbo | 100 | 100 万 | ¥0.002/1K tokens |
| qwen-plus | 50 | 50 万 | ¥0.004/1K tokens |
| qwen-max | 20 | 20 万 | ¥0.02/1K tokens |

---

## 错误处理

```javascript
try {
  const result = await builder.analyze(story);
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    // 频率限制，等待后重试
  } else if (error.code === 'INVALID_INPUT') {
    // 输入格式错误
  } else {
    // 其他错误
  }
}
```

---

## 测试

```bash
# 运行单元测试
npm test

# 运行集成测试
npm run test:integration
```

---

## 依赖模块

- **上游**: story-analyzer (故事分析模块)
- **下游**: scene-builder (场景构建模块)
- **下游**: video-generator (视频生成模块)

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 0.1.0 | 2025-03-07 | 初始版本，核心功能完成 |

---

## 联系方式

- 负责人：Subagent-03
- 项目：AI-DRAMA-PLATFORM
- 文档：/ai-drama-platform/modules/character-builder/README.md
