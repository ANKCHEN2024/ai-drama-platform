# 转场效果库

**版本：** v1.0  
**最后更新：** 2026-03-07  

---

## 1. 效果总览

### 1.1 支持的转场效果

| 编号 | 名称 | FFmpeg 滤镜 | 时长 | 适用场景 | 预览 |
|------|------|-------------|------|----------|------|
| 01 | 淡入淡出 | `fade` | 0.3-1.0s | 通用场景 | 🟢 |
| 02 | 圆形擦除 | `circlecrop` | 0.5-0.8s | 场景切换 | 🟢 |
| 03 | 左擦除 | `wipeleft` | 0.3-0.6s | 时间流逝 | 🟢 |
| 04 | 右擦除 | `wiperight` | 0.3-0.6s | 时间流逝 | 🟢 |
| 05 | 左滑动 | `slidyleft` | 0.2-0.5s | 快节奏 | 🟢 |
| 06 | 右滑动 | `slideright` | 0.2-0.5s | 快节奏 | 🟢 |
| 07 | 上滑动 | `slideup` | 0.3-0.6s | 场景转换 | 🟢 |
| 08 | 下滑动 | `slidedown` | 0.3-0.6s | 场景转换 | 🟢 |
| 09 | 圆形展开 | `circleopen` | 0.5-0.8s | 聚焦效果 | 🟢 |
| 10 | 矩形展开 | `rectopen` | 0.5-0.8s | 聚焦效果 | 🟢 |
| 11 | 水平切片 | `hlslice` | 0.3-0.6s | 动态效果 | 🟢 |
| 12 | 垂直切片 | `vlslice` | 0.3-0.6s | 动态效果 | 🟢 |
| 13 | 溶解 | `dissolve` | 0.5-1.0s | 梦幻效果 | 🟢 |
| 14 | 像素化 | `pixelize` | 0.5-0.8s | 科技感 | 🟢 |
| 15 | 径向擦除 | `radial` | 0.5-0.8s | 特殊效果 | 🟢 |

---

## 2. 效果详解

### 2.1 淡入淡出 (Fade)

**效果描述：** 前一个画面逐渐变暗，后一个画面逐渐变亮

**FFmpeg 命令：**
```bash
[0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5
```

**参数：**
- `duration`: 转场持续时间（推荐 0.3-1.0 秒）
- `offset`: 转场开始时间（第一个视频结束前）

**适用场景：**
- ✅ 日常对话场景
- ✅ 情感戏份
- ✅ 回忆片段
- ✅ 开场/结尾

**效果预览生成：**
```bash
ffmpeg -f lavfi -i color=c=red:s=1920x1080:d=5 \
       -f lavfi -i color=c=blue:s=1920x1080:d=5 \
       -filter_complex "[0:v][1:v]xfade=transition=fade:duration=1:offset=4[outv]" \
       -map "[outv]" -t 10 preview_fade.mp4
```

---

### 2.2 圆形擦除 (Circlecrop)

**效果描述：** 从一个圆形逐渐扩大到全屏

**FFmpeg 命令：**
```bash
[0:v][1:v]xfade=transition=circlecrop:duration=0.5:offset=4.5:direction=right
```

**参数：**
- `direction`: 擦除方向（right/left）

**适用场景：**
- ✅ 场景切换
- ✅ 地点转换
- ✅ 时间跳跃
- ✅ 章节分隔

---

### 2.3 擦除效果 (Wipe)

**左擦除：**
```bash
[0:v][1:v]xfade=transition=wipeleft:duration=0.5:offset=4.5
```

**右擦除：**
```bash
[0:v][1:v]xfade=transition=wiperight:duration=0.5:offset=4.5
```

**适用场景：**
- ✅ 时间流逝（左擦除）
- ✅ 倒叙回忆（右擦除）
- ✅ 新闻风格转场

---

### 2.4 滑动效果 (Slide)

**左滑动：**
```bash
[0:v][1:v]xfade=transition=slidyleft:duration=0.3:offset=4.5
```

**右滑动：**
```bash
[0:v][1:v]xfade=transition=slideright:duration=0.3:offset=4.5
```

**上滑动：**
```bash
[0:v][1:v]xfade=transition=slideup:duration=0.3:offset=4.5
```

**下滑动：**
```bash
[0:v][1:v]xfade=transition=slidedown:duration=0.3:offset=4.5
```

**适用场景：**
- ✅ 快节奏剪辑
- ✅ 动作场景
- ✅ 多画面展示
- ✅ 幻灯片效果

---

### 2.5 展开效果 (Open)

