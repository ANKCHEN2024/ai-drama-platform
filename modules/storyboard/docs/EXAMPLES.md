# 分镜生成模块使用示例

## 快速开始

### 1. 安装依赖

```bash
cd /Users/chenggl/workspace/ai-drama-platform/modules/storyboard
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# 阿里云 API 密钥
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret

# MinIO 存储配置
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=storyboards

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/ai_drama
```

### 3. 基本使用

```javascript
const storyboard = require('./modules/storyboard');

// 初始化模块
storyboard.init({
  aliyun: {
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET
  }
});

// 生成分镜
async function main() {
  const result = await storyboard.generate({
    projectId: 'proj_001',
    sceneId: 'scene_001',
    sceneDescription: '现代化办公室，落地窗，下午阳光洒进室内',
    characters: [
      {
        characterId: 'char_001',
        name: '李明',
        role: 'protagonist',
        appearance: {
          gender: 'male',
          age: 28,
          height: '180cm',
          bodyType: '健壮',
          faceShape: '方形脸',
          skinTone: '健康小麦色'
        },
        hairstyle: {
          style: '短发',
          color: '黑色',
          length: 'short'
        },
        outfit: {
          top: '白色衬衫',
          bottom: '深蓝色西裤',
          shoes: '黑色皮鞋',
          accessories: ['银色手表']
        },
        expression: '专注认真',
        pose: '站立'
      }
    ],
    action: '李明走向办公桌，拿起文件开始阅读',
    cameraAngles: [
      storyboard.CameraAngle.FULL_SHOT,
      storyboard.CameraAngle.MEDIUM_SHOT,
      storyboard.CameraAngle.CLOSE_UP
    ],
    countPerAngle: 4,
    style: '电影感写实',
    aspectRatio: storyboard.AspectRatio.LANDSCAPE_16_9,
    quality: storyboard.QualityLevel.HIGH
  });

  console.log('分镜生成完成:', result);
}

main().catch(console.error);
```

## 进阶用法

### 异步生成（推荐用于生产环境）

```javascript
// 提交生成任务
const taskResult = await storyboard.generateAsync({
  projectId: 'proj_001',
  sceneId: 'scene_001',
  sceneDescription: '...',
  characters: [...],
  action: '...',
  cameraAngles: ['full_shot', 'medium_shot', 'close_up']
});

console.log('任务已提交:', taskResult.data.taskId);
console.log('预计生成时间:', taskResult.data.estimatedTime, '秒');

// 轮询任务状态
const service = storyboard.getService();
let status;
do {
  await new Promise(resolve => setTimeout(resolve, 3000)); // 等待 3 秒
  status = await service.getTaskStatus(taskResult.data.taskId);
  console.log('当前状态:', status.data.status, '进度:', status.data.progress + '%');
} while (status.data.status === 'pending' || status.data.status === 'generating');

// 获取最终结果
const finalResult = await service.getStoryboard(status.data.storyboardId);
console.log('分镜图像:', finalResult.data.images);
```

### 使用通义万相客户端

```javascript
const wanx = storyboard.getWanXClient();

// 直接调用 API 生成图像
const result = await wanx.generateImage({
  prompt: '电影感镜头，一位 25 岁中国女性，黑色长发，白色衬衫，现代化办公室',
  negativePrompt: wanx.getDefaultNegativePrompt(),
  size: '1280*720',
  count: 4,
  seed: 12345,
  style: '<photographic>'
});

console.log('任务 ID:', result.taskId);

// 等待完成
const final = await wanx.waitForCompletion(result.taskId);
console.log('生成的图像:', final.images);
```

### 一致性控制

```javascript
const consistency = storyboard.getConsistencyController();

// 生成人物一致性种子
const characterSeed = consistency.generateCharacterSeed(
  'char_001',  // 人物 ID
  'proj_001',  // 项目 ID
  'v1'         // 版本
);

console.log('人物种子:', characterSeed);

// 构建一致性提示词
const prompts = consistency.buildConsistencyPrompts(character, scene);
console.log('一致性提示词:', prompts.combinedPrompt);

// 计算图像一致性分数
const score = await consistency.calculateVisualConsistency(
  imageBuffer1,
  imageBuffer2
);

console.log('一致性分数:', score);
console.log('是否达标:', consistency.isConsistent(score));
```

