# API 接口定义

## 模块 API

### 1. 分析人物 (analyze)

**功能**: 从故事文本中分析并提取人物信息

**端点**: `POST /api/v1/characters/analyze`

**请求体**:
```json
{
  "text": "故事文本或人物描述",
  "options": {
    "model": "qwen-plus",
    "temperature": 0.7,
    "maxTokens": 2000,
    "extractRelationships": true,
    "generateConsistency": true
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "characters": [...],
    "metadata": {
      "processingTime": 1234,
      "model": "qwen-plus",
      "tokensUsed": 1500
    }
  },
  "error": null
}
```

---

### 2. 获取人物详情 (getCharacter)

**功能**: 根据人物 ID 获取详细信息

**端点**: `GET /api/v1/characters/:id`

**路径参数**:
- `id`: 人物 ID

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "char_001",
    "name": "林小雅",
    ...
  }
}
```

---

### 3. 更新人物档案 (updateCharacter)

**功能**: 更新现有人物档案

**端点**: `PUT /api/v1/characters/:id`

**请求体**:
```json
{
  "name": "林小雅",
  "appearance": { ... },
  "personality": { ... },
  "clothing": { ... }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "char_001",
    "updatedAt": "2025-03-07T12:00:00Z"
  }
}
```

---

### 4. 生成一致性描述 (generateConsistency)

**功能**: 为人物生成用于视频生成的一致性描述

**端点**: `POST /api/v1/characters/:id/consistency`

**路径参数**:
- `id`: 人物 ID

**请求体**:
```json
{
  "scene": "办公室场景",
  "emotion": "专注工作",
  "lighting": "自然光",
  "angle": "正面中景"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "prompt": "一位 25 岁中国女性，乌黑长发，穿着白色职业衬衫，坐在办公室桌前专注工作，自然光从窗户照入，正面中景镜头",
    "negativePrompt": "卡通，动漫，低质量，模糊，变形",
    "parameters": {
      "seed": 12345,
      "steps": 30,
      "cfg": 7.5
    }
  }
}
```

---

### 5. 批量分析 (batchAnalyze)

**功能**: 批量分析多个故事片段中的人物

**端点**: `POST /api/v1/characters/batch-analyze`

**请求体**:
```json
{
  "texts": [
    "第一段故事文本...",
    "第二段故事文本...",
    "第三段故事文本..."
  ],
  "options": {
    "mergeCharacters": true,
    "resolveRelationships": true
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "characters": [...],
    "mergedCount": 5,
    "newCharacters": 3
  }
}
```

---

## 阿里通义千问 API 集成

### 调用方式

```javascript
const dashscope = require('dashscope');

dashscope.configure({ apiKey: process.env.DASHSCOPE_API_KEY });

async function callQwen(prompt, options = {}) {
  const response = await dashscope.chat.completions.create({
    model: options.model || 'qwen-plus',
    messages: [
      {
        role: 'system',
        content: '你是一个专业的人物分析师，擅长从文本中提取和分析人物信息。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || 2000
  });
  
  return response.choices[0].message.content;
}
```

### 错误码

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查输入格式 |
| 401 | API Key 无效 | 检查密钥配置 |
| 429 | 频率限制 | 等待后重试 |
| 500 | 服务器错误 | 联系支持 |
| 503 | 服务不可用 | 稍后重试 |

---

## 数据库 API (PostgreSQL)

### 人物表 (characters)

```sql
CREATE TABLE characters (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  age INTEGER,
  gender VARCHAR(20),
  appearance JSONB,
  personality JSONB,
  clothing JSONB,
  relationships JSONB,
  consistency JSONB,
  project_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### CRUD 操作

```javascript
// 创建人物
async function createCharacter(character) {
  const query = `
    INSERT INTO characters (id, name, age, gender, appearance, personality, clothing, relationships, consistency, project_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  return await db.query(query, [
    character.id,
    character.name,
    character.age,
    character.gender,
    JSON.stringify(character.appearance),
    JSON.stringify(character.personality),
    JSON.stringify(character.clothing),
    JSON.stringify(character.relationships),
    JSON.stringify(character.consistency),
    character.projectId
  ]);
}

// 查询人物
async function getCharacterById(id) {
  const query = 'SELECT * FROM characters WHERE id = $1';
  return await db.query(query, [id]);
}

// 更新人物
async function updateCharacter(id, updates) {
  const query = `
    UPDATE characters
    SET name = $2, appearance = $3, personality = $4, clothing = $5, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  return await db.query(query, [
    id,
    updates.name,
    JSON.stringify(updates.appearance),
    JSON.stringify(updates.personality),
    JSON.stringify(updates.clothing)
  ]);
}

// 删除人物
async function deleteCharacter(id) {
  const query = 'DELETE FROM characters WHERE id = $1';
  return await db.query(query, [id]);
}

// 按项目查询人物
async function getCharactersByProject(projectId) {
  const query = 'SELECT * FROM characters WHERE project_id = $1 ORDER BY created_at';
  return await db.query(query, [projectId]);
}
```

---

## 事件总线

### 触发事件

```javascript
// 人物创建
eventBus.emit('character:created', {
  characterId: 'char_001',
  projectId: 'proj_001',
  timestamp: Date.now()
});

// 人物更新
eventBus.emit('character:updated', {
  characterId: 'char_001',
  changes: ['appearance', 'clothing'],
  timestamp: Date.now()
});

// 人物删除
eventBus.emit('character:deleted', {
  characterId: 'char_001',
  timestamp: Date.now()
});
```

### 订阅事件

```javascript
// 监听人物创建
eventBus.on('character:created', async (event) => {
  // 通知场景构建模块
  await sceneBuilder.notifyNewCharacter(event.characterId);
});
```

---

## 速率限制

| 端点 | 限制 | 窗口 |
|------|------|------|
| /analyze | 10 次/分钟 | 滑动窗口 |
| /batch-analyze | 2 次/分钟 | 滑动窗口 |
| /characters/:id | 100 次/分钟 | 滑动窗口 |

---

## 认证

所有 API 端点需要 Bearer Token 认证：

```
Authorization: Bearer <your_token>
```

Token 通过 JWT 生成，有效期 24 小时。