**圆形展开：**
```bash
[0:v][1:v]xfade=transition=circleopen:duration=0.5:offset=4.5
```

**矩形展开：**
```bash
[0:v][1:v]xfade=transition=rectopen:duration=0.5:offset=4.5
```

**适用场景：**
- ✅ 聚焦特定物体
- ✅ 引入新角色
- ✅ 强调重要信息

---

### 2.6 切片效果 (Slice)

**水平切片：**
```bash
[0:v][1:v]xfade=transition=hlslice:duration=0.3:offset=4.5:direction=right
```

**垂直切片：**
```bash
[0:v][1:v]xfade=transition=vlslice:duration=0.3:offset=4.5:direction=down
```

**适用场景：**
- ✅ 科技感场景
- ✅ 数据分析展示
- ✅ 现代都市题材

---

### 2.7 溶解 (Dissolve)

**效果描述：** 两个画面短暂重叠，产生梦幻效果

**FFmpeg 命令：**
```bash
[0:v][1:v]xfade=transition=dissolve:duration=0.8:offset=4.5
```

**适用场景：**
- ✅ 梦境场景
- ✅ 回忆片段
- ✅ 情感高潮
- ✅ 时间流逝（长时间溶解）

---

### 2.8 像素化 (Pixelize)

**效果描述：** 画面逐渐像素化后转换

**FFmpeg 命令：**
```bash
[0:v][1:v]xfade=transition=pixelize:duration=0.5:offset=4.5
```

**适用场景：**
- ✅ 科技/科幻题材
- ✅ 游戏风格
- ✅ 数字化场景
- ✅ 虚拟现实

---

### 2.9 径向擦除 (Radial)

**效果描述：** 从中心向外辐射状擦除

**FFmpeg 命令：**
```bash
[0:v][1:v]xfade=transition=radial:duration=0.5:offset=4.5:direction=right
```

**适用场景：**
- ✅ 特殊效果
- ✅ 强调转折
- ✅ 创意视频

---

## 3. 转场配置模板

### 3.1 预设配置

```json
{
  "presets": {
    "default": {
      "name": "默认",
      "transition": "fade",
      "duration": 0.5,
      "description": "标准淡入淡出，适用于大多数场景"
    },
    "scene_change": {
      "name": "场景切换",
      "transition": "circlecrop",
      "duration": 0.7,
      "description": "圆形擦除，适合场景/地点转换"
    },
    "time_skip": {
      "name": "时间跳跃",
      "transition": "wipeleft",
      "duration": 0.3,
      "description": "快速左擦除，表示时间流逝"
    },
    "flashback": {
      "name": "回忆",
      "transition": "dissolve",
      "duration": 1.0,
      "description": "溶解效果，用于回忆/梦境"
    },
    "action": {
      "name": "动作",
      "transition": "slidyleft",
      "duration": 0.2,
      "description": "快速滑动，适合快节奏场景"
    },
    "focus": {
      "name": "聚焦",
      "transition": "circleopen",
      "duration": 0.6,
      "description": "圆形展开，聚焦重要内容"
    },
    "tech": {
      "name": "科技",
      "transition": "pixelize",
      "duration": 0.5,
      "description": "像素化效果，科技/科幻场景"
    }
  }
}
```

### 3.2 转场管理类

