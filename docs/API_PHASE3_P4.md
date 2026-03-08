# Phase 3 P4 - AI 生成与视频合成 API 文档

## 概述

本模块提供完整的 AI 驱动的视频生成流程，包括：
- AI 剧本生成
- AI 分镜生成
- 视频生成（单个/批量）
- 视频合成
- 任务队列管理

## 环境配置

### 必需的环境变量

```bash
# 阿里百炼大模型 API
DASHSCOPE_API_KEY=your_api_key
DASHSCOPE_ENDPOINT=https://dashscope.aliyuncs.com/api/v1
DASHSCOPE_MODEL=qwen-max

# Redis 队列
REDIS_HOST=localhost
REDIS_PORT=6379

# 视频存储
VIDEO_STORAGE_PATH=/path/to/storage/videos
```

### 获取 API Key

1. 访问 https://dashscope.console.aliyun.com/
2. 注册/登录阿里云账号
3. 开通 DashScope 服务
4. 创建 API Key

## API 端点

### 1. 生成剧本

**端点**: `POST /api/ai/generate/script`

**描述**: 使用 AI 自动生成短剧剧本

**请求体**:
```json
{
  "projectId": 1,
  "episodeNumber": 1,
  "seasonNumber": 1,
  "genre": "都市情感",
  "tone": "轻松幽默",
  "keywords": ["爱情", "成长", "友情"],
  "previousEpisodeSummary": "上集内容概要...",
  "customRequirements": "特殊要求..."
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "episodeId": 1,
    "title": "第一集：初遇",
    "summary": "剧情概要...",
    "script": "完整剧本内容...",
    "characterAssignments": [
      {
        "characterName": "张三",
        "role": "主角",
        "dialogues": 15
      }
    ]
  }
}
```

---

### 2. 生成分镜

**端点**: `POST /api/ai/generate/storyboard`

**描述**: 根据剧本自动生成分镜脚本

**请求体**:
```json
{
  "episodeId": 1
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "storyboardCount": 12
  }
}
```

---

### 3. 生成视频（单个场景）

**端点**: `POST /api/ai/generate/video`

**描述**: 为单个分镜生成视频（异步任务）

**请求体**:
```json
{
  "sceneId": 1,
  "templateId": "template_001",
  "style": "写实风格",
  "duration": 10,
  "resolution": "720p",
  "customPrompt": "额外提示词..."
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_123456",
    "status": "queued",
    "message": "视频生成任务已加入队列"
  }
}
```

---

### 4. 批量生成视频

**端点**: `POST /api/ai/generate/video/batch`

**描述**: 为整个剧集批量生成所有分镜的视频

**请求体**:
```json
{
  "episodeId": 1,
  "style": "写实风格",
  "resolution": "720p"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "jobIds": ["job_1", "job_2", "job_3"],
    "sceneCount": 12,
    "status": "queued",
    "message": "已创建 12 个视频生成任务"
  }
}
```

---

### 5. 合成视频

**端点**: `POST /api/ai/generate/compose`

**描述**: 将所有分镜视频合成为完整剧集

**请求体**:
```json
{
  "projectId": 1,
  "episodeId": 1,
  "bgmPath": "/path/to/bgm.mp3",
  "transitionDuration": 0.5
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_compose_123",
    "status": "queued",
    "message": "视频合成任务已加入队列"
  }
}
```

---

### 6. 查询任务进度

**端点**: `GET /api/ai/task/:jobId/status`

**描述**: 查询任意任务的执行进度

**路径参数**:
- `jobId`: 任务 ID

**响应**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_123456",
    "status": "processing",
    "progress": 65,
    "videoUrl": null,
    "errorMessage": null,
    "createdAt": "2026-03-08T10:00:00Z",
    "completedAt": null
  }
}
```

**状态说明**:
- `pending`: 等待执行
- `processing`: 正在处理
- `completed`: 已完成
- `failed`: 失败

---

### 7. 取消任务

**端点**: `POST /api/ai/task/:jobId/cancel`

**描述**: 取消正在执行的任务

**响应**:
```json
{
  "success": true,
  "message": "任务取消请求已接收"
}
```

---

### 8. 重试失败任务

**端点**: `POST /api/ai/task/:jobId/retry`

**描述**: 重试执行失败的任务

**响应**:
```json
{
  "success": true,
  "message": "任务重试请求已接收"
}
```

---

### 9. 查询队列统计

**端点**: `GET /api/ai/queue/stats`

**描述**: 查看任务队列的统计信息

**响应**:
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 3,
    "completed": 120,
    "failed": 2,
    "delayed": 0
  }
}
```

