# 🎬 场景构建模块设计文档

## 1. 模块概述

### 1.1 模块名称
**Scene Builder** (场景构建模块)

### 1.2 模块职责
- 接收剧本/分镜描述，进行场景语义分析
- 提取场景要素（地点、时间、氛围、道具、人物位置）
- 生成场景一致性描述，确保视频生成时的视觉连贯性
- 维护场景库，支持场景复用和变体生成

### 1.3 技术选型
- **核心 AI**: 阿里通义千问 (qwen-plus)
- **图像生成**: 阿里通义万相 (wanx-v1)
- **一致性维护**: 场景特征向量 + 种子值控制

### 1.4 输入输出
```
输入：剧本片段 / 分镜描述
输出：结构化场景描述 + 场景图像提示词
```

---

## 2. 系统架构

### 2.1 模块结构
```
scene-builder/
├── index.js                 # 模块入口
├── analyzer.js              # 场景分析器
├── consistency.js           # 一致性维护
├── prompt-templates.js      # 提示词模板
├── storage.js               # 场景存储
└── tests/
    └── analyzer.test.js
```

### 2.2 数据流
```
剧本/分镜 → 场景分析 → 要素提取 → 一致性检查 → 场景描述 → 图像提示词
                ↓              ↓           ↓
           场景库查询    特征匹配    种子值生成
```

---

## 3. 核心功能设计

### 3.1 场景分析 (Scene Analyzer)

#### 3.1.1 分析维度
| 维度 | 描述 | 示例 |
|------|------|------|
| 地点 | 场景发生的物理位置 | 办公室、咖啡厅、街道 |
| 时间 | 时间段/具体时刻 | 白天、夜晚、黄昏、凌晨 3 点 |
| 氛围 | 情绪基调/光影风格 | 温馨、紧张、神秘、浪漫 |
| 道具 | 场景中的关键物品 | 桌子、电脑、咖啡杯、文件 |
| 人物位置 | 角色在场景中的位置关系 | 坐在桌前、站在窗边、靠在墙上 |

#### 3.1.2 分析流程
1. 接收文本输入（剧本片段或分镜描述）
2. 调用通义千问 API 进行语义分析
3. 提取五维场景要素
4. 输出结构化 JSON

### 3.2 场景一致性维护 (Consistency Engine)

#### 3.2.1 一致性挑战
- 同一场景在不同镜头中视觉元素需保持一致
- 道具位置、颜色、样式不能穿帮
- 光影方向、强度需连贯

#### 3.2.2 解决方案
```javascript
// 场景特征向量
{
  sceneId: "office_001",
  baseSeed: 12345,           // 固定种子值
  colorPalette: ["#2C3E50", "#ECF0F1"],  // 主色调
  keyProps: ["desk", "computer", "window"],  // 关键道具
  lightingDirection: "left",  // 光源方向
  style: "modern_office"      // 风格标签
}
```

#### 3.2.3 一致性检查
- 新场景生成时，查询场景库中相似场景
- 复用已有种子值和色彩方案
- 确保同一场景 ID 的所有镜头使用相同基础参数

### 3.3 场景存储 (Scene Storage)

#### 3.3.1 存储结构
- **PostgreSQL**: 场景元数据
- **MinIO**: 场景参考图
- **Redis**: 场景缓存（热点数据）

---

## 4. API 接口定义

### 4.1 场景分析接口

