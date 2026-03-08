# 📊 场景构建模块 - 数据结构定义

## 1. 核心数据结构

### 1.1 SceneDescription (场景描述)

**描述**: 完整的场景描述对象，包含所有场景要素

```typescript
interface SceneDescription {
  // 基础信息
  sceneId: string;              // 场景唯一标识符
  episodeId?: string;           // 所属集数 ID（可选）
  
  // 场景五要素
  location: string;             // 地点（如："现代办公室"）
  time: string;                 // 时间（如："清晨"、"夜晚"）
  atmosphere: string;           // 氛围/情绪基调（如："宁静、充满希望"）
  props: string[];              // 道具列表（如：["办公桌", "百叶窗", "咖啡杯"]）
  characterPositions: CharacterPosition[];  // 人物位置数组
  
  // 视觉要素
  lighting: string;             // 光影描述（如："自然光，从左侧窗户射入"）
  colorPalette: string[];       // 色彩方案 HEX 数组（如：["#F5E6D3", "#8B7355"]）
  
  // 生成要素
  imagePrompt: string;          // 图像生成提示词（详细中文描述）
  negativePrompt?: string;      // 负面提示词（可选）
  
  // 一致性信息
  consistency: ConsistencyInfo; // 一致性维护信息
  
  // 元数据
  metadata: SceneMetadata;      // 元数据（时间戳、版本等）
}
```

---

### 1.2 CharacterPosition (人物位置)

**描述**: 描述场景中人物的位置和动作

```typescript
interface CharacterPosition {
  character: string;      // 角色名称（如："李明"）
  position: string;       // 位置描述（如："坐在办公桌前"）
  action?: string;        // 动作描述（如："喝咖啡，查看文件"）
  facing?: string;        // 朝向（如："面向窗户"）
  expression?: string;    // 表情（如："专注"）
  clothing?: string;      // 服装（如："白色衬衫"）
}
```

**示例**:
```json
{
  "character": "李明",
  "position": "坐在办公桌前",
  "action": "拿起咖啡杯，轻轻喝了一口",
  "facing": "面向电脑屏幕",
  "expression": "专注",
  "clothing": "白色衬衫，深色西装"
}
```

---

### 1.3 ConsistencyInfo (一致性信息)

**描述**: 用于维护场景视觉一致性的控制信息

```typescript
interface ConsistencyInfo {
  baseSeed: number;       // 基础种子值（固定，确保同一场景生成一致）
  style: string;          // 风格标签（如："modern_office", "home_warm"）
  version: string;        // 版本号（如："1.0", "1.1"）
  
  // 高级控制（可选）
  colorLock?: boolean;    // 是否锁定色彩方案
  propLock?: boolean;     // 是否锁定关键道具
  lightingLock?: boolean; // 是否锁定光影方向
}
```

**示例**:
```json
{
  "baseSeed": 12345,
  "style": "modern_office",
  "version": "1.0",
  "colorLock": true,
  "propLock": true,
  "lightingLock": false
}
```

---

### 1.4 SceneMetadata (元数据)

**描述**: 场景的元数据信息

```typescript
interface SceneMetadata {
  shotIds: string[];      // 关联的镜头 ID 数组
  createdAt: string;      // 创建时间（ISO 8601）
  updatedAt: string;      // 更新时间（ISO 8601）
  createdBy?: string;     // 创建者（可选）
  updatedBy?: string;     // 更新者（可选）
  status: SceneStatus;    // 场景状态
  tags?: string[];        // 标签数组（可选）
}

type SceneStatus = 'draft' | 'active' | 'archived' | 'deleted';
```

---

## 2. 数据库 Schema

### 2.1 场景表 (scenes)

