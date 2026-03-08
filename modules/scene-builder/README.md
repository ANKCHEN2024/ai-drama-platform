# 🎬 Scene Builder - 场景构建模块

AI 短剧平台场景构建模块，使用阿里通义千问 API 进行场景分析和生成。

## 📁 目录结构

```
scene-builder/
├── README.md                 # 本文件
├── DESIGN.md                 # 模块设计文档
├── API.md                    # API 接口定义
├── DATA_STRUCTURE.md         # 数据结构定义
├── PROMPT_TEMPLATES.md       # 提示词模板
├── index.js                  # 模块入口
├── analyzer.js               # 场景分析器
├── consistency.js            # 一致性维护
├── storage.js                # 场景存储
└── tests/
    └── analyzer.test.js      # 单元测试
```

## 🚀 快速开始

### 安装依赖

```bash
npm install axios @alicloud/wanx pg redis
```

### 配置环境变量

```bash
# .env
DASHSCOPE_API_KEY=your_api_key
QWEN_MODEL=qwen-plus
WANX_MODEL=wanx-v1
DATABASE_URL=postgresql://user:pass@localhost:5432/drama_platform
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=scenes
```

### 使用示例

```javascript
const SceneBuilder = require('./scene-builder');

const sceneBuilder = new SceneBuilder({
  apiKey: process.env.DASHSCOPE_API_KEY
});

// 分析剧本生成场景
const scene = await sceneBuilder.analyze(`
  清晨，李明坐在办公室里，阳光透过百叶窗洒在桌面上。
  他拿起咖啡杯，轻轻喝了一口，开始查看电脑上的文件。
`);

console.log(scene);
// 输出：结构化场景描述

// 生成场景图像
const image = await sceneBuilder.generateImage(scene, {
  width: 1920,
  height: 1080
});

console.log(image.imageUrl);
```

## 📖 核心功能

### 1. 场景分析

接收剧本/分镜描述，提取场景五要素：
- **地点**：场景发生的物理位置
- **时间**：时间段/具体时刻
- **氛围**：情绪基调/光影风格
- **道具**：场景中的关键物品
- **人物位置**：角色在场景中的位置关系

### 2. 一致性维护

确保同一场景在不同镜头中视觉元素一致：
- 固定种子值控制
- 色彩方案锁定
- 关键道具一致性
- 光影方向连贯

### 3. 场景存储

- PostgreSQL 存储场景元数据
- MinIO 存储场景图像
- Redis 缓存热点数据

## 📡 API 接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/v1/scene/analyze` | POST | 分析剧本生成场景描述 |
| `/api/v1/scene/generate` | POST | 生成场景图像 |
| `/api/v1/scenes` | GET | 查询场景库 |
| `/api/v1/scenes/:sceneId` | GET | 获取场景详情 |
| `/api/v1/scene/check-consistency` | POST | 检查场景一致性 |

详细 API 文档见 [API.md](./API.md)

## 📊 数据结构

核心数据结构 `SceneDescription`：

```typescript
interface SceneDescription {
  sceneId: string;
  location: string;
  time: string;
  atmosphere: string;
  props: string[];
  characterPositions: CharacterPosition[];
  lighting: string;
  colorPalette: string[];
  imagePrompt: string;
  consistency: ConsistencyInfo;
  metadata: SceneMetadata;
}
```

详细数据结构见 [DATA_STRUCTURE.md](./DATA_STRUCTURE.md)

## 📝 提示词模板

模块提供多种提示词模板：
- 场景分析提示词
- 一致性检查提示词
- 图像生成提示词
- 特殊场景提示词（室内/室外/夜景）

详细模板见 [PROMPT_TEMPLATES.md](./PROMPT_TEMPLATES.md)

## 🧪 测试

```bash
# 运行单元测试
npm test

# 运行集成测试
npm run test:integration
```

## 📄 文档

- [设计文档](./DESIGN.md) - 系统架构和设计思路
- [API 文档](./API.md) - 接口定义和使用
- [数据结构](./DATA_STRUCTURE.md) - 数据模型和数据库设计
- [提示词模板](./PROMPT_TEMPLATES.md) - AI 提示词模板库

## 🔧 开发

### 添加新的场景分析器

```javascript
class CustomAnalyzer extends SceneAnalyzer {
  async analyze(script) {
    // 自定义分析逻辑
  }
}
```

### 添加新的提示词模板

在 `prompt-templates.js` 中添加：

```javascript
const CUSTOM_PROMPT = `
你的自定义提示词模板
{variable} 占位符
`;
```

## 📝 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2025-03-07 | 初始版本 |

## 👥 作者

- AI 短剧平台开发团队

## 📄 许可证

MIT

---

**存储位置**: `/Users/chenggl/workspace/ai-drama-platform/modules/scene-builder/`

**创建时间**: 2025-03-07