```javascript
// transition_manager.js

class TransitionManager {
  constructor() {
    this.presets = {
      default: { transition: 'fade', duration: 0.5 },
      scene_change: { transition: 'circlecrop', duration: 0.7 },
      time_skip: { transition: 'wipeleft', duration: 0.3 },
      flashback: { transition: 'dissolve', duration: 1.0 },
      action: { transition: 'slidyleft', duration: 0.2 },
      focus: { transition: 'circleopen', duration: 0.6 },
      tech: { transition: 'pixelize', duration: 0.5 }
    };
  }

  /**
   * 生成 FFmpeg 转场滤镜字符串
   * @param {string} input1 - 第一个输入标签 [0:v]
   * @param {string} input2 - 第二个输入标签 [1:v]
   * @param {string} output - 输出标签 [v01]
   * @param {string} type - 转场类型
   * @param {number} duration - 转场时长
   * @param {number} offset - 转场开始时间
   * @param {string} direction - 方向（可选）
   */
  generateFilter(input1, input2, output, type, duration, offset, direction = null) {
    let filter = `[${input1}][${input2}]xfade=transition=${type}:duration=${duration}:offset=${offset}`;
    
    if (direction) {
      filter += `:direction=${direction}`;
    }
    
    filter += `[${output}]`;
    return filter;
  }

  /**
   * 使用预设生成滤镜
   */
  generateFromPreset(input1, input2, output, presetName, offset) {
    const preset = this.presets[presetName] || this.presets.default;
    return this.generateFilter(input1, input2, output, preset.transition, preset.duration, offset);
  }

  /**
   * 生成多片段转场链
   * @param {number} clipCount - 视频片段数量
   * @param {Array} transitions - 转场配置数组
   * @param {Array} durations - 各片段时长
   */
  generateChain(clipCount, transitions, durations) {
    const filters = [];
    let offset = durations[0] - transitions[0].duration;
    
    for (let i = 0; i < clipCount - 1; i++) {
      const input1 = i === 0 ? '0:v' : `v${i-1}1`;
      const input2 = `${i + 1}:v`;
      const output = `v${i}1`;
      
      const t = transitions[i] || this.presets.default;
      const filter = this.generateFilter(
        input1, input2, output,
        t.transition, t.duration, offset,
        t.direction
      );
      
      filters.push(filter);
      offset += durations[i + 1] - t.duration;
    }
    
    return filters.join(';');
  }

  /**
   * 获取所有可用转场列表
   */
  getAvailableTransitions() {
    return [
      { name: 'fade', label: '淡入淡出', category: 'basic' },
      { name: 'circlecrop', label: '圆形擦除', category: 'wipe' },
      { name: 'wipeleft', label: '左擦除', category: 'wipe' },
      { name: 'wiperight', label: '右擦除', category: 'wipe' },
      { name: 'slidyleft', label: '左滑动', category: 'slide' },
      { name: 'slideright', label: '右滑动', category: 'slide' },
      { name: 'slideup', label: '上滑动', category: 'slide' },
      { name: 'slidedown', label: '下滑动', category: 'slide' },
      { name: 'circleopen', label: '圆形展开', category: 'open' },
      { name: 'rectopen', label: '矩形展开', category: 'open' },
      { name: 'hlslice', label: '水平切片', category: 'slice' },
      { name: 'vlslice', label: '垂直切片', category: 'slice' },
      { name: 'dissolve', label: '溶解', category: 'special' },
      { name: 'pixelize', label: '像素化', category: 'special' },
      { name: 'radial', label: '径向擦除', category: 'special' }
    ];
  }
}

module.exports = TransitionManager;
```

---

## 4. 智能转场推荐

### 4.1 基于场景的推荐算法

```javascript
// transition_recommender.js

class TransitionRecommender {
  constructor() {
    this.rules = [
      {
        condition: (scene) => scene.type === 'dialogue',
        recommendation: { transition: 'fade', duration: 0.5 },
        reason: '对话场景使用柔和转场'
      },
      {
        condition: (scene) => scene.type === 'action',
        recommendation: { transition: 'slidyleft', duration: 0.2 },
        reason: '动作场景使用快速转场'
      },
      {
        condition: (scene) => scene.type === 'flashback',
        recommendation: { transition: 'dissolve', duration: 1.0 },
        reason: '回忆场景使用溶解效果'
      },
      {
        condition: (scene) => scene.type === 'location_change',
        recommendation: { transition: 'circlecrop', duration: 0.7 },
        reason: '地点转换使用圆形擦除'
      },
      {
        condition: (scene) => scene.type === 'time_skip',
        recommendation: { transition: 'wipeleft', duration: 0.3 },
        reason: '时间跳跃使用擦除效果'
      },
      {
        condition: (scene) => scene.type === 'tech',
        recommendation: { transition: 'pixelize', duration: 0.5 },
        reason: '科技场景使用像素化'
      },
      {
        condition: (scene) => scene.emotion === 'intense',
        recommendation: { transition: 'slidyleft', duration: 0.2 },
        reason: '紧张情绪使用快速转场'
      },
      {
        condition: (scene) => scene.emotion === 'calm',
        recommendation: { transition: 'fade', duration: 0.8 },
        reason: '平静情绪使用慢速淡入淡出'
      }
    ];
  }

  /**
   * 根据场景信息推荐转场
   * @param {Object} scene - 场景信息
   * @returns {Object} 推荐的转场配置
   */
  recommend(scene) {
    for (const rule of this.rules) {
      if (rule.condition(scene)) {
        return {
          ...rule.recommendation,
          reason: rule.reason
        };
      }
    }
    
    // 默认推荐
    return {
      transition: 'fade',
      duration: 0.5,
      reason: '使用默认转场'
    };
  }

  /**
   * 批量推荐
   */
  recommendAll(scenes) {
    return scenes.map((scene, index) => ({
      index,
      ...this.recommend(scene)
    }));
  }
}

// 使用示例
const recommender = new TransitionRecommender();

const scenes = [
  { type: 'dialogue', emotion: 'calm' },
  { type: 'location_change' },
  { type: 'action', emotion: 'intense' },
  { type: 'flashback' }
];

const recommendations = recommender.recommendAll(scenes);
console.log(recommendations);
```