```sql
CREATE TABLE scenes (
  -- 主键
  id SERIAL PRIMARY KEY,
  
  -- 标识符
  scene_id VARCHAR(50) UNIQUE NOT NULL,
  episode_id VARCHAR(50),
  
  -- 场景五要素
  location VARCHAR(200) NOT NULL,
  time VARCHAR(100) NOT NULL,
  atmosphere TEXT,
  props JSONB DEFAULT '[]',              -- 道具数组
  character_positions JSONB DEFAULT '[]', -- 人物位置数组
  
  -- 视觉要素
  lighting TEXT,
  color_palette JSONB DEFAULT '[]',      -- 色彩方案数组
  
  -- 生成要素
  image_prompt TEXT NOT NULL,
  negative_prompt TEXT,
  
  -- 一致性信息
  base_seed INTEGER,
  style VARCHAR(50),
  version VARCHAR(20) DEFAULT '1.0',
  
  -- 元数据
  shot_ids JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'draft',
  tags JSONB DEFAULT '[]',
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX idx_scenes_episode_id ON scenes(episode_id);
CREATE INDEX idx_scenes_style ON scenes(style);
CREATE INDEX idx_scenes_location ON scenes(location);
CREATE INDEX idx_scenes_status ON scenes(status);
CREATE INDEX idx_scenes_created_at ON scenes(created_at);
CREATE INDEX idx_scenes_tags ON scenes USING GIN(tags);

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scenes_updated_at
  BEFORE UPDATE ON scenes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### 2.2 场景图像表 (scene_images)

```sql
CREATE TABLE scene_images (
  -- 主键
  id SERIAL PRIMARY KEY,
  
  -- 外键
  scene_id VARCHAR(50) REFERENCES scenes(scene_id) ON DELETE CASCADE,
  
  -- 图像信息
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- 生成参数
  seed INTEGER NOT NULL,
  width INTEGER DEFAULT 1920,
  height INTEGER DEFAULT 1080,
  model VARCHAR(50) DEFAULT 'wanx-v1',
  negative_prompt TEXT,
  
  -- 生成统计
  generation_time FLOAT,  -- 生成耗时（秒）
  cost DECIMAL(10, 4),    -- 生成成本
  
  -- 元数据
  status VARCHAR(20) DEFAULT 'completed',  -- completed, failed, processing
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_scene_images_scene_id ON scene_images(scene_id);
CREATE INDEX idx_scene_images_status ON scene_images(status);
CREATE INDEX idx_scene_images_created_at ON scene_images(created_at);
```

---

### 2.3 场景历史表 (scene_history)

**描述**: 记录场景的变更历史（用于版本追溯）

```sql
CREATE TABLE scene_history (
  -- 主键
  id SERIAL PRIMARY KEY,
  
  -- 关联
  scene_id VARCHAR(50) NOT NULL,
  
  -- 变更内容
  change_type VARCHAR(20) NOT NULL,  -- created, updated, deleted
  changed_fields JSONB,              -- 变更的字段（旧值 -> 新值）
  snapshot JSONB,                    -- 完整快照
  
  -- 变更者
  changed_by VARCHAR(100),
  
  -- 时间戳
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_scene_history_scene_id ON scene_history(scene_id);
CREATE INDEX idx_scene_history_changed_at ON scene_history(changed_at);
```

---

## 3. Redis 缓存结构

### 3.1 场景缓存

```
Key: scene:{sceneId}
Type: Hash
TTL: 3600s (1 小时)

Fields:
  - data: JSON 字符串（完整场景描述）
  - version: 版本号
  - accessed_at: 最后访问时间戳
```

### 3.2 场景列表缓存

```
Key: scenes:episode:{episodeId}
Type: List
TTL: 1800s (30 分钟)

Value: 场景 ID 数组
```

### 3.3 热点场景缓存

```
Key: scene:hot:{style}
Type: Sorted Set
TTL: 900s (15 分钟)

Member: 场景 ID
Score: 访问次数
```

---

## 4. 数据验证规则

### 4.1 SceneDescription 验证

```javascript
const SceneDescriptionSchema = {
  sceneId: {
    type: 'string',
    required: true,
    pattern: /^[a-z0-9_]+$/,
    minLength: 5,
    maxLength: 50
  },
  
  location: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 200
  },
  
  time: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100
  },
  
  atmosphere: {
    type: 'string',
    required: false,
    maxLength: 500
  },
  
  props: {
    type: 'array',
    required: false,
    maxItems: 20,
    items: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    }
  },
  
  characterPositions: {
    type: 'array',
    required: false,
    maxItems: 10,
    items: {
      type: 'object',
      properties: {
        character: { type: 'string', required: true },
        position: { type: 'string', required: true },
        action: { type: 'string' },
        facing: { type: 'string' },
        expression: { type: 'string' },
        clothing: { type: 'string' }
      }
    }
  },
  
  lighting: {
    type: 'string',
    required: false,
    maxLength: 500
  },
  
  colorPalette: {
    type: 'array',
    required: false,
    maxItems: 5,
    items: {
      type: 'string',
      pattern: /^#[0-9A-Fa-f]{6}$/
    }
  },
  
  imagePrompt: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 2000
  },
  
  consistency: {
    type: 'object',
    required: true,
    properties: {
      baseSeed: { type: 'number', required: true },
      style: { type: 'string', required: true },
      version: { type: 'string', required: true }
    }
  }
};
```

---

## 5. 数据转换示例

### 5.1 从 API 请求到数据库

```javascript
// API 请求体
const apiRequest = {
  script: "清晨，李明坐在办公室里...",
  sceneId: "office_001",
  episodeId: "ep_001"
};

