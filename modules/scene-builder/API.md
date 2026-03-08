# 📡 场景构建模块 - API 接口定义

## 1. 接口概览

| 接口 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 场景分析 | POST | `/api/v1/scene/analyze` | 分析剧本生成场景描述 |
| 场景生成 | POST | `/api/v1/scene/generate` | 生成场景图像 |
| 场景查询 | GET | `/api/v1/scenes` | 查询场景库 |
| 场景详情 | GET | `/api/v1/scenes/:sceneId` | 获取场景详情 |
| 场景更新 | PUT | `/api/v1/scenes/:sceneId` | 更新场景信息 |
| 一致性检查 | POST | `/api/v1/scene/check-consistency` | 检查场景一致性 |
| 场景删除 | DELETE | `/api/v1/scenes/:sceneId` | 删除场景 |

---

## 2. 详细接口定义

### 2.1 场景分析

**接口**: `POST /api/v1/scene/analyze`

**描述**: 分析剧本/分镜描述，生成结构化场景描述

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "script": "清晨，李明坐在办公室里，阳光透过百叶窗洒在桌面上。他拿起咖啡杯，轻轻喝了一口。",
  "sceneId": "office_001",
  "episodeId": "ep_001",
  "options": {
    "includeImagePrompt": true,
    "generateConsistency": true,
    "style": "modern_office"
  }
}
```

**请求参数说明**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| script | string | 是 | 剧本片段或分镜描述 |
| sceneId | string | 否 | 场景 ID（用于一致性维护） |
| episodeId | string | 否 | 所属集数 ID |
| options.includeImagePrompt | boolean | 否 | 是否生成图像提示词（默认 true） |
| options.generateConsistency | boolean | 否 | 是否生成一致性信息（默认 true） |
| options.style | string | 否 | 指定风格（可选） |

**响应**:
```json
{
  "success": true,
  "data": {
    "sceneId": "office_001",
    "location": "现代办公室",
    "time": "清晨",
    "atmosphere": "宁静、充满希望",
    "props": ["办公桌", "百叶窗", "咖啡杯", "电脑"],
    "characterPositions": [
      {
        "character": "李明",
        "position": "坐在办公桌前",
        "action": "喝咖啡"
      }
    ],
    "lighting": "自然光，从左侧窗户透过百叶窗射入",
    "colorPalette": ["#F5E6D3", "#8B7355", "#2C3E50"],
    "imagePrompt": "现代办公室，清晨阳光，百叶窗光影，办公桌上有咖啡杯和电脑，一人坐在桌前，温暖色调，电影感",
    "consistency": {
      "baseSeed": 12345,
      "style": "modern_office",
      "version": "1.0"
    },
    "metadata": {
      "episodeId": "ep_001",
      "shotIds": [],
      "createdAt": "2025-03-07T10:00:00Z",
      "updatedAt": "2025-03-07T10:00:00Z"
    }
  },
  "meta": {
    "analysisTime": 2.3,
    "model": "qwen-plus"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "SCRIPT_TOO_SHORT",
    "message": "剧本描述太短，无法分析",
    "details": {
      "minLength": 20,
      "actualLength": 10
    }
  }
}
```

---

### 2.2 场景生成

**接口**: `POST /api/v1/scene/generate`

**描述**: 根据场景描述生成场景图像

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "description": {
    "location": "现代办公室",
    "time": "清晨",
    "atmosphere": "宁静、充满希望",
    "props": ["办公桌", "百叶窗", "咖啡杯"],
    "characterPositions": [
      { "character": "李明", "position": "坐在办公桌前" }
    ],
    "lighting": "自然光，从左侧窗户射入",
    "colorPalette": ["#F5E6D3", "#8B7355"],
    "imagePrompt": "现代办公室，清晨阳光..."
  },
  "width": 1920,
  "height": 1080,
  "seed": 12345,
  "negativePrompt": "模糊、低质量、变形",
  "options": {
    "saveToStorage": true,
    "generateThumbnail": true
  }
}
```

**请求参数说明**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| description | SceneDescription | 是 | 场景描述对象 |
| width | number | 否 | 图像宽度（默认 1920） |
| height | number | 否 | 图像高度（默认 1080） |
| seed | number | 否 | 随机种子（用于一致性） |
| negativePrompt | string | 否 | 负面提示词 |
| options.saveToStorage | boolean | 否 | 是否保存到存储（默认 true） |
| options.generateThumbnail | boolean | 否 | 是否生成缩略图（默认 true） |

**响应**:
```json
{
  "success": true,
  "data": {
    "imageUrl": "https://minio.example.com/scenes/office_001_shot1.png",
    "thumbnailUrl": "https://minio.example.com/scenes/office_001_shot1_thumb.png",
    "seed": 12345,
    "width": 1920,
    "height": 1080,
    "model": "wanx-v1",
    "generationTime": 8.5
  },
  "meta": {
    "cost": 0.02,
    "credits": 1
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "IMAGE_GENERATION_FAILED",
    "message": "图像生成失败",
    "details": {
      "reason": "API 超时",
      "retryable": true
    }
  }
}
```

---

### 2.3 场景查询

**接口**: `GET /api/v1/scenes`

**描述**: 查询场景库中的场景

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| sceneId | string | 否 | 场景 ID 过滤 |
| episodeId | string | 否 | 集数 ID 过滤 |
| style | string | 否 | 风格过滤 |
| location | string | 否 | 地点关键词搜索 |
| page | number | 否 | 页码（默认 1） |
| pageSize | number | 否 | 每页数量（默认 20，最大 100） |

**请求示例**:
```
GET /api/v1/scenes?episodeId=ep_001&style=modern_office&page=1&pageSize=20
```

