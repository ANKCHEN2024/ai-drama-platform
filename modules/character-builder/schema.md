# 人物档案数据结构

## 核心数据结构

### Character (人物)

```typescript
interface Character {
  // 基础信息
  id: string;                    // 人物唯一标识，格式：char_xxx
  name: string;                  // 人物姓名
  alias?: string[];              // 别名/昵称
  age: number;                   // 年龄
  gender: '男' | '女' | '其他';  // 性别
  role: string;                  // 角色定位（主角/配角/反派等）
  
  // 外貌特征
  appearance: Appearance;
  
  // 性格特征
  personality: Personality;
  
  // 服装风格
  clothing: Clothing;
  
  // 人物关系
  relationships: Relationship[];
  
  // 一致性描述（用于视频生成）
  consistency: ConsistencyDescription;
  
  // 元数据
  metadata: {
    createdAt: string;           // ISO 8601 时间戳
    updatedAt: string;           // ISO 8601 时间戳
    source: string;              // 来源（故事文本/手动创建）
    confidence: number;          // 置信度 0-1
    version: number;             // 版本号
  };
}
```

---

### Appearance (外貌)

```typescript
interface Appearance {
  // 面部特征
  face: {
    shape: string;               // 脸型（圆脸/方脸/瓜子脸等）
    skinTone: string;            // 肤色（白皙/小麦色等）
    features: string;            // 五官描述
  };
  
  // 头发
  hair: {
    color: string;               // 发色
    length: string;              // 长度（长发/短发/中长发）
    style: string;               // 发型描述
    texture: string;             // 发质（直发/卷发）
  };
  
  // 眼睛
  eyes: {
    color: string;               // 瞳色
    shape: string;               // 眼型
    description: string;         // 详细描述
  };
  
  // 身材
  body: {
    height: string;              // 身高（如 "165cm"）
    build: string;               // 体型（匀称/苗条/健壮等）
    posture: string;             // 姿态描述
  };
  
  // 其他特征
  distinguishingFeatures: string[];  // 显著特征（痣、疤痕、纹身等）
  
  // 整体描述（用于 AI 生成）
  overallDescription: string;    // 完整外貌描述
}
```

---

### Personality (性格)

```typescript
interface Personality {
  // 性格标签
  traits: string[];              // 性格关键词数组
  
  // 详细描述
  description: string;           // 性格详细描述
  
  // MBTI 类型（可选）
  mbti?: string;                 // 如 "INTJ", "ENFP"
  
  // 行为模式
  behaviorPatterns: {
    speakingStyle: string;       // 说话风格
    reactionToStress: string;    // 压力下的反应
    socialBehavior: string;      // 社交行为
    decisionMaking: string;      // 决策方式
  };
  
  // 喜好
  likes: string[];               // 喜欢的事物
  dislikes: string[];            // 讨厌的事物
  
  // 动机
  motivations: {
    goal: string;                // 目标
    fear: string;                // 恐惧
    desire: string;              // 渴望
  };
  
  // 背景故事
  backstory?: string;            // 人物背景故事
}
```

---

### Clothing (服装)

```typescript
interface Clothing {
  // 整体风格
  style: string;                 // 服装风格（职业/休闲/运动等）
  
  // 常用颜色
  colors: string[];              // 常用颜色数组
  
  // 服装类型
  types: {
    casual: string;              // 休闲装描述
    formal: string;              // 正装描述
    work: string;                // 工作装描述
    special: string;             // 特殊场合服装
  };
  
  // 配饰
  accessories: string[];         // 常用配饰
  
  // 品牌偏好（可选）
  brandPreference?: string;      // 品牌偏好
  
  // 整体描述（用于 AI 生成）
  overallDescription: string;    // 完整服装描述
}
```

---

### Relationship (人物关系)

```typescript
interface Relationship {
  characterId: string;           // 关联人物 ID
  characterName: string;         // 关联人物姓名
  type: string;                  // 关系类型（好友/敌人/恋人/家人等）
  description: string;           // 关系详细描述
  intensity: number;             // 关系强度 1-10
  history?: string;              // 关系历史
  conflicts?: string[];          // 冲突点
  dynamics: string;              // 互动动态
}
```

---

### ConsistencyDescription (一致性描述)