```javascript
/**
 * 分析剧本/分镜，生成场景描述
 * @param {Object} params
 * @param {string} params.script - 剧本片段或分镜描述
 * @param {string} params.sceneId - 场景 ID（可选，用于一致性）
 * @returns {Promise<SceneDescription>}
 */
async function analyzeScene({ script, sceneId })

// 请求示例
POST /api/v1/scene/analyze
{
  "script": "清晨，李明坐在办公室里，阳光透过百叶窗洒在桌面上。",
  "sceneId": "office_001"
}

// 响应示例
{
  "sceneId": "office_001",
  "location": "办公室",
  "time": "清晨",
  "atmosphere": "宁静、充满希望",
  "props": ["办公桌", "百叶窗", "文件", "电脑"],
  "characterPositions": [
    { "character": "李明", "position": "坐在办公桌前" }
  ],
  "lighting": "自然光，从左侧窗户射入",
  "colorPalette": ["#F5E6D3", "#8B7355"],
  "imagePrompt": "现代办公室，清晨阳光，百叶窗光影，办公桌上有文件和电脑，一人坐在桌前，温暖色调，电影感",
  "consistency": {
    "baseSeed": 12345,
    "style": "modern_office"
  }
}
```

### 4.2 场景生成接口

```javascript
/**
 * 根据场景描述生成场景图像
 * @param {Object} params
 * @param {SceneDescription} params.description - 场景描述
 * @param {number} params.width - 图像宽度
 * @param {number} params.height - 图像高度
 * @returns {Promise<{imageUrl: string, seed: number}>}
 */
async function generateSceneImage({ description, width = 1920, height = 1080 })

// 请求示例
POST /api/v1/scene/generate
{
  "description": { /* 场景描述对象 */ },
  "width": 1920,
  "height": 1080
}

// 响应示例
{
  "imageUrl": "https://minio.example.com/scenes/office_001_shot1.png",
  "seed": 12345,
  "model": "wanx-v1",
  "generationTime": 8.5
}
```

### 4.3 场景查询接口

```javascript
/**
 * 查询场景库中的场景
 * @param {Object} params
 * @param {string} params.sceneId - 场景 ID
 * @param {string} params.style - 风格过滤
 * @returns {Promise<Scene[]>}
 */
async function queryScenes({ sceneId, style })

// 请求示例
GET /api/v1/scenes?sceneId=office_001

// 响应示例
{
  "scenes": [
    {
      "sceneId": "office_001",
      "location": "办公室",
      "thumbnailUrl": "https://minio.example.com/scenes/office_001_thumb.png",
      "createdAt": "2025-03-07T10:00:00Z"
    }
  ]
}
```

---

## 5. 场景数据结构

### 5.1 SceneDescription (场景描述)

```typescript
interface SceneDescription {
  sceneId: string;              // 场景唯一标识
  location: string;             // 地点
  time: string;                 // 时间
  atmosphere: string;           // 氛围
  props: string[];              // 道具列表
  characterPositions: CharacterPosition[];  // 人物位置
  lighting: string;             // 光影描述
  colorPalette: string[];       // 色彩方案 (HEX)
  imagePrompt: string;          // 图像生成提示词
  consistency: ConsistencyInfo; // 一致性信息
  metadata: SceneMetadata;      // 元数据
}

interface CharacterPosition {
  character: string;            // 角色名
  position: string;             // 位置描述
  action?: string;              // 动作（可选）
}

interface ConsistencyInfo {
  baseSeed: number;             // 基础种子值
  style: string;                // 风格标签
  version: string;              // 版本（用于迭代）
}

interface SceneMetadata {
  episodeId: string;            // 所属集数
  shotIds: string[];            // 关联镜头
  createdAt: string;            // 创建时间
  updatedAt: string;            // 更新时间
}
```

### 5.2 数据库 Schema (PostgreSQL)

