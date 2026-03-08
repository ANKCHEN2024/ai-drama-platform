# 🎬 视频生成模块设计文档

## 1. 模块概述

**模块名称：** video-generator  
**负责人：** Subagent-05  
**版本：** v1.0.0  
**最后更新：** 2026-03-07

### 1.1 功能描述
视频生成模块负责将分镜脚本转换为实际的视频片段，支持：
- Text-to-Video 生成
- 人物一致性维护
- 场景一致性维护
- 运动控制
- 视频质量优化

### 1.2 技术选型
| 组件 | 技术选型 | 说明 |
|------|----------|------|
| 主要视频 API | 快手可灵 AI | 国产视频生成 API，支持人物/场景一致性 |
| 备选视频 API | 火山引擎即梦 AI | 备用方案，防止单点故障 |
| 任务队列 | Redis | 异步任务处理 |
| 存储 | MinIO | 视频文件存储 |
| 语言 | Node.js + TypeScript | 与主项目技术栈一致 |

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     视频生成模块                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  API 客户端   │    │  队列管理器   │    │  进度追踪器   │  │
│  │              │    │              │    │              │  │
│  │ - 可灵 AI    │    │ - 任务入队   │    │ - 状态查询   │  │
│  │ - 即梦 AI    │    │ - 优先级调度 │    │ - 进度回调   │  │
│  │ - 自动切换   │    │ - 重试机制   │    │ - 结果通知   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  一致性管理器 │    │  错误处理器   │    │  存储管理器   │  │
│  │              │    │              │    │              │  │
│  │ - 人物参考图 │    │ - 错误分类   │    │ - MinIO 上传  │  │
│  │ - 场景参考图 │    │ - 重试策略   │    │ - 本地缓存   │  │
│  │ - Embedding  │    │ - 降级方案   │    │ - CDN 分发   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. API 集成设计

### 3.1 快手可灵 AI API

#### 3.1.1 API 端点
```
POST https://api.kuaishou.com/kl/v1/video/generate
POST https://api.kuaishou.com/kl/v1/video/query
```

#### 3.1.2 请求参数
```typescript
interface KelingVideoRequest {
  prompt: string;              // 视频描述
  negative_prompt?: string;    // 负面描述
  reference_image?: string;    // 参考图 URL（人物/场景一致性）
  reference_type?: 'character' | 'scene' | 'both';  // 参考类型
  duration?: 5 | 10;           // 视频时长（秒）
  resolution?: '720p' | '1080p';
  motion_strength?: number;    // 运动强度 1-10
  seed?: number;               // 随机种子（可复现）
}
```

#### 3.1.3 响应格式
```typescript
interface KelingVideoResponse {
  code: number;
  message: string;
  data: {
    task_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;          // 0-100
    video_url?: string;
    cover_url?: string;
    error_message?: string;
  };
}
```

### 3.2 火山引擎即梦 AI API

#### 3.2.1 API 端点
```
POST https://api.volcengine.com/jimeng/v1/video/generate
POST https://api.volcengine.com/jimeng/v1/video/query
```

#### 3.2.2 请求参数
```typescript
interface JimengVideoRequest {
  prompt: string;
  image_prompt?: string;       // 图片提示
  video_style?: string;        // 视频风格
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  duration?: number;
}
```

---

## 4. 视频生成队列设计

### 4.1 队列结构
```typescript
interface VideoTask {
  id: string;                  // 任务 ID
  type: 'single' | 'batch';    // 任务类型
  priority: number;            // 优先级 1-10
  status: TaskStatus;
  
  // 输入参数
  input: {
    scene_description: string;  // 场景描述
    character_description: string; // 人物描述
    action_description: string;   // 动作描述
    reference_images?: {
      character?: string;        // 人物参考图
      scene?: string;            // 场景参考图
    };
    parameters: VideoParameters;
  };
  
  // 进度追踪
  progress: {
    current_step: string;
    percentage: number;
    estimated_remaining?: number; // 预估剩余时间（秒）
  };
  
  // 结果
  output?: {
    video_url: string;
    cover_url: string;
    duration: number;
    resolution: string;
  };
  
  // 元数据
  metadata: {
    created_at: number;
    started_at?: number;
    completed_at?: number;
    retry_count: number;
    api_provider: 'keling' | 'jimeng';
  };
  
  // 回调
  callbacks?: {
    on_progress?: string;      // Webhook URL
    on_complete?: string;
    on_error?: string;
  };
}
```