---

### 10. 获取视频生成历史

**端点**: `GET /api/ai/video/history`

**描述**: 查询视频生成历史记录

**查询参数**:
- `projectId`: 项目 ID（可选）
- `episodeId`: 分集 ID（可选）
- `status`: 状态过滤（可选）
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20）

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "vg_123",
        "sceneId": 1,
        "status": "completed",
        "progress": 100,
        "videoUrl": "/path/to/video.mp4",
        "thumbnailUrl": "/path/to/thumb.jpg",
        "createdAt": "2026-03-08T10:00:00Z",
        "completedAt": "2026-03-08T10:05:00Z",
        "scene": {
          "episode": {
            "project": {
              "id": 1,
              "name": "项目名称"
            }
          }
        }
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

## 完整工作流程

### 流程 1: 单集完整生成

```javascript
// 1. 生成剧本
const scriptResult = await fetch('/api/ai/generate/script', {
  method: 'POST',
  body: JSON.stringify({
    projectId: 1,
    episodeNumber: 1,
    genre: '都市情感',
  }),
});

// 2. 生成分镜
const storyboardResult = await fetch('/api/ai/generate/storyboard', {
  method: 'POST',
  body: JSON.stringify({ episodeId: scriptResult.data.episodeId }),
});

// 3. 批量生成视频
const videoBatchResult = await fetch('/api/ai/generate/video/batch', {
  method: 'POST',
  body: JSON.stringify({
    episodeId: scriptResult.data.episodeId,
    style: '写实风格',
  }),
});

// 4. 轮询所有任务完成
// 使用 videoBatchResult.data.jobIds 查询每个任务进度

// 5. 合成视频
const composeResult = await fetch('/api/ai/generate/compose', {
  method: 'POST',
  body: JSON.stringify({
    projectId: 1,
    episodeId: scriptResult.data.episodeId,
  }),
});
```

### 流程 2: 进度监控

```javascript
// 轮询任务状态
async function pollTaskStatus(jobId) {
  while (true) {
    const response = await fetch(`/api/ai/task/${jobId}/status`);
    const { data } = await response.json();
    
    console.log(`Progress: ${data.progress}% - ${data.status}`);
    
    if (data.status === 'completed') {
      console.log('Video URL:', data.videoUrl);
      break;
    }
    
    if (data.status === 'failed') {
      console.error('Failed:', data.errorMessage);
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
```

---

## 错误处理

### 常见错误码

| 状态码 | 错误信息 | 说明 |
|--------|----------|------|
| 400 | 参数错误 | 缺少必填参数或参数格式错误 |
| 401 | 未授权 | 缺少或无效的 JWT token |
| 404 | 任务不存在 | 指定的 jobId 不存在 |
| 500 | 服务器错误 | API 调用失败或内部错误 |

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

---

## 最佳实践

### 1. 任务管理

- 为每个任务保存 jobId 到数据库
- 实现 WebSocket 推送实时更新（可选）
- 设置合理的轮询间隔（建议 5 秒）

### 2. 资源优化

- 批量生成时控制并发数量
- 失败任务自动重试（最多 3 次）
- 定期清理完成的旧任务记录

### 3. 成本控制

- 监控 API 调用次数
- 设置每日生成配额
- 优先生成关键场景

### 4. 用户体验

- 显示实时进度条
- 提供预览功能
- 支持中途取消

---

## 技术栈

- **队列**: BullMQ + Redis
- **AI 模型**: 阿里百炼 DashScope
- **视频处理**: FFmpeg
- **数据库**: PostgreSQL + Prisma

---

## 故障排查

### 问题：任务一直处于 pending 状态

**解决方案**:
1. 检查 Redis 是否正常运行
2. 确认 worker 进程已启动
3. 查看队列统计：`GET /api/ai/queue/stats`

### 问题：视频生成失败

**解决方案**:
1. 检查 DASHSCOPE_API_KEY 是否有效
2. 查看错误信息：`GET /api/ai/task/:jobId/status`
3. 重试任务：`POST /api/ai/task/:jobId/retry`

### 问题：FFmpeg 命令失败

**解决方案**:
1. 确认 FFmpeg 已安装：`ffmpeg -version`
2. 检查存储空间是否充足
3. 验证输入文件路径是否正确

---

## 更新日志

### v1.0.0 (2026-03-08)
- 初始版本
- 支持 AI 剧本生成
- 支持 AI 分镜生成
- 支持视频生成队列
- 支持视频合成
- 10 个 API 端点