```sql
-- 场景表
CREATE TABLE scenes (
  id SERIAL PRIMARY KEY,
  scene_id VARCHAR(50) UNIQUE NOT NULL,
  location VARCHAR(200) NOT NULL,
  time VARCHAR(100) NOT NULL,
  atmosphere TEXT,
  props JSONB,                  -- 道具数组
  character_positions JSONB,    -- 人物位置数组
  lighting TEXT,
  color_palette JSONB,          -- 色彩方案数组
  image_prompt TEXT NOT NULL,
  base_seed INTEGER,
  style VARCHAR(50),
  episode_id VARCHAR(50),
  shot_ids JSONB,
  thumbnail_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 场景图像表
CREATE TABLE scene_images (
  id SERIAL PRIMARY KEY,
  scene_id VARCHAR(50) REFERENCES scenes(scene_id),
  image_url TEXT NOT NULL,
  seed INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  model VARCHAR(50),
  generation_time FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_scenes_episode ON scenes(episode_id);
CREATE INDEX idx_scenes_style ON scenes(style);
CREATE INDEX idx_scene_images_scene ON scene_images(scene_id);
```

---

## 6. 提示词模板

### 6.1 场景分析提示词模板

```javascript
const SCENE_ANALYSIS_PROMPT = `
你是一位专业的影视场景分析师。请分析以下剧本/分镜描述，提取场景要素。

【输入】
{script}

【输出格式】
请严格按照以下 JSON 格式输出（不要输出其他内容）：
{
  "location": "地点描述",
  "time": "时间描述",
  "atmosphere": "氛围/情绪基调",
  "props": ["道具 1", "道具 2", "道具 3"],
  "characterPositions": [
    {"character": "角色名", "position": "位置描述", "action": "动作描述"}
  ],
  "lighting": "光影描述",
  "colorPalette": ["#主色 1", "#主色 2"],
  "imagePrompt": "用于图像生成的详细提示词（中文，包含地点、时间、氛围、道具、人物位置、光影、色彩风格）"
}

【要求】
1. 地点要具体（如"现代办公室"而非"室内"）
2. 时间要明确（如"黄昏"而非"傍晚时分"）
3. 氛围要用情绪词（如"紧张压抑"、"温馨浪漫"）
4. 道具只列出关键物品（3-5 个）
5. 人物位置要具体（如"坐在办公桌前，面对电脑"）
6. 光影要说明方向和性质（如"左侧窗户自然光，柔和"）
7. 色彩方案用 HEX 色值（2-3 个主色）
8. 图像提示词要详细，适合 AI 图像生成
`;
```

### 6.2 场景一致性提示词模板

```javascript
const CONSISTENCY_CHECK_PROMPT = `
你是场景一致性检查专家。请对比以下两个场景描述，判断是否一致。

【场景 A】（参考场景）
{referenceScene}

【场景 B】（新场景）
{newScene}

【检查维度】
1. 地点是否一致
2. 时间/光影是否连贯
3. 关键道具是否一致
4. 色彩风格是否统一
5. 人物位置是否合理

【输出格式】
{
  "isConsistent": true/false,
  "differences": ["差异点 1", "差异点 2"],
  "suggestions": ["修改建议 1", "修改建议 2"],
  "consistentElements": ["一致的元素 1", "一致的元素 2"]
}
`;
```

### 6.3 图像生成提示词模板

```javascript
const IMAGE_GENERATION_PROMPT = `
{location}，{time}，{atmosphere}。
场景中有：{props}。
人物位置：{characterPositions}。
光影效果：{lighting}。
色彩风格：{colorPalette}。
电影感，高细节，8K 分辨率，专业摄影。

负面提示词：模糊、低质量、变形、多余的手指、文字、水印
`;
```

---

## 7. 实现示例

### 7.1 场景分析器 (analyzer.js)

