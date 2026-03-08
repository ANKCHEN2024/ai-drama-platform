# 🎬 AI 短剧平台 - 技术架构设计文档

> **版本**: 1.0  
> **创建时间**: 2026-03-07  
> **技术栈**: 100% 国产 API + Node.js + PostgreSQL + Redis + Vue3

---

## 📋 目录

1. [系统架构总览](#系统架构总览)
2. [技术栈说明](#技术栈说明)
3. [模块划分](#模块划分)
4. [模块依赖关系图](#模块依赖关系图)
5. [API 设计](#api 设计)
6. [数据库 Schema 设计](#数据库 schema 设计)
7. [部署架构](#部署架构)

---

## 系统架构总览

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           前端层 (Frontend)                              │
│                    Vue3 + Element Plus + Axios                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ 项目管理  │  │ 剧本编辑  │  │ 视频预览  │  │ 素材库   │  │ 系统设置  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP/REST + WebSocket
┌─────────────────────────────────────────────────────────────────────────┐
│                         API 网关层 (API Gateway)                         │
│              Express + JWT Auth + Rate Limiting + CORS                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    认证中间件 / 日志中间件 / 错误处理              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        业务服务层 (Business Layer)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ 项目管理服务 │  │ 剧本分析服务 │  │ 视频生成服务 │  │ 音频处理服务 │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ 人物管理服务 │  │ 场景管理服务 │  │ 分镜服务    │  │ 合成服务    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         任务队列层 (Task Queue)                          │
│                        Redis + Bull Queue                                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  故事分析队列 │ 人物生成队列 │ 场景生成队列 │ 视频生成队列 │ 音频队列 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI 服务适配层 (AI Adapter)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ 通义千问适配器│  │ 通义万相适配器│  │ 可灵 AI 适配器 │  │ 即梦 AI 适配器│   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ 阿里云语音适配器│ │ 网易云音乐适配器│ │ 统一 API 网关  │  │ 重试/熔断   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       外部 AI 服务 (External AI APIs)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ 阿里通义千问 │  │ 阿里通义万相 │  │ 快手可灵 AI  │  │ 火山即梦 AI  │   │
│  │   (LLM)     │  │  (Image)    │  │  (Video)    │  │  (Video)    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │
│  │ 阿里云智能语音│  │ 网易云音乐  │  │ MinIO 对象存储 │                    │
│  │  (TTS/ASR)  │  │   (BGM)     │  │  (Storage)  │                    │
│  └─────────────┘  └─────────────┘  └─────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          数据持久层 (Data Layer)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ PostgreSQL  │  │   Redis     │  │   MinIO     │  │   FFmpeg    │   │
│  │  (主数据库)  │  │  (缓存/队列) │  │  (文件存储)  │  │  (视频处理)  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 技术栈说明

### 后端技术栈

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Node.js | 20.x LTS | 运行时环境 | 高性能异步 I/O |
| Express | 4.x | Web 框架 | RESTful API 服务 |
| PostgreSQL | 15.x | 主数据库 | 关系型数据存储 |
| Redis | 7.x | 缓存/队列 | 任务队列、会话缓存 |
| Bull | 4.x | 任务队列 | 基于 Redis 的分布式队列 |
| MinIO | 最新 | 对象存储 | 视频/音频/图片存储 |
| FFmpeg | 6.x | 视频处理 | 视频合成、转码、剪辑 |
| JWT | - | 认证 | JSON Web Token 认证 |

### 前端技术栈

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Vue 3 | 3.4+ | 前端框架 | Composition API |
| Element Plus | 2.x | UI 组件库 | 企业级 UI 组件 |
| Axios | 1.x | HTTP 客户端 | API 请求封装 |
| Pinia | 2.x | 状态管理 | Vue3 官方状态管理 |
| Vue Router | 4.x | 路由管理 | 单页应用路由 |
| Vite | 5.x | 构建工具 | 快速开发构建 |
| TailwindCSS | 3.x | 样式框架 | 原子化 CSS |

### AI 服务 API（100% 国产）

| 服务类型 | 主选 API | 备选 API | 用途 |
|----------|----------|----------|------|
| 大语言模型 | 阿里通义千问 | 百度文心一言 | 剧本分析、分镜生成 |
| 图像生成 | 阿里通义万相 | 火山即梦 AI | 人物/场景图像生成 |
| 视频生成 | 快手可灵 AI | 火山即梦 AI | 文生视频、图生视频 |
| 语音合成 | 阿里云智能语音 | 火山引擎语音 | 角色配音 |
| 语音识别 | 阿里云语音识别 | 腾讯云语音识别 | 语音转文字 |
| 音乐生成 | 网易云音乐 | QQ 音乐 | BGM 生成与匹配 |

### 开发工具

| 工具 | 用途 |
|------|------|
| TypeScript | 类型安全 |
| ESLint + Prettier | 代码规范 |
| Jest | 单元测试 |
| Supertest | API 测试 |
| Docker | 容器化部署 |
| Docker Compose | 多容器编排 |
| Nginx | 反向代理 |
| PM2 | 进程管理 |

---

## 模块划分

### 后端模块结构

```
backend/
├── src/
│   ├── config/                 # 配置文件
│   │   ├── database.ts         # 数据库配置
│   │   ├── redis.ts            # Redis 配置
│   │   ├── minio.ts            # MinIO 配置
│   │   └── ai-providers.ts     # AI 服务配置
│   │
│   ├── middleware/             # 中间件
│   │   ├── auth.ts             # JWT 认证
│   │   ├── rateLimit.ts        # 限流
│   │   ├── errorHandler.ts     # 错误处理
│   │   └── logger.ts           # 日志
│   │
│   ├── models/                 # 数据模型
│   │   ├── User.ts
│   │   ├── Project.ts
│   │   ├── Script.ts
│   │   ├── Character.ts
│   │   ├── Scene.ts
│   │   ├── Storyboard.ts
│   │   ├── Video.ts
│   │   └── Audio.ts
│   │
│   ├── controllers/            # 控制器
│   │   ├── projectController.ts
│   │   ├── scriptController.ts
│   │   ├── characterController.ts
│   │   ├── sceneController.ts
│   │   ├── storyboardController.ts
│   │   ├── videoController.ts
│   │   └── audioController.ts
│   │
│   ├── services/               # 业务服务
│   │   ├── projectService.ts
│   │   ├── storyAnalyzer.ts    # 故事分析
│   │   ├── characterBuilder.ts # 人物构建
│   │   ├── sceneBuilder.ts     # 场景构建
│   │   ├── storyboardGenerator.ts # 分镜生成
│   │   ├── videoGenerator.ts   # 视频生成
│   │   ├── audioProcessor.ts   # 音频处理
│   │   ├── bgmGenerator.ts     # BGM 生成
│   │   └── videoComposer.ts    # 视频合成
│   │
│   ├── adapters/               # AI 服务适配器
│   │   ├── BaseAdapter.ts      # 基础适配器
│   │   ├── TongyiAdapter.ts    # 通义千问/万相
│   │   ├── KelingAdapter.ts    # 可灵 AI
│   │   ├── JimengAdapter.ts    # 即梦 AI
│   │   ├── AliyunVoiceAdapter.ts # 阿里云语音
│   │   └── NetEaseMusicAdapter.ts # 网易云音乐
│   │
│   ├── queues/                 # 任务队列
│   │   ├── storyQueue.ts
│   │   ├── characterQueue.ts
│   │   ├── sceneQueue.ts
│   │   ├── videoQueue.ts
│   │   └── audioQueue.ts
│   │
│   ├── utils/                  # 工具函数
│   │   ├── ffmpeg.ts           # FFmpeg 封装
│   │   ├── fileStorage.ts      # 文件存储
│   │   └── helpers.ts          # 辅助函数
│   │
│   └── app.ts                  # 应用入口
│
├── tests/                      # 测试文件
├── docker/                     # Docker 配置
└── package.json
```

### 前端模块结构

```
frontend/
├── src/
│   ├── assets/                 # 静态资源
│   ├── components/             # 组件
│   │   ├── common/             # 通用组件
│   │   ├── project/            # 项目相关组件
│   │   ├── script/             # 剧本相关组件
│   │   ├── video/              # 视频相关组件
│   │   └── preview/            # 预览组件
│   │
│   ├── views/                  # 页面视图
│   │   ├── Dashboard.vue       # 仪表盘
│   │   ├── ProjectList.vue     # 项目列表
│   │   ├── ProjectDetail.vue   # 项目详情
│   │   ├── ScriptEditor.vue    # 剧本编辑
│   │   ├── VideoPreview.vue    # 视频预览
│   │   ├── MaterialLibrary.vue # 素材库
│   │   └── Settings.vue        # 系统设置
│   │
│   ├── stores/                 # Pinia 状态管理
│   │   ├── user.ts
│   │   ├── project.ts
│   │   ├── script.ts
│   │   └── video.ts
│   │
│   ├── router/                 # 路由配置
│   │   └── index.ts
│   │
│   ├── api/                    # API 封装
│   │   ├── project.ts
│   │   ├── script.ts
│   │   ├── video.ts
│   │   └── auth.ts
│   │
│   ├── utils/                  # 工具函数
│   │   ├── request.ts          # Axios 封装
│   │   └── helpers.ts
│   │
│   ├── types/                  # TypeScript 类型
│   │   └── index.ts
│   │
│   ├── App.vue
│   └── main.ts
│
├── public/
├── tests/
└── package.json
```

---

## 模块依赖关系图

```mermaid
graph TD
    subgraph Frontend [前端层]
        FE[Vue3 前端]
    end

    subgraph API [API 网关层]
        GW[Express API Gateway]
        AUTH[认证中间件]
        LOG[日志中间件]
    end

    subgraph Business [业务服务层]
        PS[项目管理服务]
        SA[故事分析服务]
        CB[人物构建服务]
        SB[场景构建服务]
        SG[分镜生成服务]
        VG[视频生成服务]
        AP[音频处理服务]
        BG[BGM 生成服务]
        VC[视频合成服务]
    end

    subgraph Queue [任务队列层]
        SQ[故事分析队列]
        CQ[人物生成队列]
        SCQ[场景生成队列]
        VQ[视频生成队列]
        AQ[音频处理队列]
    end

    subgraph Adapter [AI 适配器层]
        TY[通义千问适配器]
        TW[通义万相适配器]
        KL[可灵 AI 适配器]
        JM[即梦 AI 适配器]
        AY[阿里云语音适配器]
        NM[网易云音乐适配器]
    end

    subgraph External [外部 AI 服务]
        TY_API[阿里通义千问]
        TW_API[阿里通义万相]
        KL_API[快手可灵 AI]
        JM_API[火山即梦 AI]
        AY_API[阿里云智能语音]
        NM_API[网易云音乐]
    end

    subgraph Data [数据层]
        PG[PostgreSQL]
        RD[Redis]
        IO[MinIO]
        FF[FFmpeg]
    end

    FE --> GW
    GW --> AUTH
    GW --> LOG
    GW --> PS
    GW --> SA
    GW --> CB
    GW --> SB
    GW --> SG
    GW --> VG
    GW --> AP
    GW --> BG
    GW --> VC

    PS --> PG
    SA --> SQ
    CB --> CQ
    SB --> SCQ
    VG --> VQ
    AP --> AQ

    SQ --> TY
    CQ --> TW
    SCQ --> JM
    VQ --> KL
    VQ --> JM
    AQ --> AY
    BG --> NM

    TY --> TY_API
    TW --> TW_API
    KL --> KL_API
    JM --> JM_API
    AY --> AY_API
    NM --> NM_API

    SA --> TY
    CB --> TW
    SB --> JM
    SG --> TY
    VG --> KL
    VG --> JM
    AP --> AY
    BG --> NM
    VC --> FF

    PS --> PG
    PS --> RD
    PS --> IO
```

### 模块依赖说明

| 模块 | 依赖 | 被依赖 |
|------|------|--------|
| 项目管理服务 | PostgreSQL, Redis, MinIO | 所有业务模块 |
| 故事分析服务 | 通义千问适配器，故事队列 | 分镜生成服务 |
| 人物构建服务 | 通义万相适配器，人物队列 | 视频生成服务 |
| 场景构建服务 | 即梦 AI 适配器，场景队列 | 视频生成服务 |
| 分镜生成服务 | 通义千问适配器 | 视频生成服务 |
| 视频生成服务 | 可灵 AI 适配器，即梦 AI 适配器，视频队列 | 视频合成服务 |
| 音频处理服务 | 阿里云语音适配器，音频队列 | 视频合成服务 |
| BGM 生成服务 | 网易云音乐适配器 | 视频合成服务 |
| 视频合成服务 | FFmpeg | - |

---

## API 设计

### RESTful API 规范

**基础 URL**: `/api/v1`

**认证方式**: JWT Bearer Token

**响应格式**:
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1709784000000
}
```

### API 端点列表

#### 1. 认证模块

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/auth/register` | 用户注册 |
| POST | `/auth/login` | 用户登录 |
| POST | `/auth/logout` | 用户登出 |
| GET | `/auth/profile` | 获取用户信息 |
| PUT | `/auth/profile` | 更新用户信息 |

#### 2. 项目管理模块

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/projects` | 获取项目列表 |
| POST | `/projects` | 创建项目 |
| GET | `/projects/:id` | 获取项目详情 |
| PUT | `/projects/:id` | 更新项目 |
| DELETE | `/projects/:id` | 删除项目 |
| POST | `/projects/:id/import` | 导入小说 |
| GET | `/projects/:id/status` | 获取项目进度 |

#### 3. 剧本分析模块

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/scripts/analyze` | 分析小说 |
| GET | `/scripts/:id` | 获取剧本详情 |
| PUT | `/scripts/:id` | 更新剧本 |
| GET | `/scripts/:id/episodes` | 获取分集列表 |
| POST | `/scripts/:id/regenerate` | 重新生成 |

#### 4. 人物管理模块

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/projects/:projectId/characters` | 获取人物列表 |
| POST | `/projects/:projectId/characters` | 创建人物 |
| GET | `/characters/:id` | 获取人物详情 |
| PUT | `/characters/:id` | 更新人物 |
| DELETE | `/characters/:id` | 删除人物 |
| POST | `/characters/:id/generate` | 生成人物图像 |
| GET | `/characters/:id/images` | 获取人物图像列表 |

#### 5. 场景管理模块

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/projects/:projectId/scenes` | 获取场景列表 |
| POST | `/projects/:projectId/scenes` | 创建场景 |
| GET | `/scenes/:id` | 获取场景详情 |
| PUT | `/scenes/:id` | 更新场景 |
| DELETE | `/scenes/:id` | 删除场景 |
| POST | `/scenes/:id/generate` | 生成场景图像 |
| GET | `/scenes/:id/images` | 获取场景图像列表 |

#### 6. 分镜管理模块

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/episodes/:episodeId/storyboards` | 获取分镜列表 |
| POST | `/episodes/:episodeId/storyboards` | 生成分镜 |
| GET | `/storyboards/:id` | 获取分镜详情 |
| PUT | `/storyboards/:id` | 更新分镜 |
| DELETE | `/storyboards/:id` | 删除分镜 |

#### 7. 视频生成模块

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/videos/generate` | 生成视频 |
| GET | `/videos/:id` | 获取视频详情 |
| GET | `/videos/:id/status` | 获取生成状态 |
| DELETE | `/videos/:id` | 删除视频 |
| POST | `/videos/:id/regenerate` | 重新生成 |

#### 8. 音频处理模块

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/audios/synthesize` | 合成配音 |
| GET | `/audios/:id` | 获取音频详情 |
| DELETE | `/audios/:id` | 删除音频 |
| POST | `/audios/transcribe` | 语音识别 |

#### 9. 视频合成模块

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/compose` | 合成视频 |
| GET | `/compose/:id/status` | 获取合成状态 |
| GET | `/compose/:id/result` | 获取合成结果 |

#### 10. 素材库模块

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/materials` | 获取素材列表 |
| POST | `/materials/upload` | 上传素材 |
| DELETE | `/materials/:id` | 删除素材 |
| GET | `/materials/types` | 获取素材类型 |

### API 请求示例

#### 创建项目

```http
POST /api/v1/projects
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "我的短剧",
  "description": "基于小说《XXX》改编",
  "novelText": "小说全文内容...",
  "episodeCount": 10,
  "episodeDuration": 60,
  "videoRatio": "9:16",
  "videoQuality": "1080p"
}
```

#### 生成视频

```http
POST /api/v1/videos/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "projectId": "proj_123",
  "episodeId": "epi_456",
  "characters": ["char_1", "char_2"],
  "scenes": ["scene_1", "scene_2"],
  "storyboards": ["sb_1", "sb_2", "sb_3"],
  "voiceOptions": {
    "defaultVoice": "female_1",
    "characterVoices": {
      "char_1": "male_1",
      "char_2": "female_2"
    }
  },
  "bgmStyle": "emotional",
  "outputFormat": "mp4"
}
```

### WebSocket 事件

用于实时推送任务进度：

```javascript
// 连接
ws://localhost:3000/ws?token=<jwt_token>

// 订阅项目进度
{
  "action": "subscribe",
  "channel": "project:proj_123"
}

// 接收进度更新
{
  "type": "progress",
  "projectId": "proj_123",
  "taskType": "video_generation",
  "progress": 45,
  "status": "processing",
  "message": "正在生成第 3 个镜头...",
  "estimatedTime": 180
}
```

---

## 数据库 Schema 设计

### ER 图

```mermaid
erDiagram
    USER ||--o{ PROJECT : creates
    PROJECT ||--o{ EPISODE : contains
    PROJECT ||--o{ CHARACTER : has
    PROJECT ||--o{ SCENE : has
    EPISODE ||--o{ STORYBOARD : contains
    CHARACTER ||--o{ CHARACTER_IMAGE : has
    SCENE ||--o{ SCENE_IMAGE : has
    STORYBOARD ||--o{ VIDEO_CLIP : generates
    EPISODE ||--o{ AUDIO : has
    EPISODE ||--o{ VIDEO : has
    VIDEO ||--o{ VIDEO_CLIP : composed_of
    AUDIO ||--o{ BGM : contains

    USER {
        bigint id PK
        varchar username
        varchar email
        varchar password_hash
        varchar avatar_url
        timestamp created_at
        timestamp updated_at
    }

    PROJECT {
        bigint id PK
        bigint user_id FK
        varchar name
        text description
        text novel_text
        integer episode_count
        integer episode_duration
        varchar video_ratio
        varchar video_quality
        varchar status
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }

    EPISODE {
        bigint id PK
        bigint project_id FK
        integer episode_number
        varchar title
        text summary
        text script
        varchar status
        integer duration
        timestamp created_at
        timestamp updated_at
    }

    CHARACTER {
        bigint id PK
        bigint project_id FK
        varchar name
        text description
        text appearance
        varchar gender
        varchar age_range
        jsonb personality
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    CHARACTER_IMAGE {
        bigint id PK
        bigint character_id FK
        varchar image_url
        varchar image_type
        text prompt
        jsonb generation_params
        timestamp created_at
    }

    SCENE {
        bigint id PK
        bigint project_id FK
        varchar name
        text description
        varchar location_type
        varchar time_of_day
        varchar atmosphere
        text visual_style
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    SCENE_IMAGE {
        bigint id PK
        bigint scene_id FK
        varchar image_url
        varchar image_type
        text prompt
        jsonb generation_params
        timestamp created_at
    }

    STORYBOARD {
        bigint id PK
        bigint episode_id FK
        integer shot_number
        text description
        text visual_description
        varchar shot_type
        varchar camera_angle
        varchar camera_movement
        integer duration
        text dialogue
        text action
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    VIDEO_CLIP {
        bigint id PK
        bigint storyboard_id FK
        varchar video_url
        varchar source_type
        varchar ai_provider
        jsonb generation_params
        integer duration
        varchar status
        timestamp created_at
    }

    AUDIO {
        bigint id PK
        bigint episode_id FK
        bigint character_id FK
        varchar audio_url
        varchar audio_type
        text text_content
        varchar voice_id
        jsonb synthesis_params
        integer duration
        varchar status
        timestamp created_at
    }

    BGM {
        bigint id PK
        bigint episode_id FK
        varchar audio_url
        varchar music_style
        varchar mood
        integer duration
        jsonb metadata
        timestamp created_at
    }

    VIDEO {
        bigint id PK
        bigint episode_id FK
        varchar video_url
        varchar resolution
        varchar format
        integer duration
        integer file_size
        varchar status
        jsonb composition_params
        timestamp created_at
        timestamp updated_at
    }

    TASK {
        bigint id PK
        bigint user_id FK
        bigint project_id FK
        varchar task_type
        varchar status
        integer progress
        text message
        jsonb metadata
        timestamp created_at
        timestamp updated_at
        timestamp completed_at
    }
```

### 详细表结构

#### 1. users (用户表)

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

#### 2. projects (项目表)

```sql
CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    novel_text TEXT,
    episode_count INTEGER DEFAULT 10,
    episode_duration INTEGER DEFAULT 60,
    video_ratio VARCHAR(10) DEFAULT '9:16',
    video_quality VARCHAR(20) DEFAULT '1080p',
    status VARCHAR(20) DEFAULT 'draft',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
```

#### 3. episodes (剧集表)

```sql
CREATE TABLE episodes (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    title VARCHAR(200),
    summary TEXT,
    script TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, episode_number)
);

CREATE INDEX idx_episodes_project_id ON episodes(project_id);
CREATE INDEX idx_episodes_status ON episodes(status);
```

#### 4. characters (人物表)

```sql
CREATE TABLE characters (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    appearance TEXT,
    gender VARCHAR(10),
    age_range VARCHAR(20),
    personality JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_characters_project_id ON characters(project_id);
CREATE INDEX idx_characters_status ON characters(status);
```

#### 5. character_images (人物图像表)

```sql
CREATE TABLE character_images (
    id BIGSERIAL PRIMARY KEY,
    character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    image_type VARCHAR(50),
    prompt TEXT,
    generation_params JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_character_images_character_id ON character_images(character_id);
```

#### 6. scenes (场景表)

```sql
CREATE TABLE scenes (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    location_type VARCHAR(50),
    time_of_day VARCHAR(20),
    atmosphere VARCHAR(50),
    visual_style TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scenes_project_id ON scenes(project_id);
```

#### 7. scene_images (场景图像表)

```sql
CREATE TABLE scene_images (
    id BIGSERIAL PRIMARY KEY,
    scene_id BIGINT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    image_type VARCHAR(50),
    prompt TEXT,
    generation_params JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scene_images_scene_id ON scene_images(scene_id);
```

#### 8. storyboards (分镜表)

```sql
CREATE TABLE storyboards (
    id BIGSERIAL PRIMARY KEY,
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    shot_number INTEGER NOT NULL,
    description TEXT,
    visual_description TEXT,
    shot_type VARCHAR(50),
    camera_angle VARCHAR(50),
    camera_movement VARCHAR(50),
    duration INTEGER,
    dialogue TEXT,
    action TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(episode_id, shot_number)
);

CREATE INDEX idx_storyboards_episode_id ON storyboards(episode_id);
```

#### 9. video_clips (视频片段表)

```sql
CREATE TABLE video_clips (
    id BIGSERIAL PRIMARY KEY,
    storyboard_id BIGINT NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
    video_url VARCHAR(500) NOT NULL,
    source_type VARCHAR(50),
    ai_provider VARCHAR(50),
    generation_params JSONB,
    duration INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_video_clips_storyboard_id ON video_clips(storyboard_id);
CREATE INDEX idx_video_clips_status ON video_clips(status);
```

#### 10. audios (音频表)

```sql
CREATE TABLE audios (
    id BIGSERIAL PRIMARY KEY,
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    character_id BIGINT REFERENCES characters(id),
    audio_url VARCHAR(500) NOT NULL,
    audio_type VARCHAR(50),
    text_content TEXT,
    voice_id VARCHAR(50),
    synthesis_params JSONB,
    duration INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audios_episode_id ON audios(episode_id);
CREATE INDEX idx_audios_character_id ON audios(character_id);
```

#### 11. bgms (背景音乐表)

```sql
CREATE TABLE bgms (
    id BIGSERIAL PRIMARY KEY,
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    audio_url VARCHAR(500) NOT NULL,
    music_style VARCHAR(50),
    mood VARCHAR(50),
    duration INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bgms_episode_id ON bgms(episode_id);
```

#### 12. videos (视频表)

```sql
CREATE TABLE videos (
    id BIGSERIAL PRIMARY KEY,
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    video_url VARCHAR(500) NOT NULL,
    resolution VARCHAR(20),
    format VARCHAR(20),
    duration INTEGER,
    file_size BIGINT,
    status VARCHAR(20) DEFAULT 'pending',
    composition_params JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_videos_episode_id ON videos(episode_id);
CREATE INDEX idx_videos_status ON videos(status);
```

#### 13. tasks (任务表)

```sql
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
    task_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

### 数据字典

#### projects.status 枚举值

| 值 | 描述 |
|----|------|
| draft | 草稿 |
| analyzing | 分析中 |
| character_building | 人物构建中 |
| scene_building | 场景构建中 |
| generating | 生成中 |
| completed | 已完成 |
| failed | 失败 |

#### episodes.status 枚举值

| 值 | 描述 |
|----|------|
| draft | 草稿 |
| storyboard_ready | 分镜完成 |
| video_generating | 视频生成中 |
| audio_generating | 音频生成中 |
| composing | 合成中 |
| completed | 已完成 |
| failed | 失败 |

#### tasks.status 枚举值

| 值 | 描述 |
|----|------|
| pending | 待处理 |
| processing | 处理中 |
| completed | 已完成 |
| failed | 失败 |
| cancelled | 已取消 |

#### tasks.task_type 枚举值

| 值 | 描述 |
|----|------|
| story_analyze | 故事分析 |
| character_generate | 人物生成 |
| scene_generate | 场景生成 |
| storyboard_generate | 分镜生成 |
| video_generate | 视频生成 |
| audio_synthesize | 音频合成 |
| bgm_generate | BGM 生成 |
| video_compose | 视频合成 |

---

## 部署架构

### Docker Compose 配置

```yaml
version: '3.8'

services:
  # PostgreSQL 数据库
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: drama_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: drama_platform
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U drama_admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis 缓存/队列
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MinIO 对象存储
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # 后端 API 服务
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://drama_admin:${DB_PASSWORD}@postgres:5432/drama_platform
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      JWT_SECRET: ${JWT_SECRET}
      TONGYI_API_KEY: ${TONGYI_API_KEY}
      KELING_API_KEY: ${KELING_API_KEY}
      JIMENG_API_KEY: ${JIMENG_API_KEY}
      ALIYUN_VOICE_API_KEY: ${ALIYUN_VOICE_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run start:prod

  # 前端服务
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      VITE_API_BASE_URL: http://localhost:3000/api/v1
    depends_on:
      - backend
    ports:
      - "80:80"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run preview

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
      - frontend
    ports:
      - "443:443"
      - "80:80"

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 系统资源要求

| 组件 | CPU | 内存 | 存储 |
|------|-----|------|------|
| PostgreSQL | 2 核 | 4GB | 50GB SSD |
| Redis | 1 核 | 2GB | 10GB SSD |
| MinIO | 2 核 | 4GB | 500GB+ |
| Backend | 4 核 | 8GB | 20GB |
| Frontend | 1 核 | 2GB | 5GB |
| FFmpeg | 8 核 | 16GB | 100GB |
| **总计** | **18 核** | **36GB** | **~700GB** |

### 生产环境建议

1. **数据库**: PostgreSQL 主从复制 + 定期备份
2. **Redis**: Redis Cluster 高可用部署
3. **MinIO**: 多节点分布式部署
4. **后端**: PM2 Cluster 模式 + 负载均衡
5. **前端**: CDN 加速 + Nginx 缓存
6. **监控**: Prometheus + Grafana
7. **日志**: ELK Stack (Elasticsearch + Logstash + Kibana)

---

## 附录

### A. 环境变量配置模板

```bash
# 数据库配置
DB_PASSWORD=your_db_password
DATABASE_URL=postgresql://drama_admin:password@localhost:5432/drama_platform

# Redis 配置
REDIS_URL=redis://localhost:6379

# MinIO 配置
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key

# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# AI 服务 API Keys
TONGYI_API_KEY=your_tongyi_api_key
KELING_API_KEY=your_keling_api_key
JIMENG_API_KEY=your_jimeng_api_key
ALIYUN_VOICE_API_KEY=your_aliyun_voice_api_key

# 服务器配置
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://localhost:80
```

### B. 项目目录结构总览

```
ai-drama-platform/
├── backend/                 # 后端代码
├── frontend/                # 前端代码
├── docker/                  # Docker 配置
├── docs/                    # 文档
├── scripts/                 # 脚本工具
├── tests/                   # 测试文件
├── docker-compose.yml       # Docker Compose 配置
├── .env.example             # 环境变量示例
├── README.md                # 项目说明
└── architecture.md          # 架构文档 (本文件)
```

---

**文档版本**: 1.0  
**最后更新**: 2026-03-07  
**作者**: AI 短剧平台架构组 (Subagent-01)