### 4.2 队列状态机
```
                    ┌──────────────┐
                    │   PENDING    │
                    └──────┬───────┘
                           │ 开始处理
                           ▼
                    ┌──────────────┐
          ┌────────│  PROCESSING  │────────┐
          │        └──────┬───────┘        │
          │               │                │
          │ 重试          │ 成功           │ 失败（超过重试次数）
          │               │                │
          │               ▼                ▼
          │        ┌──────────────┐  ┌──────────────┐
          │        │  COMPLETED   │  │    FAILED    │
          │        └──────────────┘  └──────────────┘
          │
          └─────────────────────────────┘
```

### 4.3 Redis 队列实现
```typescript
// 队列键名设计
const QUEUE_KEYS = {
  TASK_QUEUE: 'video:tasks:queue',           // 任务队列（List）
  TASK_STATUS: 'video:tasks:{id}:status',    // 任务状态（Hash）
  TASK_PROGRESS: 'video:tasks:{id}:progress',// 任务进度（String）
  ACTIVE_TASKS: 'video:tasks:active',        // 活跃任务集合（Set）
  FAILED_TASKS: 'video:tasks:failed',        // 失败任务集合（Set）
  COMPLETED_TASKS: 'video:tasks:completed',  // 完成任务集合（Set）
};
```

---

## 5. 错误处理和重试机制

### 5.1 错误分类
```typescript
enum ErrorType {
  // 可重试错误
  NETWORK_ERROR = 'NETWORK_ERROR',           // 网络错误
  API_RATE_LIMIT = 'API_RATE_LIMIT',         // API 限流
  API_TIMEOUT = 'API_TIMEOUT',               // API 超时
  API_SERVER_ERROR = 'API_SERVER_ERROR',     // 服务端错误（5xx）
  
  // 不可重试错误
  INVALID_INPUT = 'INVALID_INPUT',           // 输入参数错误
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED', // 认证失败
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS', // 余额不足
  CONTENT_VIOLATION = 'CONTENT_VIOLATION',   // 内容违规
}
```

### 5.2 重试策略
```typescript
interface RetryStrategy {
  maxRetries: number;        // 最大重试次数
  baseDelay: number;         // 基础延迟（毫秒）
  maxDelay: number;          // 最大延迟（毫秒）
  backoffMultiplier: number; // 退避倍数
  
  // 指数退避计算
  getDelay(retryCount: number): number {
    const delay = Math.min(
      this.baseDelay * Math.pow(this.backoffMultiplier, retryCount),
      this.maxDelay
    );
    // 添加随机抖动（±10%）
    return delay * (0.9 + Math.random() * 0.2);
  }
}

// 默认重试策略
const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxRetries: 3,
  baseDelay: 1000,      // 1 秒
  maxDelay: 60000,      // 60 秒
  backoffMultiplier: 2, // 指数退避
};
```

### 5.3 错误处理流程
```typescript
async function handleTaskError(task: VideoTask, error: Error): Promise<void> {
  const errorType = classifyError(error);
  
  if (isRetryableError(errorType)) {
    if (task.metadata.retry_count < MAX_RETRIES) {
      // 等待后重试
      const delay = retryStrategy.getDelay(task.metadata.retry_count);
      await sleep(delay);
      task.metadata.retry_count++;
      await retryTask(task);
      return;
    }
  }
  
  // 标记为失败
  await markTaskFailed(task, error);
  
  // 如果主要 API 失败，尝试切换到备选 API
  if (task.metadata.api_provider === 'keling' && canSwitchProvider(task)) {
    await switchProviderAndRetry(task, 'jimeng');
  }
  
  // 通知回调
  await notifyError(task, error);
}
```