### 选择和重新生成

```javascript
// 选择最佳图像
const selectResult = await storyboard.selectImage(
  'sb_abc123',      // 分镜 ID
  'img_xyz789',     // 图像 ID
  'medium_shot'     // 镜头角度
);

// 重新生成不满意的镜头
const regenResult = await storyboard.regenerate('sb_abc123', {
  cameraAngles: ['close_up'],  // 只重新生成近景
  count: 4,                     // 生成 4 张
  seed: 54321                   // 指定种子（可选）
});
```

## API 路由使用

### 集成到 Express 应用

```javascript
const express = require('express');
const storyboard = require('./modules/storyboard');

const app = express();
app.use(express.json());

// 初始化模块
storyboard.init({ /* 配置 */ });

// 挂载路由
app.use('/api/v1/storyboards', storyboard.routes);

app.listen(3000, () => {
  console.log('服务器运行在 http://localhost:3000');
});
```

### API 调用示例

```bash
# 生成分镜
curl -X POST http://localhost:3000/api/v1/storyboards/generate \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_001",
    "sceneId": "scene_001",
    "sceneDescription": "现代化办公室",
    "characters": [...],
    "action": "主角走向办公桌",
    "cameraAngles": ["full_shot", "medium_shot", "close_up"],
    "countPerAngle": 4
  }'

# 查询任务状态
curl http://localhost:3000/api/v1/storyboards/tasks/task_abc123

# 获取分镜详情
curl http://localhost:3000/api/v1/storyboards/sb_xyz789

# 选择图像
curl -X PATCH http://localhost:3000/api/v1/storyboards/sb_xyz789/select \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "img_001",
    "cameraAngle": "medium_shot"
  }'
```

## 镜头角度参考

```javascript
const { CameraAngle } = storyboard;

// 所有可用的镜头角度
console.log(Object.values(CameraAngle));
// [
//   'extreme_long_shot',    // 大远景
//   'long_shot',            // 远景
//   'full_shot',            // 全景
//   'medium_long_shot',     // 中全景
//   'medium_shot',          // 中景
//   'medium_close_up',      // 中近景
//   'close_up',             // 近景
//   'extreme_close_up'      // 特写
// ]

// 典型分镜组合
const standardShots = [
  CameraAngle.FULL_SHOT,      // 建立场景
  CameraAngle.MEDIUM_SHOT,    // 展示动作
  CameraAngle.CLOSE_UP        // 强调情感
];

const dramaticShots = [
  CameraAngle.EXTREME_LONG_SHOT,  // 宏大开场
  CameraAngle.MEDIUM_SHOT,        // 常规镜头
  CameraAngle.EXTREME_CLOSE_UP    // 情感高潮
];
```

## 错误处理

```javascript
try {
  const result = await storyboard.generate(request);
  
  if (!result.success) {
    console.error('生成失败:', result.error);
    
    switch (result.error.code) {
      case 'API_RATE_LIMIT':
        console.log('API 限流，稍后重试');
        break;
      case 'GENERATION_FAILED':
        console.log('生成失败，尝试重新生成');
        break;
      case 'CONSISTENCY_LOW':
        console.log('一致性分数过低，建议调整参数');
        break;
    }
  }
} catch (error) {
  console.error('意外错误:', error);
}
```

## 批量生成

```javascript
// 为多个场景批量生成分镜
const scenes = [
  { sceneId: 'scene_001', description: '...' },
  { sceneId: 'scene_002', description: '...' },
  { sceneId: 'scene_003', description: '...' }
];

const results = await Promise.allSettled(
  scenes.map(scene =>
    storyboard.generate({
      projectId: 'proj_001',
      sceneId: scene.sceneId,
      sceneDescription: scene.description,
      characters: [...],
      action: '...',
      cameraAngles: ['full_shot', 'medium_shot']
    })
  )
);

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`场景 ${scenes[index].sceneId} 生成成功`);
  } else {
    console.error(`场景 ${scenes[index].sceneId} 生成失败:`, result.reason);
  }
});
```

---

**更多示例请参考 tests/ 目录下的测试用例**
