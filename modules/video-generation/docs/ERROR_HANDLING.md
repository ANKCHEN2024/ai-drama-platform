# ⚠️ 错误处理和重试机制文档

## 1. 错误分类体系

### 1.1 错误类型定义

```typescript
enum ErrorType {
  // ========== 可重试错误 ==========
  
  /** 网络错误：连接超时、DNS 解析失败等 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  /** API 限流：请求频率过高 */
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  
  /** API 超时：服务端响应超时 */
  API_TIMEOUT = 'API_TIMEOUT',
  
  /** API 服务端错误：5xx 错误 */
  API_SERVER_ERROR = 'API_SERVER_ERROR',
  
  // ========== 不可重试错误 ==========
  
  /** 输入参数错误：缺少必填字段、格式错误等 */
  INVALID_INPUT = 'INVALID_INPUT',
  
  /** 认证失败：API Key 无效、签名错误等 */
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  
  /** 余额不足：账户额度不足 */
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  
  /** 内容违规：触发内容安全策略 */
  CONTENT_VIOLATION = 'CONTENT_VIOLATION',
  
  /** 提供商切换失败：所有提供商都不可用 */
  PROVIDER_SWITCH_FAILED = 'PROVIDER_SWITCH_FAILED',
}
```

### 1.2 错误分类决策树

```
错误发生
    │
    ▼
┌─────────────────────────────────┐
│ 是网络/超时/服务端错误吗？       │
│ (NETWORK, TIMEOUT, 5xx)         │
└──────────────┬──────────────────┘
               │
       ┌───────┴───────┐
       │               │
      是              否
       │               │
       ▼               ▼
  ┌─────────┐    ┌─────────────────────────┐
  │ 可重试   │    │ 是客户端错误吗？         │
  │         │    │ (4xx, 输入错误，认证)    │
  └─────────┘    └──────────────┬──────────┘
                                │
                        ┌───────┴───────┐
                        │               │
                       是              否
                        │               │
                        ▼               ▼
                  ┌──────────┐   ┌──────────────┐
                  │ 不可重试  │   │ 需要人工介入 │
                  │          │   │              │
                  └──────────┘   └──────────────┘
```

### 1.3 HTTP 状态码映射

| 状态码 | 错误类型 | 可重试 | 处理策略 |
|--------|----------|--------|----------|
| 400 | INVALID_INPUT | ❌ | 返回错误给用户修正 |
| 401 | AUTHENTICATION_FAILED | ❌ | 检查 API 密钥配置 |
| 402 | INSUFFICIENT_CREDITS | ❌ | 通知充值 |
| 403 | AUTHENTICATION_FAILED | ❌ | 检查权限配置 |
| 429 | API_RATE_LIMIT | ✅ | 指数退避重试 |
| 451 | CONTENT_VIOLATION | ❌ | 返回错误，记录日志 |
| 500 | API_SERVER_ERROR | ✅ | 指数退避重试 |
| 502 | API_SERVER_ERROR | ✅ | 指数退避重试 |
| 503 | API_SERVER_ERROR | ✅ | 指数退避重试 |
| 504 | API_TIMEOUT | ✅ | 指数退避重试 |

## 2. 重试策略

### 2.1 指数退避算法

```typescript
interface RetryStrategy {
  maxRetries: number;        // 最大重试次数
  baseDelay: number;         // 基础延迟（毫秒）
  maxDelay: number;          // 最大延迟（毫秒）
  backoffMultiplier: number; // 退避倍数
  jitter: number;            // 随机抖动比例
}

const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxRetries: 3,
  baseDelay: 1000,      // 1 秒
  maxDelay: 60000,      // 60 秒
  backoffMultiplier: 2, // 指数增长
  jitter: 0.1,          // ±10% 随机抖动
};

function calculateDelay(retryCount: number, strategy: RetryStrategy): number {
  // 指数退避
  const exponentialDelay = strategy.baseDelay * Math.pow(strategy.backoffMultiplier, retryCount);
  
  // 限制最大延迟
  const cappedDelay = Math.min(exponentialDelay, strategy.maxDelay);
  
  // 添加随机抖动（避免多个任务同时重试造成雪崩）
  const jitterRange = cappedDelay * strategy.jitter;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  
  return Math.round(cappedDelay + jitter);
}

// 重试延迟示例：
// 第 1 次重试：1000ms ± 100ms
// 第 2 次重试：2000ms ± 200ms
// 第 3 次重试：4000ms ± 400ms
// ...
// 最大：60000ms ± 6000ms
```

