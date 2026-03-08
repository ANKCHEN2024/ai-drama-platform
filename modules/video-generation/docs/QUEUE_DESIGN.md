# 📋 视频生成队列设计文档

## 1. 队列架构概述

```
┌──────────────────────────────────────────────────────────────────┐
│                        任务提交层                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Web API    │  │  SDK        │  │  CLI        │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    队列管理器                                │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │ │
│  │  │ 优先级队列     │  │ 任务状态存储   │  │ 活跃任务追踪   │   │ │
│  │  │ (Redis ZSet)  │  │ (Redis Hash)  │  │ (Redis Set)   │   │ │
│  │  └───────────────┘  └───────────────┘  └───────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    任务处理层                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │ │
│  │  │ API 路由器   │  │ 进度轮询器   │  │ 错误处理器   │         │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    外部 API 层                                │ │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐   │ │
│  │  │   快手可灵 AI (主)       │  │   火山引擎即梦 AI (备)     │   │ │
│  │  └─────────────────────────┘  └─────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## 2. Redis 数据结构设计

### 2.1 优先级队列 (ZSet)
```
Key: video:tasks:priority
Type: Sorted Set
Score: priority * 10000000000 + timestamp
Member: task_id

示例：
ZADD video:tasks:priority 50000000000 task_001
ZADD video:tasks:priority 50000000001 task_002
ZADD video:tasks:priority 60000000000 task_003  # 优先级更高

# 获取下一个任务（最低分数 = 最高优先级 + 最早时间）
ZPOPMIN video:tasks:priority
```

### 2.2 任务状态存储 (Hash)
```
Key: video:tasks:{task_id}:status
Type: Hash
Fields:
  - id: string
  - type: 'single' | 'batch'
  - priority: number
  - status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  - input: JSON string
  - progress: JSON string
  - output: JSON string
  - metadata: JSON string
  - callbacks: JSON string
  - ttl: 604800 (7 天)

示例：
HSET video:tasks:task_001:status id "task_001"
HSET video:tasks:task_001:status status "processing"
HSET video:tasks:task_001:status input "{\"scene_description\":\"...\"}"
EXPIRE video:tasks:task_001:status 604800
```

### 2.3 活跃任务追踪 (Set)
```
Key: video:tasks:active
Type: Set
Members: [task_id1, task_id2, ...]

示例：
SADD video:tasks:active task_001
SADD video:tasks:active task_002
SREM video:tasks:active task_001  # 任务完成时移除

# 获取活跃任务数量
SCARD video:tasks:active
```

### 2.4 完成任务集合 (Set)
```
Key: video:tasks:completed
Type: Set
Members: [task_id1, task_id2, ...]

示例：
SADD video:tasks:completed task_001

# 获取最近完成的任务（需要配合其他数据结构）
SMEMBERS video:tasks:completed
```

### 2.5 失败任务集合 (Set)
```
Key: video:tasks:failed
Type: Set
Members: [task_id1, task_id2, ...]

示例：
SADD video:tasks:failed task_002

# 用于错误分析和重试
SMEMBERS video:tasks:failed
```

## 3. 任务状态机

```
                                    ┌──────────────┐
                                    │              │
                                    ▼              │
┌─────────┐    开始处理    ┌──────────────┐        │
│ PENDING │───────────────▶│ PROCESSING   │◀───────┘
└─────────┘                └──────┬───────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
       ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
       │  COMPLETED   │  │    FAILED    │  │  CANCELLED   │
       │  (成功)      │  │  (失败)      │  │  (取消)      │
       └──────────────┘  └──────────────┘  └──────────────┘
```

### 3.1 状态转换规则

| 当前状态 | 目标状态 | 触发条件 | 是否允许 |
|----------|----------|----------|----------|
| PENDING | PROCESSING | 队列处理器拾取任务 | ✅ |
| PENDING | CANCELLED | 用户取消 | ✅ |
| PROCESSING | COMPLETED | API 返回成功结果 | ✅ |
| PROCESSING | FAILED | API 返回失败/超时 | ✅ |
| PROCESSING | PENDING | 重试（重新入队） | ✅ |
| PROCESSING | CANCELLED | 用户取消 | ✅ |
| COMPLETED | * | 任何 | ❌ (终态) |
| FAILED | PENDING | 手动重试 | ✅ (需特殊处理) |
| CANCELLED | * | 任何 | ❌ (终态) |

## 4. 队列处理流程

### 4.1 任务提交流程
```
1. 接收输入参数
   ↓
2. 验证输入有效性
   ↓
3. 生成任务 ID (UUID)
   ↓
4. 创建任务对象
   ↓
5. 保存到 Redis Hash
   ↓
6. 添加到优先级队列 (ZSet)
   ↓
7. 返回任务 ID
```

### 4.2 任务处理流程
```
1. 从优先级队列获取任务 (ZPOPMIN)
   ↓
2. 检查并发限制
   ↓
3. 更新任务状态为 PROCESSING
   ↓
4. 添加到活跃任务集合
   ↓
5. 选择 API 提供商
   ↓
6. 调用外部 API
   ↓
7. 轮询任务状态
   ↓
8. 更新进度
   ↓
