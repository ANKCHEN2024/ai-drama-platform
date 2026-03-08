# API 对接文档

## 基础配置

所有 API 请求都通过 `src/api/index.js` 中创建的 axios 实例进行。

### 请求拦截器

自动添加 Authorization header（如果存在 token）：

```javascript
config.headers['Authorization'] = `Bearer ${token}`
```

### 响应拦截器

统一处理错误：
- code !== 200 时显示错误消息
- 网络错误时显示提示

## 使用示例

### 获取项目列表

```javascript
import { getProjectList } from '@/api/project'

const response = await getProjectList({
  page: 1,
  pageSize: 10,
  status: 'completed'
})

// response.data 包含项目列表
```

### 创建项目

```javascript
import { createProject } from '@/api/project'

const project = await createProject({
  name: '我的短剧',
  novel: '小说内容...',
  description: '项目描述'
})
```

### 分析故事

```javascript
import { analyzeStory } from '@/api/story'

const result = await analyzeStory({
  content: '小说全文内容',
  options: {
    episodeCount: 10,
    durationPerEpisode: 2
  }
})

// result.data 包含分析结果
```

### 生成视频

```javascript
import { generateVideo } from '@/api/video'

const task = await generateVideo({
  projectId: 1,
  episodeId: 1,
  scenes: [...],
  audioUrl: '...'
})

// 轮询进度
const progress = await getComposeProgress(task.id)
```

## 错误处理

所有 API 调用都应该用 try-catch 包裹：

```javascript
try {
  const result = await someApi()
  // 处理成功
} catch (error) {
  // 错误已由拦截器处理，这里可以做额外处理
  console.error('API 错误:', error)
}
```

## 后端接口规范

### 响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {
    // 实际数据
  }
}
```

### 错误码

- 200: 成功
- 400: 请求参数错误
- 401: 未授权
- 403: 禁止访问
- 404: 资源不存在
- 500: 服务器内部错误

### 分页格式

```json
{
  "code": 200,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

## WebSocket 连接（可选）

用于实时获取生成进度：

```javascript
const ws = new WebSocket('ws://localhost:8080/ws')

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // 处理进度更新
}
```

## 文件上传

使用 FormData 上传文件：

```javascript
const formData = new FormData()
formData.append('file', file)
formData.append('name', '项目名称')

const response = await request({
  url: '/upload',
  method: 'post',
  data: formData,
  headers: {
    'Content-Type': 'multipart/form-data'
  }
})
```