### 2.2 重试流程

```
任务执行失败
    │
    ▼
┌─────────────────────────┐
│ 错误是否可重试？         │
└──────────┬──────────────┘
           │
    ┌──────┴──────┐
    │             │
   是            否
    │             │
    ▼             ▼
┌─────────┐  ┌──────────────┐
│ 检查重   │  │ 标记为失败   │
│ 试次数   │  │ 触发错误回调 │
└────┬────┘  └──────────────┘
     │
     ▼
┌─────────────────────────┐
│ 超过最大重试次数？       │
└──────────┬──────────────┘
           │
    ┌──────┴──────┐
    │             │
   是            否
    │             │
    ▼             ▼
┌─────────────────┐  ┌─────────────────────┐
│ 尝试切换提供商   │  │ 计算延迟等待         │
│ (如果可用)      │  │ 重新执行任务         │
└────────┬────────┘  └─────────────────────┘
         │
         ▼
    ┌────────────┐
    │ 切换成功？  │
    └─────┬──────┘
          │
   ┌──────┴──────┐
   │             │
  是            否
   │             │
   ▼             ▼
┌─────────┐  ┌──────────────┐
│ 重置重   │  │ 标记为失败   │
│ 试次数   │  │              │
│ 重试    │  │              │
└─────────┘  └──────────────┘
```

### 2.3 重试代码实现

```typescript
async function executeWithRetry<T>(
  task: VideoTask,
  executor: () => Promise<T>,
  logger: Logger
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.retry.maxRetries; attempt++) {
    try {
      // 执行任务
      return await executor();
      
    } catch (error) {
      lastError = error as Error;
      const videoError = classifyError(error);
      
      logger.warn(`Attempt ${attempt + 1} failed:`, {
        error_type: videoError.type,
        retryable: videoError.retryable,
        message: videoError.message,
      });
      
      // 不可重试错误直接抛出
      if (!videoError.retryable) {
        throw videoError;
      }
      
      // 达到最大重试次数
      if (attempt >= config.retry.maxRetries) {
        break;
      }
      
      // 计算延迟
      const delay = config.retry.getDelay(attempt);
      logger.info(`Retrying after ${delay}ms...`);
      
      // 等待
      await sleep(delay);
    }
  }
  
  // 所有重试都失败了
  throw lastError;
}
```

## 3. API 提供商切换

### 3.1 切换策略

```typescript
const PROVIDER_FAILOVER = {
  // 主提供商失败时的切换顺序
  keling: ['jimeng'],
  jimeng: ['keling'],
};

async function executeWithProviderFailover<T>(
  task: VideoTask,
  executors: {
    keling: () => Promise<T>;
    jimeng: () => Promise<T>;
  },
  logger: Logger
): Promise<T> {
  const primaryProvider = task.metadata.api_provider;
  const fallbackProviders = PROVIDER_FAILOVER[primaryProvider] || [];
  
  // 尝试主提供商
  try {
    logger.info(`Trying primary provider: ${primaryProvider}`);
    return await executors[primaryProvider]();
  } catch (error) {
    logger.warn(`Primary provider ${primaryProvider} failed:`, error);
    
    // 尝试备用提供商
    for (const fallback of fallbackProviders) {
      try {
        logger.info(`Switching to fallback provider: ${fallback}`);
        task.metadata.api_provider = fallback as APIProvider;
        task.metadata.retry_count = 0; // 重置重试计数
        
        return await executors[fallback]();
      } catch (fallbackError) {
        logger.warn(`Fallback provider ${fallback} also failed:`, fallbackError);
        // 继续尝试下一个备用提供商
      }
    }
    
    // 所有提供商都失败了
    throw new VideoGeneratorError(
      'All providers failed',
      ErrorType.PROVIDER_SWITCH_FAILED,
      false
    );
  }
}
```

