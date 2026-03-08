# 🎬 分镜生成模块设计文档

> **模块名称**: storyboard-generator  
> **版本**: 1.0  
> **创建时间**: 2026-03-07  
> **API**: 阿里通义万相 (Text-to-Image)

---

## 📋 目录

1. [模块概述](#模块概述)
2. [功能需求](#功能需求)
3. [数据结构设计](#数据结构设计)
4. [API 集成方案](#api 集成方案)
5. [一致性控制方案](#一致性控制方案)
6. [接口设计](#接口设计)
7. [工作流程](#工作流程)

---

## 模块概述

### 定位
分镜生成模块是 AI 短剧平台的核心模块之一，负责将剧本中的场景描述自动转换为可视化的分镜图像序列。

### 输入
- 场景描述（环境、时间、氛围）
- 人物描述（外貌、服装、特征）
- 动作描述（角色行为、表情、姿态）
- 镜头角度要求（全景、中景、近景、特写）

### 输出
- 分镜图像序列（PNG/JPG）
- 分镜元数据（JSON）
- 镜头运动建议

### 核心价值
- **自动化**: 从文本到图像一键生成
- **一致性**: 保持人物和场景在不同镜头中的视觉一致性
- **多样化**: 支持多种镜头角度和构图

---

## 功能需求

### FR-1: 基础分镜生成
- 接收场景、人物、动作描述
- 调用通义万相 API 生成图像
- 支持批量生成（一次请求多张）

### FR-2: 多镜头角度支持
支持以下镜头类型：
| 镜头类型 | 说明 | 画面范围 |
|----------|------|----------|
| 全景 (Extreme Long Shot) | 展示整体环境和人物位置 | 人物占画面 10-25% |
| 中景 (Medium Shot) | 展示人物上半身和部分环境 | 人物占画面 50-75% |
| 近景 (Close-up) | 突出人物表情和细节 | 人物占画面 75-90% |
| 特写 (Extreme Close-up) | 极致细节展示 | 人物局部占画面 90%+ |

### FR-3: 人物一致性
- 同一人物在不同分镜中保持外貌一致
- 服装、发型、配饰保持一致
- 使用人物参考图 + 固定种子值

### FR-4: 场景一致性
- 同一场景在不同分镜中保持环境一致
- 光线、色调、道具保持一致
- 使用场景参考图 + 固定风格描述

### FR-5: 分镜序列管理
- 生成分镜 ID 和序列号
- 记录镜头顺序和时间戳
- 支持分镜替换和重新生成

---

## 数据结构设计

### Storyboard (分镜)
```typescript
interface Storyboard {
  id: string;                    // 分镜 ID (UUID)
  projectId: string;             // 项目 ID
  sceneId: string;               // 场景 ID
  sequenceNumber: number;        // 序列号 (1, 2, 3...)
  
  // 输入描述
  sceneDescription: string;      // 场景描述
  characterDescriptions: CharacterDescription[];  // 人物描述
  actionDescription: string;     // 动作描述
  cameraAngle: CameraAngle;      // 镜头角度
  
  // 生成结果
  images: StoryboardImage[];     // 生成的图像列表
  selectedImageId: string;       // 选中的图像 ID
  
  // 元数据
  prompt: string;                // 最终使用的提示词
  negativePrompt: string;        // 负面提示词
  seed: number;                  // 随机种子
  model: string;                 // 使用的模型版本
  
  // 状态
  status: 'pending' | 'generating' | 'completed' | 'failed';
  errorMessage?: string;
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  generatedAt?: Date;
}
```

### CharacterDescription (人物描述)
```typescript
interface CharacterDescription {
  characterId: string;           // 人物 ID
  name: string;                  // 人物名称
  role: 'protagonist' | 'antagonist' | 'supporting';  // 角色类型
  
  // 外貌特征
  appearance: {
    gender: 'male' | 'female';
    age: number;                 // 年龄
    height: string;              // 身高描述
    bodyType: string;            // 体型描述
    faceShape: string;           // 脸型
    skinTone: string;            // 肤色
  };
  
  // 发型
  hairstyle: {
    style: string;               // 发型样式
    color: string;               // 发色
    length: 'short' | 'medium' | 'long';
  };
  
  // 服装
  outfit: {
    top: string;                 // 上衣
    bottom: string;              // 下装
    shoes: string;               // 鞋子
    accessories: string[];       // 配饰
  };
  
  // 表情和姿态
  expression: string;            // 表情描述
  pose: string;                  // 姿态描述
  
  // 参考图
  referenceImageId?: string;     // 人物参考图 ID
}
```

### StoryboardImage (分镜图像)
```typescript
interface StoryboardImage {
  id: string;                    // 图像 ID
  storyboardId: string;          // 分镜 ID
  url: string;                   // 图像 URL (MinIO)
  thumbnailUrl: string;          // 缩略图 URL
  
  // 生成参数
  width: number;                 // 宽度 (px)
  height: number;                // 高度 (px)
  prompt: string;                // 生成提示词
  seed: number;                  // 随机种子
  
  // 镜头信息
  cameraAngle: CameraAngle;
  composition: string;           // 构图描述
  
  // 元数据
  fileSize: number;              // 文件大小 (bytes)
  format: 'png' | 'jpg';
  
  // 状态
  is_selected: boolean;          // 是否被选中
  score?: number;                // 质量评分 (0-100)
  
  createdAt: Date;
}
```

### CameraAngle (镜头角度枚举)
```typescript
enum CameraAngle {
  EXTREME_LONG_SHOT = 'extreme_long_shot',    // 大远景
  LONG_SHOT = 'long_shot',                    // 远景
  FULL_SHOT = 'full_shot',                    // 全景
  MEDIUM_LONG_SHOT = 'medium_long_shot',      // 中全景
  MEDIUM_SHOT = 'medium_shot',                // 中景
  MEDIUM_CLOSE_UP = 'medium_close_up',        // 中近景
  CLOSE_UP = 'close_up',                      // 近景
  EXTREME_CLOSE_UP = 'extreme_close_up',      // 特写
}
```

### StoryboardRequest (生成请求)
```typescript
interface StoryboardRequest {
  projectId: string;
  sceneId: string;
  sceneDescription: string;
  characters: CharacterDescription[];
  action: string;
  cameraAngles: CameraAngle[];  // 需要生成的镜头角度列表
  countPerAngle?: number;       // 每个角度生成几张 (默认 4)
  
  // 可选参数
  style?: string;               // 艺术风格 (写实/动漫/电影感)
  aspectRatio?: '16:9' | '9:16' | '4:3' | '1:1';
  quality?: 'standard' | 'high' | 'ultra';
}
```

### StoryboardResponse (生成响应)
```typescript
interface StoryboardResponse {
  storyboardId: string;
  status: 'pending' | 'completed' | 'failed';
  images: {
    angle: CameraAngle;
    images: StoryboardImage[];
  }[];
  estimatedTime?: number;       // 预计生成时间 (秒)
  taskId?: string;              // 异步任务 ID
}
```

---

## API 集成方案

### 阿里通义万相 API

#### 认证
```javascript
// 使用阿里云 SDK
const client = new ImageSynthesisClient({
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessSecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  endpoint: 'https://dashscope.aliyuncs.com'
});
```

#### 文生图接口
```javascript
// API 端点
POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation

// 请求体
{
  "model": "wanx-v1",
  "input": {
    "prompt": "电影感镜头，一位 25 岁中国女性，黑色长发，白色衬衫，站在现代化办公室，自然光，中景镜头",
    "negative_prompt": "模糊，低质量，变形，多余手指，水印，文字"
  },
  "parameters": {
    "style": "<auto>",
    "size": "1024*1024",
    "n": 4,
    "seed": 12345
  }
}

// 响应
{
  "output": {
    "task_id": "xxx-xxx-xxx",
    "results": [
      {
        "url": "https://..."
      }
    ]
  },
  "request_id": "xxx-xxx-xxx"
}
```

#### 异步任务查询
```javascript
// 轮询任务状态
GET https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}

// 响应
{
  "output": {
    "task_status": "SUCCEEDED",
    "results": [
      {
        "url": "https://..."
      }
    ]
  }
}
```

### 提示词工程

#### 基础提示词模板
```javascript
function buildPrompt(request) {
  const { sceneDescription, characters, action, cameraAngle, style } = request;
  
  // 镜头角度描述映射
  const anglePrompts = {
    'extreme_long_shot': '大远景镜头，展现宏大的环境，人物在画面中很小，强调场景规模',
    'long_shot': '远景镜头，展示人物全身和周围环境，人物占画面约 25%',
    'full_shot': '全景镜头，人物全身在画面中，清晰展示人物和环境关系',
    'medium_shot': '中景镜头，人物腰部以上，突出人物表情和上半身动作',
    'close_up': '近景镜头，人物胸部以上，强调面部表情和情感',
    'extreme_close_up': '特写镜头，聚焦人物面部局部或细节，极致情感表达'
  };
  
  // 构建人物描述
  const charPrompts = characters.map(char => 
    `${char.name}，${char.appearance.age}岁${char.appearance.gender === 'male' ? '男性' : '女性'}，` +
    `${char.hairstyle.color}${char.hairstyle.length}发，` +
    `${char.outfit.top}，${char.outfit.bottom}，` +
    `${char.expression}，${char.pose}`
  ).join('，');
  
  // 组合完整提示词
  const prompt = `电影感${style || '写实'}风格，${anglePrompts[cameraAngle]}，` +
    `${sceneDescription}，${charPrompts}，${action}，` +
    `专业摄影，高质量，细节丰富，8K 分辨率`;
  
  return prompt;
}
```

#### 负面提示词
```javascript
const NEGATIVE_PROMPT = `模糊，低质量，变形，畸变，多余手指，多余肢体，` +
  `水印，文字，签名，logo，卡通，动画，3D 渲染，` +
  `过曝，欠曝，噪点，色偏，不自然`;
```

---

## 一致性控制方案

### 方案 1: 固定种子值
```javascript
// 为每个人物生成固定种子
function generateCharacterSeed(characterId, projectSeed) {
  const hash = crypto.createHash('md5');
  hash.update(characterId + projectSeed);
  return parseInt(hash.digest('hex').substring(0, 8), 16);
}

// 使用固定种子确保同一人物在不同分镜中一致
const seed = generateCharacterSeed(characterId, projectId);
```

### 方案 2: 参考图 + ControlNet
```javascript
// 上传人物参考图到通义万相
const referenceImage = await uploadReferenceImage(character.referenceImageId);

// 在生成时使用参考图
const result = await client.generate({
  prompt: prompt,
  referenceImage: referenceImage.url,
  referenceStrength: 0.7  // 参考强度 0-1
});
```

### 方案 3: 风格锁定
```javascript
// 提取场景的风格特征
const styleEmbedding = await extractStyleEmbedding(sceneReferenceImage);

// 在所有分镜中使用相同风格
const result = await client.generate({
  prompt: prompt,
  styleEmbedding: styleEmbedding,
  styleWeight: 0.8
});
```

### 方案 4: 提示词工程
```javascript
// 在提示词中固定关键特征描述
function buildConsistentPrompt(character, scene) {
  // 固定人物特征关键词
  const fixedFeatures = [
    `黑色长发`,
    `白色衬衫`,
    `蓝色牛仔裤`,
    `25 岁中国女性`
  ];
  
  // 固定场景特征关键词
  const fixedScene = [
    `现代化办公室`,
    `落地窗`,
    `自然光`,
    `灰色调`
  ];
  
  // 组合提示词时始终包含这些关键词
  return [...fixedFeatures, ...fixedScene, actionDescription].join('，');
}
```

### 一致性评分
```javascript
// 计算两张图像的一致性分数
function calculateConsistencyScore(image1, image2) {
  // 使用 CLIP 模型计算特征相似度
  const embedding1 = clipModel.encode(image1);
  const embedding2 = clipModel.encode(image2);
  
  // 余弦相似度
  const similarity = cosineSimilarity(embedding1, embedding2);
  
  return similarity * 100;  // 0-100 分
}

// 阈值：>85 分认为一致性良好
const CONSISTENCY_THRESHOLD = 85;
```

---

## 接口设计

### REST API

#### 1. 生成分镜
```
POST /api/v1/storyboards/generate
Content-Type: application/json

Request:
{
  "projectId": "proj_123",
  "sceneId": "scene_456",
  "sceneDescription": "现代化办公室，落地窗，下午阳光",
  "characters": [...],
  "action": "主角走向办公桌，拿起文件",
  "cameraAngles": ["full_shot", "medium_shot", "close_up"],
  "countPerAngle": 4,
  "style": "电影感写实",
  "aspectRatio": "16:9"
}

Response:
{
  "success": true,
  "data": {
    "storyboardId": "sb_789",
    "status": "pending",
    "taskId": "task_xxx",
    "estimatedTime": 60
  }
}
```

#### 2. 查询生成状态
```
GET /api/v1/storyboards/{storyboardId}/status

Response:
{
  "success": true,
  "data": {
    "storyboardId": "sb_789",
    "status": "generating",
    "progress": 60,
    "completedAngles": ["full_shot"],
    "pendingAngles": ["medium_shot", "close_up"]
  }
}
```

#### 3. 获取分镜详情
```
GET /api/v1/storyboards/{storyboardId}

Response:
{
  "success": true,
  "data": {
    "id": "sb_789",
    "sceneId": "scene_456",
    "sequenceNumber": 1,
    "images": [
      {
        "id": "img_001",
        "url": "https://...",
        "cameraAngle": "full_shot",
        "isSelected": true
      }
    ],
    "status": "completed"
  }
}
```

#### 4. 选择分镜图像
```
PATCH /api/v1/storyboards/{storyboardId}/select
Content-Type: application/json

Request:
{
  "imageId": "img_002",
  "cameraAngle": "medium_shot"
}

Response:
{
  "success": true,
  "data": {
    "storyboardId": "sb_789",
    "selectedImageId": "img_002"
  }
}
```

#### 5. 重新生成分镜
```
POST /api/v1/storyboards/{storyboardId}/regenerate
Content-Type: application/json

Request:
{
  "cameraAngle": "close_up",
  "count": 4,
  "seed": 54321  // 可选，指定种子
}

Response:
{
  "success": true,
  "data": {
    "taskId": "task_yyy",
    "estimatedTime": 30
  }
}
```

---

## 工作流程

### 完整生成流程
```
1. 接收生成请求
   ↓
2. 验证参数 (场景、人物、动作)
   ↓
3. 为每个镜头角度构建提示词
   ↓
4. 调用通义万相 API (并行)
   ↓
5. 轮询任务状态
   ↓
6. 下载生成的图像到 MinIO
   ↓
7. 计算一致性分数
   ↓
8. 保存分镜元数据到数据库
   ↓
9. 返回生成结果
```

### 异步任务流程
```
Client                    Backend                  Redis Queue              Aliyun API
  |                         |                          |                        |
  |-- POST /generate ------>|                          |                        |
  |                         |-- 创建任务 ------------->|                        |
  |                         |-- 推入队列 ------------->|                        |
  |                         |                          |-- 消费任务 ----------->|
  |                         |                          |                        |-- 生成图像
  |                         |                          |<-----------------------|
  |                         |<-- 任务完成 -------------|                        |
  |                         |-- 更新数据库 ----------- |                        |
  |<-- 202 Accepted --------|                          |                        |
  |                         |                          |                        |
  |-- GET /status --------->|                          |                        |
  |<-- {status: pending} ---|                          |                        |
  |                         |                          |                        |
  |                         |                          |                        | (30 秒后)
  |                         |                          |                        |
  |-- GET /status --------->|                          |                        |
  |<-- {status: completed} -|                          |                        |
  |                         |                          |                        |
  |-- GET /storyboard ----->|                          |                        |
  |<-- {images: [...]} -----|                          |                        |
```

---

## 错误处理

### 错误码定义
```typescript
enum StoryboardErrorCode {
  INVALID_REQUEST = 'SB_001',      // 请求参数错误
  API_RATE_LIMIT = 'SB_002',       // API 限流
  API_TIMEOUT = 'SB_003',          // API 超时
  GENERATION_FAILED = 'SB_004',    // 生成失败
  CONSISTENCY_LOW = 'SB_005',      // 一致性分数过低
  STORAGE_ERROR = 'SB_006',        // 存储错误
  NOT_FOUND = 'SB_007',            // 分镜不存在
}
```

### 重试策略
```javascript
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000,      // 1 秒
  maxDelay: 10000,         // 10 秒
  backoffMultiplier: 2,    // 指数退避
  retryableErrors: [
    'API_RATE_LIMIT',
    'API_TIMEOUT',
    'NETWORK_ERROR'
  ]
};
```

---

## 性能优化

### 1. 并行生成
```javascript
// 同时生成多个镜头角度
const promises = cameraAngles.map(angle => 
  generateForAngle(angle, request)
);
const results = await Promise.all(promises);
```

### 2. 缓存提示词
```javascript
// 缓存常用提示词组合
const promptCache = new NodeCache({ stdTTL: 3600 });

function getOrBuildPrompt(key, builder) {
  const cached = promptCache.get(key);
  if (cached) return cached;
  
  const prompt = builder();
  promptCache.set(key, prompt);
  return prompt;
}
```

### 3. 图像压缩
```javascript
// 生成缩略图
async function generateThumbnail(imageUrl) {
  const image = await sharp(imageUrl)
    .resize(300, 200, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();
  return uploadToMinIO(image, 'thumbnail');
}
```

---

## 测试计划

### 单元测试
- [ ] 提示词构建函数测试
- [ ] 一致性评分函数测试
- [ ] 种子生成函数测试

### 集成测试
- [ ] 通义万相 API 调用测试
- [ ] MinIO 上传下载测试
- [ ] 数据库 CRUD 测试

### E2E 测试
- [ ] 完整分镜生成流程测试
- [ ] 多镜头角度批量生成测试
- [ ] 一致性验证测试

---

## 附录

### A. 镜头角度参考图
(待添加视觉参考)

### B. 提示词示例库
(待添加常用提示词模板)

### C. 一致性评分阈值
- 优秀：>90 分
- 良好：85-90 分
- 可接受：75-85 分
- 需重新生成：<75 分

---

**文档结束**