```typescript
interface ConsistencyDescription {
  // 基础提示词
  prompt: string;                // 正向提示词（用于 AI 生成）
  negativePrompt: string;        // 负向提示词
  
  // 生成参数
  parameters: {
    seed?: number;               // 随机种子（固定以保证一致性）
    steps?: number;              // 生成步数
    cfg?: number;                // CFG scale
    sampler?: string;            // 采样器
  };
  
  // 场景变体
  variants: {
    office?: SceneVariant;       // 办公室场景
    home?: SceneVariant;         // 家庭场景
    outdoor?: SceneVariant;      // 户外场景
    night?: SceneVariant;        // 夜晚场景
    casual?: SceneVariant;       // 休闲场景
    formal?: SceneVariant;       // 正式场景
  };
  
  // 表情变体
  expressions: {
    neutral: string;             // 中性表情
    happy: string;               // 开心表情
    sad: string;                 // 悲伤表情
    angry: string;               // 愤怒表情
    surprised: string;           // 惊讶表情
    focused: string;             // 专注表情
  };
  
  // 镜头角度
  angles: {
    front: string;               // 正面
    side: string;                // 侧面
    back: string;                // 背面
    closeup: string;             // 特写
    medium: string;              // 中景
    full: string;                // 全身
  };
  
  // 质量标签
  qualityTags: string[];         // 质量相关标签
}
```

---

### SceneVariant (场景变体)

```typescript
interface SceneVariant {
  prompt: string;                // 场景提示词
  lighting: string;              // 光线描述
  background: string;            // 背景描述
  mood: string;                  // 氛围
}
```

---

## 示例数据

### 完整人物档案示例

```json
{
  "id": "char_001",
  "name": "林小雅",
  "alias": ["小雅", "林总监"],
  "age": 25,
  "gender": "女",
  "role": "主角",
  
  "appearance": {
    "face": {
      "shape": "瓜子脸",
      "skinTone": "白皙",
      "features": "五官精致，眉眼清秀"
    },
    "hair": {
      "color": "乌黑",
      "length": "长发",
      "style": "自然垂落",
      "texture": "直发"
    },
    "eyes": {
      "color": "深棕色",
      "shape": "杏仁眼",
      "description": "明亮有神，透着坚定"
    },
    "body": {
      "height": "165cm",
      "build": "匀称",
      "posture": "挺拔优雅"
    },
    "distinguishingFeatures": ["左耳下方有一颗小痣"],
    "overallDescription": "25 岁中国女性，瓜子脸，白皙皮肤，乌黑长直发自然垂落，深棕色杏仁眼明亮有神，五官精致，身材匀称，身高 165cm，姿态挺拔优雅"
  },
  
  "personality": {
    "traits": ["独立", "坚强", "温柔", "专业", "完美主义"],
    "description": "外表强势独立，内心温柔善良。工作上严谨专业，追求完美；生活中善解人意，关心他人。",
    "mbti": "ENTJ",
    "behaviorPatterns": {
      "speakingStyle": "语速适中，条理清晰，语气坚定但不失温和",
      "reactionToStress": "冷静分析，寻找解决方案，不轻易表露情绪",
      "socialBehavior": "社交场合得体大方，但更喜欢小圈子深度交流",
      "decisionMaking": "理性分析为主，兼顾情感因素"
    },
    "likes": ["阅读", "咖啡", "古典音乐", "徒步"],
    "dislikes": ["拖延", "不守信用", "嘈杂环境"],
    "motivations": {
      "goal": "成为行业顶尖的创意总监",
      "fear": "辜负团队信任",
      "desire": "创作出打动人心的作品"
    },
    "backstory": "出身普通家庭，靠自己的努力从基层做到总监位置。父亲早逝，与母亲相依为命。"
  },
  
  "clothing": {
    "style": "职业简约风",
    "colors": ["黑色", "白色", "灰色", "藏青色"],
    "types": {
      "casual": "简约 T 恤配牛仔裤，休闲但不失品味",
      "formal": "定制西装套裙，剪裁合体",
      "work": "职业衬衫配铅笔裙或西装裤",
      "special": "优雅晚礼服，简约大方"
    },
    "accessories": ["简约腕表", "珍珠耳钉", "细框眼镜"],
    "overallDescription": "职业简约风格，偏好黑白灰藏青等中性色，工作日常穿职业衬衫配铅笔裙或西装裤，配饰简约精致"
  },
  
  "relationships": [
    {
      "characterId": "char_002",
      "characterName": "张伟",
      "type": "好友/同事",
      "description": "多年同事兼好友，互相支持",
      "intensity": 8,
      "dynamics": "工作中默契配合，私下经常聚餐聊天"
    },
    {
      "characterId": "char_003",
      "characterName": "林母",
      "type": "母女",
      "description": "相依为命，感情深厚",
      "intensity": 10,
      "dynamics": "小雅非常孝顺，定期回家陪伴母亲"
    }
  ],
  
  "consistency": {
    "prompt": "一位 25 岁中国女性，瓜子脸，白皙皮肤，乌黑长直发，深棕色杏仁眼，五官精致，穿着职业装，气质优雅专业",
    "negativePrompt": "卡通，动漫，低质量，模糊，变形，夸张，美颜过度",
    "parameters": {
      "seed": 12345,
      "steps": 30,
      "cfg": 7.5,
      "sampler": "DPM++ 2M Karras"
    },
    "variants": {
      "office": {
        "prompt": "坐在现代化办公室桌前，电脑屏幕前工作",
        "lighting": "自然光从落地窗照入",
        "background": "简洁的办公环境，绿植点缀",
        "mood": "专业专注"
      },
      "home": {
        "prompt": "温馨的居家环境，坐在沙发上",
        "lighting": "柔和的暖色灯光",
        "background": "简约客厅，书架背景",
        "mood": "放松舒适"
      },
      "outdoor": {
        "prompt": "城市街道或公园",
        "lighting": "自然日光",
        "background": "都市景观或绿树成荫",
        "mood": "轻松自在"
      },
      "night": {
        "prompt": "夜晚场景，城市夜景",
        "lighting": "霓虹灯和路灯",
        "background": "城市夜景",
        "mood": "神秘浪漫"
      },
      "casual": {
        "prompt": "休闲装扮，周末场景",
        "lighting": "自然光",
        "background": "咖啡厅或书店",
        "mood": "轻松惬意"
      },
      "formal": {
        "prompt": "正式场合，商务会议或晚宴",
        "lighting": "室内灯光",
        "background": "高档酒店或会议中心",
        "mood": "庄重优雅"
      }
    },
    "expressions": {
      "neutral": "表情平静，眼神专注",
      "happy": "微笑，眼角微弯，温暖亲切",
      "sad": "眉头微蹙，眼神略显忧伤",
      "angry": "眉头紧锁，眼神坚定有力",
      "surprised": "眼睛微睁，眉毛上扬",
      "focused": "眼神专注，表情认真"
    },
    "angles": {
      "front": "正面视角，完整面部",
      "side": "侧面 45 度，展现轮廓",
      "back": "背面视角，展现发型和姿态",
      "closeup": "面部特写，突出表情",
      "medium": "中景，上半身",
      "full": "全身镜头，展现整体造型"
    },
    "qualityTags": [
      "photorealistic",
      "8k",
      "highly detailed",
      "professional photography",
      "cinematic lighting"
    ]
  },
  
  "metadata": {
    "createdAt": "2025-03-07T12:00:00.000Z",
    "updatedAt": "2025-03-07T12:00:00.000Z",
    "source": "story_text_analysis",
    "confidence": 0.92,
    "version": 1
  }
}
```