---

## 6. 一致性维护机制

### 6.1 人物一致性
```typescript
interface CharacterConsistency {
  // 使用参考图
  reference_image: string;    // 人物标准照
  
  // 使用 Embedding（可选）
  embedding?: {
    model: string;            // Embedding 模型
    vector: number[];         // 特征向量
  };
  
  // 一致性参数
  consistency_strength: number; // 一致性强度 0-1
  face_lock: boolean;          // 人脸锁定
}
```

### 6.2 场景一致性
```typescript
interface SceneConsistency {
  // 使用参考图
  reference_image: string;    // 场景标准照
  
  // 场景标签
  tags: string[];             // 场景标签（室内/室外/时间等）
  
  // 一致性参数
  style_lock: boolean;        // 风格锁定
  lighting_preset: string;    // 灯光预设
}
```

### 6.3 一致性实现方案
1. **参考图方式**：上传人物/场景标准照作为参考
2. **Seed 固定**：使用相同 seed 生成相似风格
3. **Prompt 工程**：在描述中保持一致的关键特征
4. **后处理校验**：使用图像相似度算法校验一致性

---

## 7. 接口设计

### 7.1 对外暴露的 API
```typescript
interface VideoGeneratorAPI {
  // 生成视频
  generateVideo(input: VideoInput): Promise<TaskResponse>;
  
  // 批量生成
  generateBatch(inputs: VideoInput[]): Promise<BatchTaskResponse>;
  
  // 查询进度
  getTaskProgress(taskId: string): Promise<ProgressResponse>;
  
  // 取消任务
  cancelTask(taskId: string): Promise<void>;
  
  // 获取结果
  getTaskResult(taskId: string): Promise<VideoResult>;
  
  // 健康检查
  healthCheck(): Promise<HealthStatus>;
}
```

### 7.2 输入参数
```typescript
interface VideoInput {
  // 必填
  scene_description: string;      // 场景描述
  character_description: string;  // 人物描述
  action_description: string;     // 动作描述
  
  // 可选
  reference_images?: {
    character?: string;
    scene?: string;
  };
  parameters?: {
    duration?: number;
    resolution?: string;
    motion_strength?: number;
    style?: string;
  };
  
  // 回调
  callbacks?: {
    on_progress?: string;
    on_complete?: string;
  };
}
```

---

## 8. 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 单视频生成时间 | < 5 分钟 | 5 秒视频 |
| API 成功率 | > 99% | 包含重试后 |
| 并发任务数 | > 10 | 同时处理 |
| 队列等待时间 | < 30 秒 | 平均等待 |
| 存储延迟 | < 1 秒 | 上传到 MinIO |

---

## 9. 监控和日志

### 9.1 关键指标监控
- 任务队列长度
- 平均处理时间
- API 成功率
- 错误分布
- 资源使用率

### 9.2 日志级别
```typescript
enum LogLevel {
  DEBUG = 'debug',    // 详细调试信息
  INFO = 'info',      // 正常流程
  WARN = 'warn',      // 警告（可恢复错误）
  ERROR = 'error',    // 错误（需要关注）
}
```

---

## 10. 依赖项

```json
{
  "dependencies": {
    "ioredis": "^5.3.0",
    "axios": "^1.6.0",
    "minio": "^7.1.0",
    "uuid": "^9.0.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0"
  }
}
```

---

## 11. 下一步

1. ✅ 完成设计文档
2. ⏳ 实现 API 客户端
3. ⏳ 实现队列管理器
4. ⏳ 实现进度追踪器
5. ⏳ 编写单元测试
6. ⏳ 集成测试

---

**文档结束**
