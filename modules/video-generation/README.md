# 🎬 视频生成模块

AI 短剧平台视频生成模块 - 集成快手可灵 AI 和火山引擎即梦 API

## 📋 功能特性

- ✅ **双 API 支持**：快手可灵 AI（主）+ 火山引擎即梦 AI（备）
- ✅ **一致性维护**：支持人物一致性、场景一致性
- ✅ **智能队列**：基于 Redis 的优先级任务队列
- ✅ **进度追踪**：实时任务进度查询和回调通知
- ✅ **错误处理**：完善的错误分类、重试机制和提供商切换
- ✅ **批量生成**：支持单任务和批量任务提交

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     视频生成模块                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API 客户端   │  │  队列管理器   │  │  进度追踪器   │      │
│  │  - 可灵 AI   │  │  - Redis 队列  │  │  - 状态查询   │      │
│  │  - 即梦 AI   │  │  - 优先级调度 │  │  - 进度回调   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  一致性管理器 │  │  错误处理器   │  │  存储管理器   │      │
│  │  - 参考图    │  │  - 重试机制   │  │  - MinIO     │      │
│  │  - Embedding │  │  - 提供商切换 │  │  - CDN       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd modules/video-generation
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入 API 密钥和配置
```

### 3. 构建模块

```bash
npm run build
```

### 4. 使用示例

```typescript
import { VideoGenerator } from '@ai-drama-platform/video-generator';

const generator = new VideoGenerator(config);

// 生成视频
const task = await generator.generateVideo({
  scene_description: '现代办公室，落地窗，阳光明媚',
  character_description: '年轻女性，黑色长发，职业装扮',
  action_description: '坐在办公桌前打字，偶尔抬头微笑',
  parameters: {
    duration: 5,
    resolution: '720p',
  },
});

console.log('Task ID:', task.task_id);

// 查询进度
const progress = await generator.getTaskProgress(task.task_id);
console.log('Progress:', progress.progress.percentage + '%');
```

## 📖 API 文档

### 核心方法

#### generateVideo(input, priority?)
生成单个视频
- **参数：**
  - `input`: VideoInput - 视频输入参数
  - `priority`: number (可选) - 优先级 1-10
- **返回：** TaskResponse - 任务响应

#### generateBatch(inputs, priority?)
批量生成视频
- **参数：**
  - `inputs`: VideoInput[] - 视频输入数组
  - `priority`: number (可选) - 优先级
- **返回：** BatchTaskResponse - 批量任务响应

#### getTaskProgress(taskId)
查询任务进度
- **参数：** `taskId: string`
- **返回：** ProgressResponse | null

#### getTaskResult(taskId)
获取任务结果
- **参数：** `taskId: string`
- **返回：** VideoResult | null

#### cancelTask(taskId)
取消任务
- **参数：** `taskId: string`
- **返回：** void

#### healthCheck()
健康检查
- **返回：** HealthStatus

### 输入参数格式

```typescript
interface VideoInput {
  // 必填
  scene_description: string;       // 场景描述
  character_description: string;   // 人物描述
  action_description: string;      // 动作描述
  
  // 可选
  reference_images?: {
    character?: string;  // 人物参考图 URL
    scene?: string;      // 场景参考图 URL
  };
  parameters?: {
    duration?: 5 | 10;           // 视频时长（秒）
    resolution?: '720p' | '1080p';
    motion_strength?: number;    // 运动强度 1-10
    aspect_ratio?: '16:9' | '9:16' | '1:1';
    seed?: number;
    negative_prompt?: string;
  };
  callbacks?: {
    on_progress?: string;  // Webhook URL
    on_complete?: string;
    on_error?: string;
  };
}
```

## 📁 目录结构

```
video-generation/
├── src/
│   ├── index.ts              # 模块入口
│   ├── types.ts              # 类型定义
│   ├── video-generator.ts    # 主类
│   ├── api/
│   │   ├── keling-client.ts  # 快手可灵客户端
│   │   └── jimeng-client.ts  # 火山即梦客户端
│   ├── queue/
│   │   └── queue-manager.ts  # 队列管理器
│   └── utils/
│       └── logger.ts         # 日志工具
├── config/
│   └── config.example.ts     # 配置示例
├── tests/
│   └── video-generator.test.ts
├── examples/
│   └── usage.ts              # 使用示例
├── docs/
│   ├── DESIGN.md             # 设计文档
│   ├── QUEUE_DESIGN.md       # 队列设计
│   └── ERROR_HANDLING.md     # 错误处理
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| REDIS_HOST | Redis 主机 | localhost |
| REDIS_PORT | Redis 端口 | 6379 |
| KELING_API_KEY | 快手可灵 API Key | - |
| KELING_API_SECRET | 快手可灵 API Secret | - |
| JIMENG_API_KEY | 火山即梦 API Key | - |
| JIMENG_API_SECRET | 火山即梦 API Secret | - |
| MAX_CONCURRENT_TASKS | 最大并发任务数 | 5 |
| LOG_LEVEL | 日志级别 | info |

完整配置见 `.env.example`

## 📊 监控指标

- 队列长度（pending/active/completed/failed）
- API 成功率
- 平均处理时间
- 重试率
- 提供商切换率

## 🛠️ 开发

```bash
# 开发模式（监听编译）
npm run dev

# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 代码检查
npm run lint

# 清理构建
npm run clean
```

## 📝 相关文档

- [设计文档](./docs/DESIGN.md) - 完整架构设计
- [队列设计](./docs/QUEUE_DESIGN.md) - 队列和任务调度
- [错误处理](./docs/ERROR_HANDLING.md) - 错误分类和重试机制

## 🤝 贡献

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

---

**最后更新：** 2026-03-07  
**维护者：** Subagent-05