---

## 数据库 Schema (PostgreSQL)

```sql
-- 人物表
CREATE TABLE characters (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  alias TEXT[],
  age INTEGER,
  gender VARCHAR(20),
  role VARCHAR(50),
  appearance JSONB NOT NULL,
  personality JSONB NOT NULL,
  clothing JSONB NOT NULL,
  relationships JSONB,
  consistency JSONB NOT NULL,
  metadata JSONB,
  project_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_characters_project ON characters(project_id);
CREATE INDEX idx_characters_name ON characters(name);
CREATE INDEX idx_characters_role ON characters(role);

-- 人物关系表（可选，用于复杂关系网络）
CREATE TABLE character_relationships (
  id SERIAL PRIMARY KEY,
  character_id_1 VARCHAR(50) REFERENCES characters(id),
  character_id_2 VARCHAR(50) REFERENCES characters(id),
  relationship_type VARCHAR(50),
  description TEXT,
  intensity INTEGER CHECK (intensity BETWEEN 1 AND 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(character_id_1, character_id_2)
);
```

---

## 数据验证规则

```javascript
const characterSchema = {
  type: 'object',
  required: ['id', 'name', 'age', 'gender', 'appearance', 'personality', 'clothing', 'consistency'],
  properties: {
    id: { type: 'string', pattern: '^char_[a-zA-Z0-9]+$' },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    age: { type: 'integer', minimum: 0, maximum: 150 },
    gender: { type: 'string', enum: ['男', '女', '其他'] },
    appearance: { type: 'object', required: ['overallDescription'] },
    personality: { type: 'object', required: ['traits', 'description'] },
    clothing: { type: 'object', required: ['style', 'overallDescription'] },
    consistency: { type: 'object', required: ['prompt', 'negativePrompt'] }
  }
};
```