// 分析后的场景描述
const sceneDescription = {
  sceneId: "office_001",
  location: "现代办公室",
  time: "清晨",
  atmosphere: "宁静、充满希望",
  props: ["办公桌", "百叶窗", "咖啡杯", "电脑"],
  characterPositions: [
    {
      character: "李明",
      position: "坐在办公桌前",
      action: "喝咖啡"
    }
  ],
  lighting: "自然光，从左侧窗户透过百叶窗射入",
  colorPalette: ["#F5E6D3", "#8B7355", "#2C3E50"],
  imagePrompt: "现代办公室，清晨阳光...",
  consistency: {
    baseSeed: 12345,
    style: "modern_office",
    version: "1.0"
  }
};

// 转换为数据库记录
const dbRecord = {
  scene_id: sceneDescription.sceneId,
  episode_id: sceneDescription.episodeId || null,
  location: sceneDescription.location,
  time: sceneDescription.time,
  atmosphere: sceneDescription.atmosphere,
  props: JSON.stringify(sceneDescription.props),
  character_positions: JSON.stringify(sceneDescription.characterPositions),
  lighting: sceneDescription.lighting,
  color_palette: JSON.stringify(sceneDescription.colorPalette),
  image_prompt: sceneDescription.imagePrompt,
  base_seed: sceneDescription.consistency.baseSeed,
  style: sceneDescription.consistency.style,
  version: sceneDescription.consistency.version,
  status: 'active'
};
```

### 5.2 从数据库到 API 响应

```javascript
// 数据库查询结果
const dbRow = {
  scene_id: "office_001",
  location: "现代办公室",
  time: "清晨",
  atmosphere: "宁静、充满希望",
  props: '["办公桌", "百叶窗", "咖啡杯"]',
  character_positions: '[{"character":"李明","position":"坐在办公桌前"}]',
  lighting: "自然光，从左侧窗户射入",
  color_palette: '["#F5E6D3", "#8B7355"]',
  image_prompt: "现代办公室，清晨阳光...",
  base_seed: 12345,
  style: "modern_office",
  version: "1.0",
  created_at: "2025-03-07T10:00:00Z",
  updated_at: "2025-03-07T10:00:00Z"
};