```javascript
const { QwenClient } = require('../clients/qwen');

class SceneAnalyzer {
  constructor() {
    this.qwenClient = new QwenClient();
  }

  async analyze(script, sceneId = null) {
    const prompt = this.buildAnalysisPrompt(script);
    
    const response = await this.qwenClient.chat({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: '你是专业的影视场景分析师。' },
        { role: 'user', content: prompt }
      ]
    });

    const analysis = JSON.parse(response.content);
    
    // 添加一致性信息
    if (sceneId) {
      const existingScene = await this.queryScene(sceneId);
      if (existingScene) {
        analysis.consistency = {
          baseSeed: existingScene.baseSeed,
          style: existingScene.style,
          version: this.incrementVersion(existingScene.version)
        };
      } else {
        analysis.consistency = {
          baseSeed: this.generateSeed(),
          style: this.detectStyle(analysis),
          version: '1.0'
        };
      }
    }

    return {
      sceneId: sceneId || this.generateSceneId(),
      ...analysis,
      metadata: {
        episodeId: this.extractEpisodeId(script),
        shotIds: [],
        createdAt: new Date().toISOString()
      }
    };
  }

  buildAnalysisPrompt(script) {
    return SCENE_ANALYSIS_PROMPT.replace('{script}', script);
  }

  generateSeed() {
    return Math.floor(Math.random() * 1000000);
  }

  generateSceneId() {
    return `scene_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  detectStyle(analysis) {
    // 根据场景要素自动识别风格
    if (analysis.location.includes('办公室')) return 'modern_office';
    if (analysis.location.includes('家')) return 'home_warm';
    if (analysis.atmosphere.includes('神秘')) return 'mystery_dark';
    return 'general';
  }

  incrementVersion(version) {
    const [major, minor] = version.split('.').map(Number);
    return `${major}.${minor + 1}`;
  }
}

module.exports = SceneAnalyzer;
```

---

## 8. 测试计划

### 8.1 单元测试
- [ ] 场景分析器 - 输入剧本，验证输出结构
- [ ] 一致性检查 - 对比相似场景，验证一致性判断
- [ ] 提示词生成 - 验证提示词格式正确

### 8.2 集成测试
- [ ] 完整流程：剧本 → 场景分析 → 图像生成
- [ ] 场景一致性：同一场景多次生成，验证视觉一致性
- [ ] 性能测试：并发 10 个场景生成任务

### 8.3 验收标准
- 场景分析准确率 > 90%
- 场景一致性评分 > 90%
- 单次分析耗时 < 5 秒
- 单次图像生成耗时 < 15 秒

---

## 9. 依赖与配置

### 9.1 依赖包
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "pg": "^8.11.0",
    "redis": "^4.6.0",
    "@alicloud/wanx": "^1.0.0"
  }
}
```

### 9.2 环境变量
```bash
# 阿里通义千问
DASHSCOPE_API_KEY=your_api_key
QWEN_MODEL=qwen-plus

# 阿里通义万相
WANX_MODEL=wanx-v1

# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/drama_platform

# 对象存储
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=scenes

# Redis
REDIS_URL=redis://localhost:6379
```

---

## 10. 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2025-03-07 | 初始设计完成 |

---

## 11. 附录

### 11.1 场景示例

**输入剧本：**
```
场景：办公室 - 清晨
李明坐在办公桌前，阳光透过百叶窗洒在桌面上。
他拿起咖啡杯，轻轻喝了一口，开始查看电脑上的文件。
```

**输出场景描述：**
```json
{
  "sceneId": "office_001",
  "location": "现代办公室",
  "time": "清晨",
  "atmosphere": "宁静、充满希望",
  "props": ["办公桌", "百叶窗", "咖啡杯", "电脑", "文件"],
  "characterPositions": [
    {
      "character": "李明",
      "position": "坐在办公桌前",
      "action": "喝咖啡，查看电脑文件"
    }
  ],
  "lighting": "自然光，从左侧窗户透过百叶窗射入，形成条纹光影",
  "colorPalette": ["#F5E6D3", "#8B7355", "#2C3E50"],
  "imagePrompt": "现代办公室，清晨阳光，百叶窗光影条纹，办公桌上有白色咖啡杯、黑色电脑和文件，一人坐在桌前，温暖色调，电影感，高细节",
  "consistency": {
    "baseSeed": 12345,
    "style": "modern_office",
    "version": "1.0"
  }
}
```

---

**文档结束**