9. 完成/失败处理
```

### 4.3 轮询流程
```
1. 等待 N 秒 (默认 5 秒)
   ↓
2. 调用 API 查询任务状态
   ↓
3. 解析响应
   ↓
4. 如果 status = completed:
      - 下载视频
      - 更新任务状态
      - 触发完成回调
      - 结束
   ↓
5. 如果 status = failed:
      - 更新任务状态
      - 触发错误处理
      - 结束
   ↓
6. 如果 status = processing:
      - 更新进度
      - 返回步骤 1
   ↓
7. 如果超时 (10 分钟):
      - 标记为失败
      - 结束
```

## 5. 并发控制

### 5.1 并发限制配置
```typescript
{
  queue: {
    maxConcurrentTasks: 5,  // 最大并发任务数
  }
}
```

### 5.2 实现方式
```typescript
// 使用 Redis Set 追踪活跃任务
async function canProcessMore(): Promise<boolean> {
  const activeCount = await redis.scard('video:tasks:active');
  return activeCount < config.queue.maxConcurrentTasks;
}

// 使用 Lua 脚本保证原子性
const ACQUIRE_TASK_SCRIPT = `
  local active = redis.call('SCARD', KEYS[1])
  local max = tonumber(ARGV[1])
  if active < max then
    redis.call('SADD', KEYS[1], ARGV[2])
    return 1
  end
  return 0
`;
```

## 6. 优先级调度

### 6.1 优先级定义
| 优先级 | 说明 | 使用场景 |
|--------|------|----------|
| 1-3 | 低优先级 | 批量后台任务 |
| 4-6 | 中优先级 | 普通用户任务 |
| 7-9 | 高优先级 | VIP 用户任务 |
| 10 | 最高优先级 | 紧急任务/系统任务 |

### 6.2 分数计算
```
score = priority * 10000000000 + timestamp

示例：
- 优先级 5, 时间戳 1709712000000 → 50000000000000 + 1709712000000 = 51709712000000
- 优先级 6, 时间戳 1709712001000 → 60000000000000 + 1709712001000 = 61709712001000

优先级 6 的任务会比优先级 5 的先处理，即使它晚 1000ms 提交。
同优先级下，先提交的任务先处理。
```

## 7. 任务超时处理

### 7.1 超时配置
```typescript
{
  timeout: {
    apiCall: 300000,        // API 调用超时 5 分钟
    polling: 600000,        // 轮询超时 10 分钟
    taskTtl: 604800,        // 任务数据保留 7 天
  }
}
```

### 7.2 超时处理流程
```
1. 记录任务开始时间
   ↓
2. 每次轮询检查是否超时
   ↓
3. 如果超时:
      - 取消外部 API 任务（如果可能）
      - 标记任务为 FAILED
      - 记录失败原因 "Task polling timeout"
      - 触发错误回调
```

## 8. 监控指标

### 8.1 队列指标
```typescript
interface QueueMetrics {
  pending_tasks: number;      // 等待中任务数
  active_tasks: number;       // 处理中任务数
  completed_tasks: number;    // 已完成任务数（今日）
  failed_tasks: number;       // 失败任务数（今日）
  avg_wait_time: number;      // 平均等待时间（秒）
  avg_process_time: number;   // 平均处理时间（秒）
}
```

### 8.2 性能指标
```typescript
interface PerformanceMetrics {
  api_success_rate: number;   // API 成功率
  api_avg_latency: number;    // API 平均延迟（毫秒）
  retry_rate: number;         // 重试率
  provider_switch_rate: number; // 提供商切换率
}
```

## 9. 扩展性设计

### 9.1 水平扩展
- 多个队列处理器实例可以并行工作
- 使用 Redis 的原子操作保证任务不重复处理
- 通过增加 Redis 分片支持更大规模

### 9.2 添加新 API 提供商
```typescript
// 1. 创建新的 API 客户端
class NewProviderClient {
  async generateVideo(): Promise<...> { ... }
  async queryTask(): Promise<...> { ... }
}

// 2. 在 VideoGenerator 中添加处理逻辑
private async processWithNewProvider(task: VideoTask): Promise<string> {
  // ...
}

// 3. 更新 APIProvider 类型
type APIProvider = 'keling' | 'jimeng' | 'new_provider';
```

## 10. 故障恢复

### 10.1 服务重启恢复
```
1. 服务启动时扫描活跃任务集合
   ↓
2. 查询每个任务的详细状态
   ↓
3. 对于 PROCESSING 状态的任务:
      - 查询外部 API 状态
      - 如果外部任务已完成 → 更新为 COMPLETED
      - 如果外部任务失败 → 重新入队或标记 FAILED
      - 如果外部任务仍在处理 → 继续轮询
```

### 10.2 Redis 故障处理
```typescript
// 使用 Redis Sentinel 或 Cluster 保证高可用
const redis = new Redis({
  sentinels: [
    { host: 'sentinel1', port: 26379 },
    { host: 'sentinel2', port: 26379 },
  ],
  name: 'mymaster',
});

// 或者使用 Cluster
const redis = new Redis.Cluster([
  { host: 'node1', port: 6379 },
  { host: 'node2', port: 6379 },
]);
```

---

**文档结束**