### 3.2 提供商健康检查

```typescript
interface ProviderHealth {
  available: boolean;
  latency_ms: number;
  success_rate: number;  // 最近 100 次请求的成功率
  last_error?: string;
  last_check: number;
}

class ProviderHealthMonitor {
  private health: Map<APIProvider, ProviderHealth> = new Map();
  
  async checkProvider(provider: APIProvider): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      // 发送一个简单的测试请求
      await this.pingProvider(provider);
      
      const latency = Date.now() - startTime;
      
      this.health.set(provider, {
        available: true,
        latency_ms: latency,
        success_rate: this.calculateSuccessRate(provider),
        last_check: Date.now(),
      });
      
    } catch (error) {
      this.health.set(provider, {
        available: false,
        latency_ms: 0,
        success_rate: 0,
        last_error: error.message,
        last_check: Date.now(),
      });
    }
    
    return this.health.get(provider)!;
  }
  
  shouldUseProvider(provider: APIProvider): boolean {
    const health = this.health.get(provider);
    
    if (!health) return true; // 没有健康数据，默认可用
    
    // 如果不可用，跳过
    if (!health.available) return false;
    
    // 如果成功率太低，跳过
    if (health.success_rate < 0.5) return false;
    
    // 如果延迟太高，考虑跳过
    if (health.latency_ms > 10000) return false;
    
    return true;
  }
}
```

## 4. 错误回调和通知

### 4.1 Webhook 回调

```typescript
interface ErrorWebhookPayload {
  event: 'task_failed';
  timestamp: number;
  task: {
    id: string;
    type: string;
    priority: number;
    input: {
      scene_description: string;
      character_description: string;
      action_description: string;
    };
    metadata: {
      created_at: number;
      completed_at: number;
      retry_count: number;
      api_provider: string;
    };
  };
  error: {
    type: string;
    message: string;
    retryable: boolean;
    stack?: string;
  };
}

async function sendErrorWebhook(
  webhookUrl: string,
  payload: ErrorWebhookPayload
): Promise<void> {
  try {
    await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
  } catch (error) {
    console.error('Failed to send error webhook:', error);
    // Webhook 失败不影响主流程
  }
}
```

### 4.2 错误日志记录

```typescript
interface ErrorLog {
  timestamp: number;
  task_id: string;
  error_type: ErrorType;
  error_message: string;
  provider: APIProvider;
  retry_count: number;
  input_hash: string;  // 输入参数的哈希，用于去重
  stack_trace?: string;
}

// 记录错误到日志系统
async function logError(errorLog: ErrorLog): Promise<void> {
  // 写入文件日志
  logger.error('Task failed:', errorLog);
  
  // 写入错误统计数据库（用于分析）
  await errorStatsDb.insert(errorLog);
  
  // 如果是新错误类型，发送告警
  if (await isNewErrorType(errorLog.error_type)) {
    await sendAlert(`New error type detected: ${errorLog.error_type}`);
  }
}
```

## 5. 错误统计和分析

### 5.1 统计指标