---

## 5. 转场效果预览生成

### 5.1 批量预览生成脚本

```bash
#!/bin/bash
# generate_all_previews.sh

OUTPUT_DIR="./previews"
mkdir -p "$OUTPUT_DIR"

TRANSITIONS=(
  "fade"
  "circlecrop"
  "wipeleft"
  "wiperight"
  "slidyleft"
  "slideright"
  "slideup"
  "slidedown"
  "circleopen"
  "rectopen"
  "hlslice"
  "vlslice"
  "dissolve"
  "pixelize"
  "radial"
)

echo "开始生成转场效果预览..."

for transition in "${TRANSITIONS[@]}"; do
  echo "生成 $transition 预览..."
  
  ffmpeg -y \
    -f lavfi -i color=c=#FF6B6B:s=1920x1080:d=5 \
    -f lavfi -i color=c=#4ECDC4:s=1920x1080:d=5 \
    -filter_complex "[0:v][1:v]xfade=transition=$transition:duration=1:offset=4[outv]" \
    -map "[outv]" \
    -t 10 \
    "$OUTPUT_DIR/preview_$transition.mp4"
done

echo "所有预览生成完成！输出目录：$OUTPUT_DIR"
```

### 5.2 预览页面 HTML

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>转场效果预览</title>
  <style>
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .card { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
    .card video { width: 100%; }
    .card-title { padding: 10px; text-align: center; font-weight: bold; }
  </style>
</head>
<body>
  <h1>FFmpeg 转场效果预览</h1>
  <div class="grid">
    <div class="card">
      <video controls src="preview_fade.mp4"></video>
      <div class="card-title">淡入淡出 (Fade)</div>
    </div>
    <div class="card">
      <video controls src="preview_circlecrop.mp4"></video>
      <div class="card-title">圆形擦除 (Circlecrop)</div>
    </div>
    <div class="card">
      <video controls src="preview_wipeleft.mp4"></video>
      <div class="card-title">左擦除 (Wipeleft)</div>
    </div>
    <!-- 更多预览... -->
  </div>
</body>
</html>
```

---

## 6. 高级转场技巧

### 6.1 自定义转场组合

```bash
# 组合多个转场效果
ffmpeg -i clip1.mp4 -i clip2.mp4 -i clip3.mp4 \
  -filter_complex "
    # 第一个转场：淡入淡出
    [0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v01];
    # 第二个转场：圆形擦除
    [v01][2:v]xfade=transition=circlecrop:duration=0.5:offset=9.5[v12]
  " \
  -map "[v12]" output.mp4
```

### 6.2 转场 + 特效

```bash
# 转场 + 色彩调整
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "
    [0:v]eq=brightness=0.1[adj0];
    [adj0][1:v]xfade=transition=fade:duration=0.5:offset=4.5[out]
  " \
  -map "[out]" output.mp4
```

### 6.3 转场 + 缩放

```bash
# 转场 + 缩放填充
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "
    [0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[s0];
    [1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[s1];
    [s0][s1]xfade=transition=fade:duration=0.5:offset=4.5[out]
  " \
  -map "[out]" output.mp4
```

---

## 7. 性能优化

### 7.1 转场时长建议

| 视频类型 | 推荐时长 | 说明 |
|----------|----------|------|
| 短视频 (< 1 分钟) | 0.2-0.3s | 快节奏 |
| 标准短剧 (3-5 分钟) | 0.5-0.7s | 平衡 |
| 长视频 (> 10 分钟) | 0.8-1.0s | 慢节奏 |

### 7.2 避免过度使用

- ❌ 不要每 2 秒就用一次转场
- ✅ 关键场景切换时使用
- ✅ 保持转场风格一致
- ✅ 根据情绪选择转场类型

---

## 8. 常见问题

### Q1: 转场后画面变黑？
**A:** 检查 offset 参数，确保转场开始时间正确。

### Q2: 转场卡顿？
**A:** 使用硬件加速编码，或降低 preset 等级。

### Q3: 转场音频断裂？
**A:** 单独处理音频轨道，使用交叉淡入淡出。

```bash
# 音频交叉淡入淡出
[0:a][1:a]acrossfade=d=0.5:c1=tri:c2=tri
```

---

**文档版本：** v1.0  
**最后更新：** 2026-03-07  
**维护者：** Subagent-09
