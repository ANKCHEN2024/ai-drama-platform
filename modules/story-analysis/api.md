# 🔌 API 接口定义

## 模块 API

### 1. 故事分析接口

#### 接口信息

| 属性 | 值 |
|------|-----|
| 路径 | `/api/v1/story/analyze` |
| 方法 | `POST` |
| 认证 | Bearer Token |
| 超时 | 30 秒 |

#### 请求参数

```json
{
  "text": "string (required)",
  "options": {
    "style": "string (optional)",
    "maxChapters": "number (optional)",
    "includeEmotionCurve": "boolean (optional, default: true)",
    "includeConflictAnalysis": "boolean (optional, default: true)"
  }
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| text | string | 是 | 故事文本或大纲，最大 50KB |
| options.style | string | 否 | 指定文学风格 (玄幻/都市/悬疑等) |
| options.maxChapters | number | 否 | 建议分集数量 (10-100) |
| options.includeEmotionCurve | boolean | 否 | 是否包含情感曲线分析 |
| options.includeConflictAnalysis | boolean | 否 | 是否包含冲突分析 |

#### 响应格式

**成功响应 (200 OK):**

```json
{
  "success": true,
  "data": {
    "analysisId": "string",
    "timestamp": "number",
    "textLength": "number",
    "summary": {
      "title": "string",
      "oneLinePitch": "string",
      "themes": ["string"],
      "genres": ["string"],
      "tone": "string",
      "targetAudience": "string"
    },
    "characters": [
      {
        "name": "string",
        "role": "string",
        "description": "string",
        "traits": ["string"],
        "arc": "string"
      }
    ],
    "conflicts": [
      {
        "type": "internal|external|interpersonal|societal",
        "description": "string",
        "parties": ["string"],
        "intensity": "number (1-10)",
        "resolution": "string"
      }
    ],
    "structure": {
      "actStructure": "3-act|5-act|hero-journey",
      "acts": [
        {
          "name": "string",
          "description": "string",
          "chapters": ["string"],
          "keyEvents": ["string"]
        }
      ]
    },
    "rhythm": {
      "pace": "slow|medium|fast|variable",
      "climaxPoints": ["string"],
      "tensionCurve": ["number"]
    },
    "emotionCurve": [
      {
        "chapter": "number",
        "emotion": "string",
        "intensity": "number (1-10)",
        "description": "string"
      }
    ],
    "chapterSuggestions": [
      {
        "chapter": "number",
        "title": "string",
        "summary": "string",
        "keyPlot": "string",
        "emotionPeak": "string",
        "cliffhanger": "string"
      }
    ],
    "styleAnalysis": {
      "detectedStyle": "string",
      "confidence": "number",
      "characteristics": ["string"],
      "writingStyle": "string"
    }
  },
  "meta": {
    "model": "qwen3.5-plus",
    "tokens": {
      "input": "number",
      "output": "number"
    },
    "processingTime": "number"
  }
}
```

**错误响应:**

```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": "object (optional)"
  }
}
```

#### 错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| INVALID_INPUT | 400 | 输入参数无效 |
| TEXT_TOO_LONG | 400 | 文本超过 50KB 限制 |
| UNAUTHORIZED | 401 | 认证失败 |
| API_ERROR | 502 | 通义千问 API 调用失败 |
| TIMEOUT | 504 | 请求超时 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

### 2. 批量分析接口

#### 接口信息

| 属性 | 值 |
|------|-----|
| 路径 | `/api/v1/story/analyze/batch` |
| 方法 | `POST` |
| 认证 | Bearer Token |
| 超时 | 120 秒 |

#### 请求参数

```json
{
  "texts": [
    {
      "id": "string",
      "text": "string",
      "options": {}
    }
  ],
  "callbackUrl": "string (optional)"
}
```

#### 响应格式

**异步任务提交成功 (202 Accepted):**

```json
{
  "success": true,
  "data": {
    "taskId": "string",
    "status": "pending",
    "totalTasks": "number",
    "estimatedTime": "number"
  }
}
```

**查询任务状态 (GET /api/v1/story/analyze/batch/:taskId):**

```json
{
  "success": true,
  "data": {
    "taskId": "string",
    "status": "pending|processing|completed|failed",
    "progress": "number (0-100)",
    "results": [
      {
        "id": "string",
        "status": "success|failed",
        "data": {},
        "error": {}
      }
    ]
  }
}
```

---

### 3. 分析历史接口

#### 接口信息

| 属性 | 值 |
|------|-----|
| 路径 | `/api/v1/story/history` |
| 方法 | `GET` |
| 认证 | Bearer Token |

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码 (default: 1) |
| pageSize | number | 否 | 每页数量 (default: 20) |
| startDate | string | 否 | 开始日期 (ISO 8601) |
| endDate | string | 否 | 结束日期 (ISO 8601) |

#### 响应格式

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "analysisId": "string",
        "title": "string",
        "textLength": "number",
        "timestamp": "number",
        "themes": ["string"],
        "genres": ["string"]
      }
    ],
    "pagination": {
      "page": "number",
      "pageSize": "number",
      "total": "number",
      "totalPages": "number"
    }
  }
}
```