**响应**:
```json
{
  "success": true,
  "data": {
    "scenes": [
      {
        "sceneId": "office_001",
        "location": "现代办公室",
        "time": "清晨",
        "style": "modern_office",
        "thumbnailUrl": "https://minio.example.com/scenes/office_001_thumb.png",
        "createdAt": "2025-03-07T10:00:00Z"
      },
      {
        "sceneId": "office_002",
        "location": "现代办公室",
        "time": "夜晚",
        "style": "modern_office",
        "thumbnailUrl": "https://minio.example.com/scenes/office_002_thumb.png",
        "createdAt": "2025-03-07T11:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### 2.4 场景详情

**接口**: `GET /api/v1/scenes/:sceneId`

**描述**: 获取场景详细信息

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| sceneId | string | 场景 ID |

**请求示例**:
```
GET /api/v1/scenes/office_001
```

**响应**:
```json
{
  "success": true,
  "data": {
    "sceneId": "office_001",
    "location": "现代办公室",
    "time": "清晨",
    "atmosphere": "宁静、充满希望",
    "props": ["办公桌", "百叶窗", "咖啡杯", "电脑"],
    "characterPositions": [
      {
        "character": "李明",
        "position": "坐在办公桌前",
        "action": "喝咖啡"
      }
    ],
    "lighting": "自然光，从左侧窗户透过百叶窗射入",
    "colorPalette": ["#F5E6D3", "#8B7355", "#2C3E50"],
    "imagePrompt": "现代办公室，清晨阳光...",
    "consistency": {
      "baseSeed": 12345,
      "style": "modern_office",
      "version": "1.0"
    },
    "images": [
      {
        "imageUrl": "https://minio.example.com/scenes/office_001_shot1.png",
        "thumbnailUrl": "https://minio.example.com/scenes/office_001_shot1_thumb.png",
        "seed": 12345,
        "width": 1920,
        "height": 1080,
        "createdAt": "2025-03-07T10:05:00Z"
      }
    ],
    "metadata": {
      "episodeId": "ep_001",
      "shotIds": ["shot_001", "shot_002"],
      "createdAt": "2025-03-07T10:00:00Z",
      "updatedAt": "2025-03-07T10:05:00Z"
    }
  }
}
```

---

### 2.5 场景更新

**接口**: `PUT /api/v1/scenes/:sceneId`

**描述**: 更新场景信息

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| sceneId | string | 场景 ID |

**请求体**:
```json
{
  "location": "现代办公室（重新装修）",
  "atmosphere": "紧张、压抑",
  "props": ["办公桌", "百叶窗", "文件"],
  "colorPalette": ["#2C3E50", "#34495E"],
  "imagePrompt": "现代办公室，夜晚，紧张氛围..."
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "sceneId": "office_001",
    "location": "现代办公室（重新装修）",
    "updatedAt": "2025-03-07T12:00:00Z",
    "version": "1.1"
  }
}
```

---

### 2.6 一致性检查

**接口**: `POST /api/v1/scene/check-consistency`

**描述**: 检查两个场景的一致性

**请求体**:
```json
{
  "referenceSceneId": "office_001",
  "newSceneDescription": {
    "location": "办公室",
    "time": "早上",
    "props": ["桌子", "电脑"],
    "colorPalette": ["#F5E6D3", "#8B7355"]
  },
  "checkDimensions": ["location", "props", "colorPalette"]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "isConsistent": true,
    "score": 0.92,
    "differences": [
      {
        "dimension": "time",
        "reference": "清晨",
        "new": "早上",
        "severity": "low"
      }
    ],
    "consistentElements": [
      "location",
      "props",
      "colorPalette"
    ],
    "suggestions": [
      "建议统一时间描述为'清晨'"
    ]
  }
}
```

---

### 2.7 场景删除

**接口**: `DELETE /api/v1/scenes/:sceneId`

**描述**: 删除场景（软删除，保留历史记录）

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| sceneId | string | 场景 ID |

**响应**:
```json
{
  "success": true,
  "data": {
    "sceneId": "office_001",
    "deletedAt": "2025-03-07T12:00:00Z",
    "status": "deleted"
  }
}
```

---

## 3. 错误码定义

| 错误码 | HTTP 状态码 | 描述 |
|--------|-----------|------|
| SCRIPT_TOO_SHORT | 400 | 剧本描述太短 |
| INVALID_SCENE_FORMAT | 400 | 场景格式无效 |
| SCENE_NOT_FOUND | 404 | 场景不存在 |
| IMAGE_GENERATION_FAILED | 500 | 图像生成失败 |
| API_RATE_LIMIT_EXCEEDED | 429 | API 调用超限 |
| INSUFFICIENT_CREDITS | 402 | 积分不足 |
| INTERNAL_ERROR | 500 | 内部错误 |

---

## 4. 速率限制

| 接口 | 限制 |
|------|------|
| /api/v1/scene/analyze | 60 次/分钟 |
| /api/v1/scene/generate | 10 次/分钟 |
| /api/v1/scenes (查询) | 100 次/分钟 |

---

## 5. 认证与授权

### 5.1 认证方式
- Bearer Token (JWT)
- API Key (服务端对服务端)

### 5.2 权限级别
| 权限 | 描述 |
|------|------|
| scene:read | 读取场景 |
| scene:write | 创建/更新场景 |
| scene:delete | 删除场景 |
| scene:generate | 生成场景图像 |

---

## 6. 版本控制

- API 版本通过 URL 路径标识：`/api/v1/`
- 向后兼容至少 2 个版本
- 废弃接口提前 30 天通知

---

**文档结束**
