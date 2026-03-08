# 🔌 API 集成指南

## 1. 快手可灵 AI API 集成

### 1.1 API 概述

快手可灵 AI 是视频生成模块的主要 API 提供商，支持：
- Text-to-Video 生成
- 图片参考（人物/场景一致性）
- 运动控制
- 多种分辨率和时长选项

### 1.2 认证方式

```typescript
// 请求头认证
headers: {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
}

// 或者使用签名认证（如果 API 要求）
function generateSignature(params: any, secret: string): string {
  const sortedParams = Object.keys(params).sort();
  const signString = sortedParams.map(k => `${k}=${params[k]}`).join('&') + secret;
  return crypto.createHash('sha256').update(signString).digest('hex');
}
```

### 1.3 生成视频 API

**端点：** `POST /v1/video/generate`

**请求体：**
```json
{
  "prompt": "现代办公室，年轻女性坐在办公桌前打字",
  "negative_prompt": "模糊，低质量，变形",
  "reference_image": "https://example.com/character.jpg",
  "reference_type": "character",
  "duration": 5,
  "resolution": "720p",
  "motion_strength": 5,
  "seed": 12345
}
```

**响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "kl_task_123456",
    "status": "pending",
    "progress": 0,
    "estimated_time": 180
  }
}
```

### 1.4 查询任务 API

**端点：** `GET /v1/video/query/{task_id}`

**响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "kl_task_123456",
    "status": "processing",
    "progress": 45,
    "estimated_time": 100
  }
}
```

**完成响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "kl_task_123456",
    "status": "completed",
    "progress": 100,
    "video_url": "https://cdn.kuaishou.com/video/xxx.mp4",
    "cover_url": "https://cdn.kuaishou.com/cover/xxx.jpg",
    "duration": 5,
    "resolution": "720p"
  }
}
```

### 1.5 提示词工程

**最佳实践：**

```typescript
// 好的提示词
const goodPrompt = `
现代办公室环境，落地窗透进阳光，
年轻亚洲女性，黑色长发，白色衬衫，职业装扮，
坐在办公桌前专注地打字，偶尔抬头微笑看向镜头，
自然光，电影质感，高清晰度
`;

// 避免的提示词
const badPrompt = `
一个人在办公室
`;

// 结构化提示词构建
function buildPrompt(input: {
  scene: string;
  character: string;
  action: string;
  style?: string;
}): string {
  const parts = [
    input.scene,
    input.character,
    input.action,
    input.style || '自然光，电影质感，高清晰度',
  ];
  return parts.filter(Boolean).join(', ');
}
```

### 1.6 参考图使用

**人物一致性：**
```typescript
// 上传人物参考图
const characterRef = await uploadReferenceImage({
  type: 'character',
  image_url: 'https://example.com/character.jpg',
});

// 在生成时使用
await kelingClient.generateVideo({
  prompt: '...',
  reference_image: characterRef.url,
  reference_type: 'character',
  consistency_strength: 0.8,  // 一致性强度
});
```

**场景一致性：**
```typescript
// 上传场景参考图
const sceneRef = await uploadReferenceImage({
  type: 'scene',
  image_url: 'https://example.com/office.jpg',
});

// 在生成时使用
await kelingClient.generateVideo({
  prompt: '...',
  reference_image: sceneRef.url,
  reference_type: 'scene',
});
```

## 2. 火山引擎即梦 AI API 集成

### 2.1 API 概述

火山引擎即梦 AI 是备选 API 提供商，支持：
- Text-to-Video 生成
- 图片提示
- 多种视频风格
- 多种画幅比例

### 2.2 认证方式

```typescript
// 火山引擎使用签名认证
headers: {
  'X-Api-Key': API_KEY,
  'X-Api-Signature': signature,
  'X-Api-Timestamp': timestamp.toString(),
}

// 签名生成
function generateVolcSignature(
  method: string,
  path: string,
  body: string,
  secret: string,
  timestamp: number
): string {
  const signString = `${method}\n${path}\n${timestamp}\n${body}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signString)
    .digest('base64');
}
```

### 2.3 生成视频 API

**端点：** `POST /v1/video/generate`

**请求体：**
```json
{
  "prompt": "现代办公室，年轻女性在打字",
  "image_prompt": "https://example.com/character.jpg",
  "video_style": "realistic",
  "aspect_ratio": "16:9",
  "duration": 5
}
```

**响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "jm_task_789012",
    "status": "pending",
    "progress": 0
  }
}
```

### 2.4 查询任务 API

**端点：** `GET /v1/video/query/{task_id}`

**响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "jm_task_789012",
    "status": "completed",
    "progress": 100,
    "video_url": "https://cdn.volcengine.com/video/xxx.mp4",
    "cover_url": "https://cdn.volcengine.com/cover/xxx.jpg"
  }
}
```

### 2.5 视频风格选项

```typescript
const VIDEO_STYLES = {
  realistic: '写实风格',
  anime: '动漫风格',
  cinematic: '电影质感',
  artistic: '艺术风格',
  documentary: '纪录片风格',
};

// 使用示例
await jimengClient.generateVideo({
  prompt: '...',
  video_style: 'cinematic',
  aspect_ratio: '16:9',
});
```

### 2.6 画幅比例选项