// 转换为 API 响应
const apiResponse = {
  sceneId: dbRow.scene_id,
  location: dbRow.location,
  time: dbRow.time,
  atmosphere: dbRow.atmosphere,
  props: JSON.parse(dbRow.props),
  characterPositions: JSON.parse(dbRow.character_positions),
  lighting: dbRow.lighting,
  colorPalette: JSON.parse(dbRow.color_palette),
  imagePrompt: dbRow.image_prompt,
  consistency: {
    baseSeed: dbRow.base_seed,
    style: dbRow.style,
    version: dbRow.version
  },
  metadata: {
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
    status: 'active',
    shotIds: []
  }
};
```

---

## 6. 数据枚举定义

### 6.1 场景风格枚举

```typescript
enum SceneStyle {
  MODERN_OFFICE = 'modern_office',      // 现代办公室
  HOME_WARM = 'home_warm',              // 温馨家居
  MYSTERY_DARK = 'mystery_dark',        // 神秘黑暗
  ROMANTIC_SOFT = 'romantic_soft',      // 浪漫柔和
  ACTION_DYNAMIC = 'action_dynamic',    // 动作动态
  HORROR_GLOOMY = 'horror_gloomy',      // 恐怖阴森
  COMEDY_BRIGHT = 'comedy_bright',      // 喜剧明亮
  SCI_FI_FUTURISTIC = 'sci_fi_futuristic' // 科幻未来
}
```

### 6.2 时间段枚举

```typescript
enum TimePeriod {
  DAWN = 'dawn',           // 黎明
  MORNING = 'morning',     // 早晨
  NOON = 'noon',           // 中午
  AFTERNOON = 'afternoon', // 下午
  DUSK = 'dusk',           // 黄昏
  EVENING = 'evening',     // 傍晚
  NIGHT = 'night',         // 夜晚
  MIDNIGHT = 'midnight'    // 深夜
}
```

### 6.3 光影类型枚举

```typescript
enum LightingType {
  NATURAL_LEFT = 'natural_left',       // 自然光（左）
  NATURAL_RIGHT = 'natural_right',     // 自然光（右）
  NATURAL_FRONT = 'natural_front',     // 自然光（前）
  NATURAL_BACK = 'natural_back',       // 自然光（逆光）
  ARTIFICIAL_WARM = 'artificial_warm', // 人造暖光
  ARTIFICIAL_COOL = 'artificial_cool', // 人造冷光
  DRAMATIC_SIDELIGHT = 'dramatic_sidelight', // 戏剧侧光
  SOFT_DIFFUSED = 'soft_diffused'      // 柔和漫射光
}
```

---

## 7. 数据示例

### 7.1 完整场景示例

```json
{
  "sceneId": "office_001",
  "episodeId": "ep_001",
  "location": "现代办公室",
  "time": "清晨",
  "atmosphere": "宁静、充满希望",
  "props": [
    "办公桌",
    "百叶窗",
    "白色咖啡杯",
    "黑色电脑显示器",
    "文件堆"
  ],
  "characterPositions": [
    {
      "character": "李明",
      "position": "坐在办公桌前",
      "action": "拿起咖啡杯，轻轻喝了一口，开始查看电脑上的文件",
      "facing": "面向电脑屏幕",
      "expression": "专注",
      "clothing": "白色衬衫，深色西装外套"
    }
  ],
  "lighting": "自然光，从左侧窗户透过百叶窗射入，形成条纹光影，柔和温暖",
  "colorPalette": [
    "#F5E6D3",
    "#8B7355",
    "#2C3E50"
  ],
  "imagePrompt": "现代办公室，清晨阳光，百叶窗光影条纹，办公桌上有白色咖啡杯、黑色电脑显示器和文件堆，一人坐在桌前，穿着白色衬衫和深色西装，专注表情，温暖色调，电影感，高细节，8K 分辨率，专业摄影",
  "negativePrompt": "模糊、低质量、变形、多余的手指、文字、水印、噪点",
  "consistency": {
    "baseSeed": 12345,
    "style": "modern_office",
    "version": "1.0",
    "colorLock": true,
    "propLock": true,
    "lightingLock": false
  },
  "metadata": {
    "shotIds": ["shot_001", "shot_002", "shot_003"],
    "createdAt": "2025-03-07T10:00:00Z",
    "updatedAt": "2025-03-07T10:05:00Z",
    "status": "active",
    "tags": ["办公室", "清晨", "主角登场"]
  }
}
```

---

**文档结束**