---

### 4. 获取分析详情接口

#### 接口信息

| 属性 | 值 |
|------|-----|
| 路径 | `/api/v1/story/history/:analysisId` |
| 方法 | `GET` |
| 认证 | Bearer Token |

#### 响应格式

```json
{
  "success": true,
  "data": {
    "analysisId": "string",
    "timestamp": "number",
    "text": "string (truncated)",
    "result": {}
  }
}
```

---

## 通义千问 API 配置

### SDK 初始化

```javascript
const DashScope = require('dashscope');

const client = new DashScope({
  apiKey: process.env.DASHSCOPE_API_KEY,
  model: 'qwen3.5-plus',
  timeout: 30000
});
```

### API 调用参数

```javascript
{
  model: 'qwen3.5-plus',
  input: {
    messages: [
      {
        role: 'system',
        content: '系统提示词 (见 prompts.md)'
      },
      {
        role: 'user',
        content: '用户输入的故事文本'
      }
    ]
  },
  parameters: {
    temperature: 0.7,
    max_tokens: 4096,
    result_format: 'json'
  }
}
```

---

## 数据模型

### TypeScript 类型定义

```typescript
interface StoryAnalysis {
  analysisId: string;
  timestamp: number;
  textLength: number;
  summary: StorySummary;
  characters: Character[];
  conflicts: Conflict[];
  structure: StoryStructure;
  rhythm: StoryRhythm;
  emotionCurve: EmotionPoint[];
  chapterSuggestions: ChapterSuggestion[];
  styleAnalysis: StyleAnalysis;
}

interface StorySummary {
  title: string;
  oneLinePitch: string;
  themes: string[];
  genres: string[];
  tone: string;
  targetAudience: string;
}

interface Character {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  description: string;
  traits: string[];
  arc: string;
}

interface Conflict {
  type: 'internal' | 'external' | 'interpersonal' | 'societal';
  description: string;
  parties: string[];
  intensity: number;
  resolution: string;
}

interface StoryStructure {
  actStructure: '3-act' | '5-act' | 'hero-journey';
  acts: Act[];
}

interface Act {
  name: string;
  description: string;
  chapters: string[];
  keyEvents: string[];
}

interface StoryRhythm {
  pace: 'slow' | 'medium' | 'fast' | 'variable';
  climaxPoints: string[];
  tensionCurve: number[];
}

interface EmotionPoint {
  chapter: number;
  emotion: string;
  intensity: number;
  description: string;
}

interface ChapterSuggestion {
  chapter: number;
  title: string;
  summary: string;
  keyPlot: string;
  emotionPeak: string;
  cliffhanger: string;
}

interface StyleAnalysis {
  detectedStyle: string;
  confidence: number;
  characteristics: string[];
  writingStyle: string;
}
```

---

## 环境配置

```bash
# .env
DASHSCOPE_API_KEY=your_api_key_here
DASHSCOPE_MODEL=qwen3.5-plus
DASHSCOPE_TIMEOUT=30000
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@localhost:5432/drama_platform
```
