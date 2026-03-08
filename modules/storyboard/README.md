# 🎬 分镜生成模块

> AI 短剧平台核心模块 - 使用阿里通义万相 API 自动生成分镜图像

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/xfeng-tech/ai-drama-platform)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📖 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [核心功能](#核心功能)
- [API 文档](#api 文档)
- [使用示例](#使用示例)
- [配置说明](#配置说明)
- [技术架构](#技术架构)
- [开发指南](#开发指南)

---

## ✨ 功能特性

### 核心能力

- **🎨 文生图生成** - 基于阿里通义万相 API，将剧本描述转换为分镜图像
- **🎥 多镜头支持** - 支持 8 种镜头角度（大远景、远景、全景、中景、近景、特写等）
- **👤 人物一致性** - 确保同一人物在不同分镜中保持外貌、服装、发型一致
- **🏠 场景一致性** - 确保同一场景在不同分镜中保持环境、光线、色调一致
- **📸 批量生成** - 支持一次请求生成多个镜头角度的多张图像
- **🔄 异步任务** - 支持异步生成模式，适合大规模批量处理
- **⭐ 智能选择** - 自动生成多张候选，支持手动选择最佳图像
- **🔁 重新生成** - 支持对不满意的镜头单独重新生成

### 技术特性

- **固定种子控制** - 使用确定性种子确保生成一致性
- **提示词工程** - 精心设计的提示词模板，优化生成质量
- **一致性评分** - 自动计算分镜图像的一致性分数
- **错误重试** - 智能重试机制，处理 API 临时故障
- **进度追踪** - 实时查询生成进度和状态

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd modules/storyboard
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入阿里云 API 密钥
```

### 3. 基本使用

```javascript
const storyboard = require('./modules/storyboard');

// 初始化
storyboard.init({
  aliyun: {
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET
  }
});

// 生成分镜
const result = await storyboard.generate({
  projectId: 'proj_001',
  sceneId: 'scene_001',
  sceneDescription: '现代化办公室，落地窗，下午阳光',
  characters: [{
    characterId: 'char_001',
    name: '李明',
    appearance: { age: 28, gender: 'male' },
    hairstyle: { color: '黑色', style: '短发' },
    outfit: { top: '白色衬衫', bottom: '西裤' },
    expression: '专注',
    pose: '站立'
  }],
  action: '李明走向办公桌，拿起文件',
  cameraAngles: ['full_shot', 'medium_shot', 'close_up'],
  countPerAngle: 4
});

console.log('分镜生成完成:', result.data.images);
```

---

## 📐 核心功能

### 镜头角度

| 镜头类型 | 英文 | 说明 | 画面范围 |
|----------|------|------|----------|
| 大远景 | Extreme Long Shot | 展现宏大环境，人物很小 | 人物 10-25% |
| 远景 | Long Shot | 人物全身和环境 | 人物 25% |
| 全景 | Full Shot | 人物全身 | 人物 100% |
| 中全景 | Medium Long Shot | 膝盖以上 | 人物 75% |
| 中景 | Medium Shot | 腰部以上 | 人物 50% |
| 中近景 | Medium Close Up | 胸部以上 | 人物 60% |
| 近景 | Close Up | 肩部以上 | 人物 75% |
| 特写 | Extreme Close Up | 面部局部 | 人物 90%+ |

### 一致性控制

```javascript
const consistency = storyboard.getConsistencyController();

// 生成人物种子（确保同一人物在不同分镜中一致）
const seed = consistency.generateCharacterSeed('char_001', 'proj_001');

// 计算一致性分数
const score = await consistency.calculateVisualConsistency(img1, img2);

// 生成一致性报告
const report = consistency.generateConsistencyReport(scores);
```

---

## 📡 API 文档

### REST API

#### 生成分镜（同步）

```http
POST /api/v1/storyboards/generate
Content-Type: application/json

{
  "projectId": "proj_001",
  "sceneId": "scene_001",
  "sceneDescription": "现代化办公室",
  "characters": [...],
  "action": "主角走向办公桌",
  "cameraAngles": ["full_shot", "medium_shot", "close_up"],
  "countPerAngle": 4,
  "style": "电影感写实",
  "aspectRatio": "16:9",
  "quality": "high"
}
```

#### 生成分镜（异步）

```http
POST /api/v1/storyboards/generate-async
```

#### 查询任务状态

```http
GET /api/v1/storyboards/tasks/:taskId
```

#### 获取分镜详情

```http
GET /api/v1/storyboards/:storyboardId
```

#### 选择图像

```http
PATCH /api/v1/storyboards/:storyboardId/select
```

#### 重新生成

```http
POST /api/v1/storyboards/:storyboardId/regenerate
```

详细 API 文档请参考 [API.md](./docs/API.md)

---

## 💡 使用示例

### 基础示例

```javascript
const result = await storyboard.generate({
  projectId: 'proj_001',
  sceneId: 'scene_001',
  sceneDescription: '咖啡厅，温馨氛围，午后阳光',
  characters: [
    {
      characterId: 'char_001',
      name: '小美',
      appearance: { age: 25, gender: 'female' },
      hairstyle: { color: '棕色', style: '长卷发', length: 'long' },
      outfit: { top: '粉色毛衣', bottom: '白色裙子' },
      expression: '微笑',
      pose: '坐着'
    }
  ],
  action: '小美端起咖啡杯，轻轻品尝',
  cameraAngles: ['medium_shot', 'close_up'],
  countPerAngle: 4
});
```

### 异步生成示例

```javascript
// 提交任务
const task = await storyboard.generateAsync(request);
console.log('任务 ID:', task.data.taskId);

// 轮询状态
const service = storyboard.getService();
let status;
do {
  await sleep(3000);
  status = await service.getTaskStatus(task.data.taskId);
  console.log('进度:', status.data.progress + '%');
} while (status.data.status !== 'completed');

// 获取结果
const result = await service.getStoryboard(status.data.storyboardId);
```

更多示例请参考 [EXAMPLES.md](./docs/EXAMPLES.md)

---

## ⚙️ 配置说明

### 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `ALIYUN_ACCESS_KEY_ID` | 阿里云 API Key | ✅ |
| `ALIYUN_ACCESS_KEY_SECRET` | 阿里云 API Secret | ✅ |
| `MINIO_ENDPOINT` | MinIO 存储端点 | ❌ |
| `DATABASE_URL` | 数据库连接 URL | ❌ |
| `REDIS_HOST` | Redis 主机 | ❌ |

完整配置请参考 [.env.example](./.env.example)

### 模块配置

```javascript
storyboard.init({
  aliyun: {
    accessKeyId: 'xxx',
    accessKeySecret: 'xxx',
    endpoint: 'https://dashscope.aliyuncs.com'
  },
  storage: minioClient,  // MinIO 客户端
  db: database,          // 数据库连接
  consistency: {
    threshold: 85        // 一致性阈值
  }
});
```

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    应用层                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Express    │  │   CLI       │  │   SDK       │ │
│  │   Routes    │  │   Tools     │  │   Client    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│                    服务层                            │
│  ┌─────────────────────────────────────────────┐   │
│  │         StoryboardService                   │   │
│  │  - 分镜生成逻辑                              │   │
│  │  - 任务管理                                  │   │
│  │  - 图像存储                                  │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │         ConsistencyController               │   │
│  │  - 一致性种子生成                            │   │
│  │  - 相似度计算                                │   │
│  │  - 质量评分                                  │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│                   客户端层                           │
│  ┌─────────────────────────────────────────────┐   │
│  │           WanXClient                        │   │
│  │  - 通义万相 API 调用                          │   │
│  │  - 提示词构建                                │   │
│  │  - 任务轮询                                  │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│                   外部服务                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  阿里云      │  │   MinIO      │  │  数据库  │ │
│  │  DashScope   │  │   存储       │  │  PostgreSQL│ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ 开发指南

### 目录结构

```
storyboard/
├── index.js                 # 模块入口
├── package.json             # 依赖配置
├── .env.example             # 环境变量示例
├── src/
│   ├── wanx-client.js       # 通义万相 API 客户端
│   ├── storyboard-service.js # 分镜生成服务
│   ├── consistency-controller.js # 一致性控制器
│   ├── types.js             # 类型定义
│   └── routes.js            # API 路由
├── tests/
│   └── storyboard.test.js   # 测试用例
└── docs/
    ├── DESIGN.md            # 设计文档
    ├── EXAMPLES.md          # 使用示例
    └── API.md               # API 文档
```

### 运行测试

```bash
npm test
npm run test:coverage
```

### 代码规范

```bash
npm run lint
```

---

## 📝 相关文档

- [设计文档](./docs/DESIGN.md) - 详细的模块设计说明
- [使用示例](./docs/EXAMPLES.md) - 丰富的代码示例
- [API 文档](./docs/API.md) - 完整的 API 参考

---

## 📄 许可证

MIT License © 2026 西安谷风网络科技有限公司

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**🎬 让每一个创意都可视化！**