```typescript
const ASPECT_RATIOS = {
  '16:9': '横屏（适合 YouTube/B 站）',
  '9:16': '竖屏（适合抖音/快手）',
  '1:1': '正方形（适合社交媒体）',
  '2.35:1': '电影宽屏',
};

// 使用示例
await jimengClient.generateVideo({
  prompt: '...',
  aspect_ratio: '9:16',  // 竖屏
});
```

## 3. API 选择策略

### 3.1 默认路由

```typescript
function selectProvider(input: VideoInput): APIProvider {
  // 默认使用可灵
  if (!input.parameters?.style) {
    return 'keling';
  }
  
  // 根据风格选择
  if (input.parameters.style === 'anime') {
    return 'jimeng';  // 即梦的动漫风格更好
  }
  
  if (input.parameters.aspect_ratio === '9:16') {
    return 'jimeng';  // 即梦对竖屏支持更好
  }
  
  return 'keling';  // 默认可灵
}
```

### 3.2 负载均衡

```typescript
class ProviderRouter {
  private stats: Map<APIProvider, ProviderStats> = new Map();
  
  selectProvider(): APIProvider {
    // 基于成功率和延迟选择
    const kelingScore = this.calculateScore('keling');
    const jimengScore = this.calculateScore('jimeng');
    
    return kelingScore >= jimengScore ? 'keling' : 'jimeng';
  }
  
  private calculateScore(provider: APIProvider): number {
    const stats = this.stats.get(provider);
    if (!stats) return 0.5;
    
    // 综合评分 = 成功率 * 0.7 + (1 - 归一化延迟) * 0.3
    return stats.successRate * 0.7 + (1 - stats.avgLatency / 10000) * 0.3;
  }
}
```

## 4. 错误码参考

### 4.1 快手可灵 API 错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 0 | 成功 | - |
| 1001 | 参数错误 | 检查请求参数 |
| 1002 | 认证失败 | 检查 API Key |
| 1003 | 余额不足 | 充值 |
| 1004 | 频率限制 | 等待后重试 |
| 1005 | 内容违规 | 修改提示词 |
| 2001 | 服务端错误 | 重试 |
| 2002 | 任务不存在 | 检查任务 ID |

### 4.2 火山即梦 API 错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 0 | 成功 | - |
| 4000 | 参数错误 | 检查请求参数 |
| 4001 | 签名错误 | 检查签名算法 |
| 4002 | 认证失败 | 检查 API Key |
| 4003 | 余额不足 | 充值 |
| 4004 | 频率限制 | 等待后重试 |
| 4005 | 内容审核失败 | 修改提示词 |
| 5000 | 服务端错误 | 重试 |

## 5. 性能优化

### 5.1 连接池

```typescript
import axios from 'axios';
import HttpsProxyAgent from 'https-proxy-agent';

// 创建优化的 Axios 实例
const optimizedClient = axios.create({
  timeout: 300000,
  maxContentLength: 50 * 1024 * 1024, // 50MB
  maxBodyLength: 50 * 1024 * 1024,
  httpAgent: new http.Agent({
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
  }),
  httpsAgent: new https.Agent({
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
  }),
});
```

### 5.2 请求去重

```typescript
class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<any>> = new Map();
  
  async request<T>(key: string, executor: () => Promise<T>): Promise<T> {
    // 检查是否有相同请求正在进行
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }
    
    try {
      const promise = executor();
      this.pendingRequests.set(key, promise);
      return await promise;
    } finally {
      this.pendingRequests.delete(key);
    }
  }
}

// 使用示例
const deduplicator = new RequestDeduplicator();
const result = await deduplicator.request(
  `query:${taskId}`,
  () => apiClient.queryTask(taskId)
);
```

### 5.3 响应缓存

```typescript
class ResponseCache {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }
  
  set(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }
}

// 缓存查询结果（5 秒）
const cache = new ResponseCache();
const cachedResult = cache.get(`query:${taskId}`);
if (cachedResult) {
  return cachedResult;
}
const result = await apiClient.queryTask(taskId);
cache.set(`query:${taskId}`, result, 5000);
```

## 6. 安全最佳实践

### 6.1 API 密钥管理

```typescript
// ✅ 好的做法：从环境变量读取
const apiKey = process.env.KELING_API_KEY;

// ❌ 坏的做法：硬编码
const apiKey = 'sk-xxxxx';  // 不要这样做！
```

### 6.2 请求签名

```typescript
// 为请求添加时间戳防止重放攻击
function createSignedRequest(params: any, apiKey: string, apiSecret: string) {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const signString = `${timestamp}${nonce}${JSON.stringify(params)}${apiSecret}`;
  const signature = crypto.createHash('sha256').update(signString).digest('hex');
  
  return {
    ...params,
    timestamp,
    nonce,
    signature,
  };
}
```

### 6.3 内容安全

```typescript
// 提示词内容检查
function validatePrompt(prompt: string): { valid: boolean; reason?: string } {
  const sensitivePatterns = [
    /暴力/i,
    /色情/i,
    /政治敏感/i,
    // ... 更多敏感词
  ];
  
  for (const pattern of sensitivePatterns) {
    if (pattern.test(prompt)) {
      return { valid: false, reason: '包含敏感内容' };
    }
  }
  
  return { valid: true };
}

// 使用示例
const validation = validatePrompt(userPrompt);
if (!validation.valid) {
  throw new Error(`提示词不合法：${validation.reason}`);
}
```

---

**文档结束**
