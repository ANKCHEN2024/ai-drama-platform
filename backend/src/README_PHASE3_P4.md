# Phase 3 P4 - AI 生成与视频合成

## 📋 项目概述

本模块为 AI 短剧平台提供完整的 AI 驱动内容生成能力，包括：

- ✨ **AI 剧本生成** - 基于大模型的智能剧本创作
- 🎬 **AI 分镜生成** - 自动将剧本转换为分镜脚本
- 🎥 **视频生成** - AI 驱动的分镜转视频
- 🔗 **视频合成** - 自动合并视频片段并添加音效
- ⚡ **任务队列** - 可靠的异步任务处理系统

## 📁 文件结构

```
backend/
├── src/
│   ├── controllers/
│   │   └── aiGenerationController.ts    # API 控制器（10 个端点）
│   ├── services/
│   │   ├── aiScript/
│   │   │   └── aiScriptService.ts       # 剧本生成服务
│   │   └── aiVideo/
│   │       └── aiVideoGenerationService.ts  # 视频生成服务
│   ├── queues/
│   │   └── videoGenerationQueue.ts      # 任务队列管理
│   └── routes/
│       └── aiGeneration.ts              # API 路由
├── prisma/
│   └── schema.prisma                    # 数据库模型
├── tests/
│   └── ai-generation.test.ts            # API 测试
└── docs/
    ├── API_PHASE3_P4.md                 # API 文档
    └── DEPLOYMENT_P4.md                 # 部署指南
```

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装系统依赖
brew install redis ffmpeg  # macOS
# 或
sudo apt-get install redis-server ffmpeg  # Ubuntu

# 安装 Node.js 依赖
cd backend
npm install
```

### 2. 配置环境变量

```bash
# 复制配置模板
cp .env.example .env

# 编辑配置（必须设置）
nano .env
```

**关键配置项**:
```bash
# 阿里百炼 API（必需）
DASHSCOPE_API_KEY=sk-your-api-key
DASHSCOPE_ENDPOINT=https://dashscope.aliyuncs.com/api/v1

# Redis（必需）
REDIS_HOST=localhost
REDIS_PORT=6379

# 数据库（必需）
DATABASE_URL="postgresql://user:pass@localhost:5432/ai_drama_platform"
```

### 3. 初始化数据库

```bash
# 运行迁移
npx prisma migrate deploy

# 生成客户端
npx prisma generate
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build && npm start
```

## 🔌 API 端点

### 核心端点（6 个）

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/ai/generate/script` | 生成剧本 |
| POST | `/api/ai/generate/storyboard` | 生成分镜 |
| POST | `/api/ai/generate/video` | 生成视频（单个） |
| POST | `/api/ai/generate/video/batch` | 批量生成视频 |
| POST | `/api/ai/generate/compose` | 合成视频 |
| GET | `/api/ai/task/:jobId/status` | 查询任务进度 |

### 管理端点（4 个）

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/ai/task/:jobId/cancel` | 取消任务 |
| POST | `/api/ai/task/:jobId/retry` | 重试任务 |
| GET | `/api/ai/queue/stats` | 队列统计 |
| GET | `/api/ai/video/history` | 生成历史 |

## 💡 使用示例

### 完整工作流程

```javascript
// 1. 生成剧本
const script = await fetch('/api/ai/generate/script', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 1,
    episodeNumber: 1,
    genre: '都市情感',
    tone: '轻松幽默',
  }),
});

// 2. 生成分镜
const storyboard = await fetch('/api/ai/generate/storyboard', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    episodeId: script.data.episodeId,
  }),
});

// 3. 批量生成视频
const videos = await fetch('/api/ai/generate/video/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    episodeId: script.data.episodeId,
    style: '写实风格',
  }),
});

// 4. 轮询进度
async function checkProgress(jobId) {
  const status = await fetch(`/api/ai/task/${jobId}/status`);
  return status.json();
}

