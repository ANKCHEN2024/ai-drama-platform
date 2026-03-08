# 🎬 视频合成模块

**AI 短剧平台核心模块** - 使用 FFmpeg 进行专业级视频合成

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-%3E%3D4.4-green.svg)](https://ffmpeg.org)
[![Node](https://img.shields.io/badge/Node-%3E%3D18.0-yellow.svg)](https://nodejs.org)

---

## 📦 快速开始

### 安装依赖

```bash
cd modules/video-composite
npm install
```

### 系统要求

- **FFmpeg** >= 4.4（支持 xfade 滤镜）
- **Node.js** >= 18.0
- **可选：** Whisper（本地语音识别）

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
apt-get install ffmpeg

# 安装 Whisper（可选）
pip install openai-whisper
```

---

## 🚀 使用示例

### 基础合成

```javascript
const { VideoComposer } = require('./modules/video-composite');

const composer = new VideoComposer({
  outputDir: './outputs',
  tempDir: './temp'
});

const result = await composer.compose({
  videoClips: ['./inputs/clip1.mp4', './inputs/clip2.mp4', './inputs/clip3.mp4'],
  voiceOver: './inputs/narration.mp3',
  bgm: './inputs/background.mp3',
  sfx: ['./inputs/sfx1.mp3', './inputs/sfx2.mp3'],
  subtitles: './inputs/subtitles.srt',
  transitions: [
    { type: 'fade', duration: 0.5 },
    { type: 'circlecrop', duration: 0.5 }
  ]
}, './outputs/episode_01.mp4');

console.log('合成完成:', result);
```

### 字幕生成

```javascript
const { SubtitleGenerator } = require('./modules/video-composite');

const generator = new SubtitleGenerator({
  asrProvider: 'whisper'
});

const result = await generator.generateFromAudio(
  './inputs/narration.mp3',
  './outputs/subtitles.srt',
  true // 启用 LLM 优化
);

console.log('字幕生成完成:', result);
```

### 音频混合

```javascript
const { AudioMixer } = require('./modules/video-composite');

const mixer = new AudioMixer();

await mixer.mix([
  { file: './voice.mp3', volume: 1.0 },
  { file: './bgm.mp3', volume: 0.3, fade: { fadeIn: 2, fadeOut: 3, duration: 30 } },
  { file: './sfx.mp3', volume: 0.8, startTime: 5.2 }
], './outputs/mixed_audio.mp3');
```

---

## 📁 目录结构

```
modules/video-composite/
├── src/
│   ├── index.js           # 模块入口
│   ├── composer.js        # 核心合成逻辑
│   ├── transition.js      # 转场效果管理
│   ├── subtitle.js        # 字幕处理
│   └── audio.js           # 音频混合
├── tests/
│   ├── test_composer.js
│   ├── test_transition.js
│   └── test_subtitle.js
├── package.json
└── README.md
```

---

## 🎞️ 支持的转场效果

| 转场 | 名称 | 适用场景 |
|------|------|----------|
| `fade` | 淡入淡出 | 通用场景 |
| `circlecrop` | 圆形擦除 | 场景切换 |
| `wipeleft` | 左擦除 | 时间流逝 |
| `wiperight` | 右擦除 | 倒叙回忆 |
| `slidyleft` | 左滑动 | 快节奏 |
| `slideright` | 右滑动 | 快节奏 |
| `slideup` | 上滑动 | 场景转换 |
| `slidedown` | 下滑动 | 场景转换 |
| `circleopen` | 圆形展开 | 聚焦效果 |
| `rectopen` | 矩形展开 | 聚焦效果 |
| `hlslice` | 水平切片 | 动态效果 |
| `vlslice` | 垂直切片 | 动态效果 |
| `dissolve` | 溶解 | 梦幻效果 |
| `pixelize` | 像素化 | 科技感 |
| `radial` | 径向擦除 | 特殊效果 |

详见：[TRANSITION_LIBRARY.md](./TRANSITION_LIBRARY.md)

---

## 📝 文档

- **[DESIGN.md](./DESIGN.md)** - 模块设计文档
- **[FFMPEG_WORKFLOW.md](./FFMPEG_WORKFLOW.md)** - FFmpeg 合成流程详解
- **[SUBTITLE_GENERATION.md](./SUBTITLE_GENERATION.md)** - 字幕生成方案
- **[TRANSITION_LIBRARY.md](./TRANSITION_LIBRARY.md)** - 转场效果库

---

## ⚙️ 配置选项

### VideoComposer 配置

```javascript
{
  ffmpegPath: '/usr/local/bin/ffmpeg',  // FFmpeg 路径
  outputDir: './outputs',               // 输出目录
  tempDir: './temp',                    // 临时目录
  outputPreset: {                       // 输出预设
    resolution: '1920x1080',
    fps: 30,
    videoCodec: 'libx264',
    videoBitrate: '8M',
    audioCodec: 'aac',
    audioBitrate: '128k',
    audioSampleRate: 48000
  },
  logger: console                       // 日志对象
}
```

### 转场配置

```javascript
{
  type: 'fade',        // 转场类型
  duration: 0.5,       // 转场时长（秒）
  direction: 'right'   // 方向（可选，部分转场支持）
}
```

### 字幕样式

```javascript
{
  font: '思源黑体 CN',
  fontSize: 48,
  color: '#FFFFFF',
  outlineColor: '#000000',
  position: 'bottom',
  marginV: 50
}
```

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# 生成测试覆盖率报告
npm run test:coverage

# 生成转场效果预览
npm run preview
```

---

## 📊 性能基准

| 预设 | 速度 | 压缩率 | 推荐用途 |
|------|------|--------|----------|
| ultrafast | 最快 | 最低 | 快速预览 |
| fast | 快 | 中 | 日常输出 |
| medium | 中等 | 高 | 默认设置 |
| slow | 慢 | 很高 | 最终输出 |
| veryslow | 最慢 | 最高 | 存档级 |

---

## 🔧 命令行工具

```bash
# 合成视频
node scripts/compose.js \
  --input ./inputs \
  --config config.json \
  --output ./outputs/episode_01.mp4

# 生成字幕
node scripts/generate_subtitle.js \
  --audio ./inputs/narration.mp3 \
  --output ./outputs/subtitles.srt

# 生成转场预览
node scripts/generate_previews.js \
  --output ./previews
```

---

## 🐛 常见问题

### 音画不同步
```bash
# 解决方案：使用 -shortest 参数或重新同步时间戳
ffmpeg -i video.mp4 -i audio.mp3 -shortest output.mp4
```

### 字幕乱码
```bash
# 确保 SRT 文件是 UTF-8 编码
iconv -f GBK -t UTF-8 input.srt > output.srt
```

### 转场失败
```bash
# 检查 FFmpeg 版本（需要 4.4+）
ffmpeg -version
```

---

## 📄 许可证

MIT License

---

## 👥 维护者

- **Subagent-09** - 视频合成模块开发

---

**最后更新：** 2026-03-07