```typescript
interface ErrorMetrics {
  // 按错误类型统计
  by_type: Record<ErrorType, {
    count: number;
    percentage: number;
  }>;
  
  // 按提供商统计
  by_provider: Record<APIProvider, {
    total_requests: number;
    failed_requests: number;
    failure_rate: number;
  }>;
  
  // 按时间段统计（每小时）
  by_hour: Array<{
    hour: string;  // ISO 格式
    total: number;
    failed: number;
  }>;
  
  // 重试统计
  retry_stats: {
    total_retries: number;
    successful_retries: number;
    retry_success_rate: number;
    avg_retries_per_failure: number;
  };
  
  // 提供商切换统计
  failover_stats: {
    total_failovers: number;
    successful_failovers: number;
    failover_success_rate: number;
  };
}
```

### 5.2 告警规则

```typescript
const ALERT_RULES = [
  {
    name: '高错误率',
    condition: (metrics: ErrorMetrics) => {
      const overallFailureRate = 
        metrics.by_provider.keling.failure_rate > 0.2 ||
        metrics.by_provider.jimeng.failure_rate > 0.2;
      return overallFailureRate;
    },
    message: '视频生成错误率超过 20%',
    severity: 'high',
  },
  {
    name: '提供商不可用',
    condition: (metrics: ErrorMetrics) => {
      return metrics.by_provider.keling.failure_rate > 0.8;
    },
    message: '快手可灵 AI 可能不可用，错误率超过 80%',
    severity: 'critical',
  },
  {
    name: '连续失败',
    condition: (metrics: ErrorMetrics) => {
      // 检查最近 10 个任务是否都失败
      return checkConsecutiveFailures(10);
    },
    message: '检测到连续 10 个任务失败',
    severity: 'high',
  },
  {
    name: '新错误类型',
    condition: (errorLog: ErrorLog) => {
      return isNewErrorType(errorLog.error_type);
    },
    message: '检测到新的错误类型',
    severity: 'medium',
  },
];
```

## 6. 常见错误处理场景

### 6.1 场景 1：API 限流

```
错误：429 Too Many Requests
处理：
1. 识别为可重试错误
2. 检查 Retry-After 头（如果有）
3. 使用指数退避等待
4. 重试请求
5. 如果多次限流，考虑降低并发数
```

### 6.2 场景 2：内容违规

```
错误：451 Content Violation
处理：
1. 识别为不可重试错误
2. 记录违规内容（用于审核）
3. 标记任务为失败
4. 通知用户修改内容
5. 不触发重试
```

### 6.3 场景 3：网络超时

```
错误：ETIMEDOUT / ECONNABORTED
处理：
1. 识别为可重试错误
2. 等待指数退避延迟
3. 重试请求
4. 如果持续超时，尝试切换到备用提供商
```

### 6.4 场景 4：认证失败

```
错误：401 Unauthorized
处理：
1. 识别为不可重试错误
2. 检查 API 密钥配置
3. 记录错误日志
4. 发送告警通知管理员
5. 标记任务为失败
```

## 7. 最佳实践

### 7.1 重试最佳实践

✅ **应该做的：**
- 只对可重试错误进行重试
- 使用指数退避避免雪崩
- 添加随机抖动避免同步重试
- 设置最大重试次数限制
- 记录每次重试的日志

❌ **不应该做的：**
- 无限重试
- 对不可重试错误重试
- 固定间隔重试（容易造成雪崩）
- 不记录重试日志

### 7.2 错误处理最佳实践

✅ **应该做的：**
- 明确分类错误类型
- 提供详细的错误信息
- 记录完整的错误上下文
- 实现优雅降级
- 设置合理的超时时间

❌ **不应该做的：**
- 吞掉错误不处理
- 返回模糊的错误信息
- 不记录错误堆栈
- 忽略超时处理

### 7.3 监控最佳实践

✅ **应该做的：**
- 实时监控错误率
- 设置告警阈值
- 定期分析错误趋势
- 追踪端到端延迟
- 监控提供商健康状态

❌ **不应该做的：**
- 只监控不告警
- 忽略慢错误（slow errors）
- 不分析错误根因
- 不监控依赖服务

---

**文档结束**