// 5. 合成视频
const final = await fetch('/api/ai/generate/compose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 1,
    episodeId: script.data.episodeId,
  }),
});
```

## 🏗️ 技术架构

### 核心技术栈

- **AI 模型**: 阿里百炼 DashScope（Qwen-Max）
- **任务队列**: BullMQ + Redis
- **视频处理**: FFmpeg
- **数据库**: PostgreSQL + Prisma ORM
- **API**: Express.js + TypeScript

### 系统架构图

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  Express API │────▶│   Queue     │
│  (Frontend) │     │  Controller  │     │  (BullMQ)   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  AI Service  │     │   Worker    │
                    │  (DashScope) │     │  Processor  │
                    └──────────────┘     └─────────────┘
                                                │
                                                ▼
                                         ┌─────────────┐
                                         │   FFmpeg    │
                                         │  (Compose)  │
                                         └─────────────┘
```

## 📊 任务状态流转

```
pending → processing → completed
              ↓
            failed → retry
```

## 🧪 测试

```bash
# 运行测试
npm test

# 运行特定测试
npm test -- ai-generation.test.ts

# 带覆盖率
npm test -- --coverage
```

## 📖 文档

- **[API 文档](./docs/API_PHASE3_P4.md)** - 完整的 API 使用说明
- **[部署指南](./docs/DEPLOYMENT_P4.md)** - 生产环境部署步骤
- **[故障排查](./docs/DEPLOYMENT_P4.md#故障排查)** - 常见问题解决方案

## ⚙️ 配置选项

### 队列配置

```bash
# 并发任务数（根据 CPU 核心数调整）
VIDEO_QUEUE_CONCURRENCY=3

# 任务重试次数
VIDEO_QUEUE_MAX_RETRIES=3

# 任务超时（秒）
VIDEO_QUEUE_TIMEOUT=3600
```

### AI 模型配置

```bash
# 文本生成模型
DASHSCOPE_MODEL=qwen-max

# 视频生成参数
VIDEO_GENERATION_DURATION=10
VIDEO_GENERATION_RESOLUTION=720p
```

## 🔒 安全建议

1. **API Key 保护**
   - 不要将 API Key 提交到版本控制
   - 使用环境变量或密钥管理服务

2. **访问控制**
   - 所有 API 端点都需要 JWT 认证
   - 实施基于角色的权限控制

3. **速率限制**
   - 限制每个用户的 API 调用频率
   - 设置每日生成配额

## 📈 性能优化

### 1. 队列优化

```typescript
// 调整并发数
const worker = new Worker('video-generation', handler, {
  concurrency: 5,  // 根据服务器性能调整
});
```

### 2. 缓存策略

```typescript
// 缓存 AI 生成结果
const cacheKey = `script:${projectId}:${episodeNumber}`;
const cached = await redis.get(cacheKey);
```

### 3. 批量处理

```typescript
// 批量生成视频而非逐个生成
await videoGenerationQueue.addVideoGenerationJob(sceneIds);
```

## 🐛 常见问题

### Q: 任务一直处于 pending 状态？
**A**: 检查 Redis 是否正常运行，确认 worker 进程已启动。

### Q: 视频生成失败？
**A**: 检查 DashScope API Key 是否有效，查看任务错误信息。

### Q: FFmpeg 命令失败？
**A**: 确认 FFmpeg 已正确安装，检查输入文件路径。

## 📝 更新日志

### v1.0.0 (2026-03-08)
- ✅ AI 剧本生成服务
- ✅ AI 分镜生成服务
- ✅ 视频生成队列系统
- ✅ FFmpeg 视频合成
- ✅ 10 个 API 端点
- ✅ 完整的测试套件
- ✅ 部署文档

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../LICENSE) 文件

## 👥 团队

- **开发**: AI 短剧平台团队
- **技术支持**: tech@gufeng.com

---

**最后更新**: 2026-03-08  
**版本**: v1.0.0  
**状态**: ✅ 生产就绪
