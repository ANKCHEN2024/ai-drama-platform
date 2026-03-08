# 🎬 视频合成模块设计文档

**模块名称：** video-composite  
**负责人：** Subagent-09  
**版本：** v1.0  
**创建时间：** 2026-03-07  

---

## 1. 模块概述

### 1.1 功能定位
视频合成模块是 AI 短剧平台的最终输出环节，负责将多个视频片段、配音、BGM、音效进行多轨道合成，添加转场效果、字幕，输出完整的短剧视频。

### 1.2 核心能力
- ✅ 多轨道视频合成（视频 + 音频 + 字幕）
- ✅ 转场效果库（10+ 种转场）
- ✅ 字幕生成与嵌入（ASS/SRT 格式）
- ✅ 音画同步处理
- ✅ 批量渲染输出
- ✅ 1080p/4K 分辨率支持

### 1.3 技术选型
| 组件 | 技术 | 说明 |
|------|------|------|
| 视频处理 | FFmpeg | 核心合成引擎 |
| 字幕处理 | FFmpeg + assfilter | 字幕渲染 |
| 转场效果 | FFmpeg filter_complex | 滤镜链 |
| 音频混合 | FFmpeg amix | 多轨道音频混合 |
| 音画同步 | FFmpeg pts 时间戳 | 精确同步 |

---

## 2. 输入输出规范

### 2.1 输入要求

```
inputs/
├── video_clips/          # 视频片段目录
│   ├── clip_001.mp4      # 第 1 个镜头
│   ├── clip_002.mp4      # 第 2 个镜头
│   └── ...
├── voice_over/           # 配音音频
│   └── narration.mp3     # 旁白/对白配音
├── bgm/                  # 背景音乐
│   └── background.mp3    # BGM 音乐
├── sfx/                  # 音效
│   ├── sfx_001.mp3       # 音效 1
│   └── sfx_002.mp3       # 音效 2
├── subtitles/            # 字幕文件
│   └── episode_01.srt    # SRT 格式字幕
└── config.json           # 合成配置文件
```

### 2.2 配置文件格式 (config.json)

```json
{
  "project": {
    "name": "短剧第 1 集",
    "resolution": "1920x1080",
    "fps": 30,
    "output_format": "mp4"
  },
  "video_clips": [
    {
      "file": "clip_001.mp4",
      "duration": 5.0,
      "transition": "fade",
      "transition_duration": 0.5
    },
    {
      "file": "clip_002.mp4",
      "duration": 8.0,
      "transition": "circlecrop",
      "transition_duration": 0.5
    }
  ],
  "audio": {
    "voice_over": {
      "file": "narration.mp3",
      "volume": 1.0,
      "start_time": 0
    },
    "bgm": {
      "file": "background.mp3",
      "volume": 0.3,
      "fade_in": 2,
      "fade_out": 3
    },
    "sfx": [
      {
        "file": "sfx_001.mp3",
        "volume": 0.8,
        "start_time": 5.2
      }
    ]
  },
  "subtitles": {
    "file": "episode_01.srt",
    "font": "思源黑体",
    "font_size": 48,
    "color": "#FFFFFF",
    "position": "bottom"
  }
}
```

### 2.3 输出规格

```
outputs/
├── episode_01_final.mp4      # 最终成片（1080p）
├── episode_01_preview.mp4    # 预览版本（720p，低码率）
└── episode_01_thumbnail.jpg  # 封面图
```

**输出参数：**
- 分辨率：1920x1080 (1080p) 或 3840x2160 (4K)
- 帧率：30 fps
- 视频编码：H.264 (兼容性好) / H.265 (高压缩)
- 视频码率：8-15 Mbps (1080p)
- 音频编码：AAC
- 音频码率：128 kbps
- 音频采样率：48 kHz

---

## 3. FFmpeg 合成流程

### 3.1 基础合成命令

```bash
# 多视频片段拼接 + 转场
ffmpeg -i clip_001.mp4 -i clip_002.mp4 -i clip_003.mp4 \
  -filter_complex "
    [0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v01];
    [v01][2:v]xfade=transition=circlecrop:duration=0.5:offset=9.5[v12];
    [0:a][1:a][2:a]amix=inputs=3:duration=longest[a]
  " \
  -map "[v12]" -map "[a]" \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 128k \
  output.mp4
```

### 3.2 完整合成流程（含 BGM、音效、字幕）

```bash
ffmpeg \
  # 输入视频片段
  -i clip_001.mp4 \
  -i clip_002.mp4 \
  -i clip_003.mp4 \
  \
  # 输入音频轨道
  -i narration.mp3 \
  -i background.mp3 \
  -i sfx_001.mp3 \
  \
  # 复杂滤镜链
  -filter_complex "
    # === 视频轨道处理 ===
    # 视频片段 1-2 转场
    [0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v01];
    # 视频片段 2-3 转场
    [v01][2:v]xfade=transition=circlecrop:duration=0.5:offset=9.5[v12];
    # 缩放至目标分辨率
    [v12]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[scaled];
    # 添加字幕
    [scaled]subtitles=episode_01.srt:force_style='FontSize=48,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Shadow=0,MarginV=50'[subtitled];
    
    # === 音频轨道处理 ===
    # 混合配音和音效
    [3:a][5:a]amix=inputs=2:duration=longest:dropout_transition=3[mixed];
    # BGM 淡入淡出
    [4:a]afade=t=in:st=0:d=2,afade=t=out:st=25:d=3[bgm_faded];
    # 最终音频混合（配音 + 音效 + BGM）
    [mixed][bgm_faded]amix=inputs=2:duration=longest[audio_out]
  " \
  \
  # 映射输出
  -map "[subtitled]" -map "[audio_out]" \
  \
  # 编码参数
  -c:v libx264 \
  -preset slow \
  -crf 20 \
  -profile:v high \
  -level 4.2 \
  \
  -c:a aac \
  -b:a 128k \
  -ar 48000 \
  \
  # 输出
  -y episode_01_final.mp4
```

### 3.3 音画同步处理

```bash
# 使用 pts 时间戳精确同步
ffmpeg -i video.mp4 -i audio.mp3 \
  -filter_complex "
    [0:v]setpts=PTS-STARTPTS[v];
    [1:a]asetpts=PTS-STARTPTS[a];
    [v][a]concat=n=1:v=1:a=1
  " \
  -map "[v]" -map "[a]" \
  -c:v libx264 -c:a aac \
  -shortest \
  output.mp4
```

**同步策略：**
1. 以配音轨道为时间基准
2. 视频片段根据配音时长自动调整
3. BGM 自动淡入淡出避免突兀
4. 音效精确到帧级别的时间点

---

## 4. 字幕生成方案

### 4.1 字幕格式支持

| 格式 | 支持 | 说明 |
|------|------|------|
| SRT | ✅ | 标准字幕格式，推荐 |
| ASS/SSA | ✅ | 高级样式支持 |
| VTT | ✅ | WebVTT，网页友好 |
| TXT | ✅ | 纯文本（需时间戳） |

### 4.2 SRT 字幕示例

```srt
1
00:00:01,000 --> 00:00:04,500
这是第一句台词，显示在屏幕底部。

2
00:00:05,000 --> 00:00:08,200
第二句台词，带有情感表达。

3
00:00:09,000 --> 00:00:12,000
第三句台词，配合背景音乐高潮。
```

### 4.3 字幕样式配置

```bash
# FFmpeg 字幕样式参数
subtitles=episode_01.srt:force_style='
  FontName=思源黑体 CN,
  FontSize=48,
  PrimaryColour=&H00FFFFFF,
  SecondaryColour=&H00000000,
  OutlineColour=&H00000000,
  BackColour=&H00000000,
  Bold=0,
  Italic=0,
  Underline=0,
  StrikeOut=0,
  ScaleX=100,
  ScaleY=100,
  Spacing=0,
  Angle=0,
  BorderStyle=1,
  Outline=2,
  Shadow=0,
  Alignment=2,
  MarginL=50,
  MarginR=50,
  MarginV=50,
  Encoding=1
'
```

### 4.4 字幕生成流程

```
1. 从配音音频提取语音识别文本（调用阿里云语音识别 API）
   ↓
2. 使用大语言模型（通义千问）进行文本分段和时间对齐
   ↓
3. 生成 SRT 格式字幕文件
   ↓
4. FFmpeg 渲染字幕到视频
```

**Python 脚本示例（字幕生成）：**

```python
# subtitle_generator.py
import json
from datetime import timedelta

def generate_srt(transcript, output_path):
    """
    根据语音识别结果生成 SRT 字幕
    
    Args:
        transcript: 语音识别结果（包含时间戳的文本）
        output_path: 输出 SRT 文件路径
    """
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, segment in enumerate(transcript, 1):
            start = format_time(segment['start'])
            end = format_time(segment['end'])
            text = segment['text']
            
            f.write(f"{i}\n")
            f.write(f"{start} --> {end}\n")
            f.write(f"{text}\n\n")

def format_time(seconds):
    """将秒数转换为 SRT 时间格式"""
    td = timedelta(seconds=seconds)
    hours, remainder = divmod(td.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = td.microseconds // 1000
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"
```

---

## 5. 转场效果库

### 5.1 支持的转场效果

| 转场名称 | FFmpeg 滤镜 | 效果描述 | 适用场景 |
|----------|-------------|----------|----------|
| fade | xfade=fade | 淡入淡出 | 通用，柔和过渡 |
| circlecrop | xfade=circlecrop | 圆形擦除 | 场景切换 |
| wipeleft | xfade=wipeleft | 从左到右擦除 | 时间流逝 |
| wiperight | xfade=wiperight | 从右到左擦除 | 时间流逝 |
| slidyleft | xfade=slidyleft | 向左滑动 | 快节奏 |
| slideright | xfade=slideright | 向右滑动 | 快节奏 |
| slideup | xfade=slideup | 向上滑动 | 场景转换 |
| slidedown | xfade=slidedown | 向下滑动 | 场景转换 |
| circleopen | xfade=circleopen | 圆形展开 | 聚焦效果 |
| rectopen | xfade=rectopen | 矩形展开 | 聚焦效果 |
| hlslice | xfade=hlslice | 水平切片 | 动态效果 |
| vlslice | xfade=vlslice | 垂直切片 | 动态效果 |
| dissolve | xfade=dissolve | 溶解 | 梦幻效果 |
| pixelize | xfade=pixelize | 像素化 | 科技感 |
| radial | xfade=radial | 径向擦除 | 特殊效果 |

### 5.2 转场效果示例

```bash
# 淡入淡出转场（最常用）
[0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v01]

# 圆形擦除转场
[0:v][1:v]xfade=transition=circlecrop:duration=0.5:offset=4.5:direction=right[v01]

# 向左滑动转场
[0:v][1:v]xfade=transition=slidyleft:duration=0.5:offset=4.5[v01]

# 溶解转场
[0:v][1:v]xfade=transition=dissolve:duration=0.5:offset=4.5[v01]
```

### 5.3 转场配置模板

```json
{
  "transitions": {
    "default": {
      "type": "fade",
      "duration": 0.5
    },
    "scene_change": {
      "type": "circlecrop",
      "duration": 0.7
    },
    "time_skip": {
      "type": "wipeleft",
      "duration": 0.3
    },
    "flashback": {
      "type": "dissolve",
      "duration": 1.0
    },
    "action": {
      "type": "slidyleft",
      "duration": 0.2
    }
  }
}
```

### 5.4 转场效果预览脚本

```bash
# 生成转场效果预览视频
ffmpeg -f lavfi -i color=c=red:s=1920x1080:d=5 \
       -f lavfi -i color=c=blue:s=1920x1080:d=5 \
       -filter_complex "[0:v][1:v]xfade=transition=FADE:duration=1:offset=4[outv]" \
       -map "[outv]" \
       -t 10 \
       preview_FADE.mp4
```

---

## 6. 模块架构设计

### 6.1 目录结构

```
modules/video-composite/
├── src/
│   ├── index.js              # 模块入口
│   ├── composer.js           # 核心合成逻辑
│   ├── transition.js         # 转场效果管理
│   ├── subtitle.js           # 字幕处理
│   ├── audio.js              # 音频混合
│   └── renderer.js           # 渲染输出
├── templates/
│   ├── subtitle_style.ass    # 字幕样式模板
│   └── config_template.json  # 配置文件模板
├── presets/
│   ├── 1080p_h264.json       # 1080p H264 预设
│   ├── 4k_h265.json          # 4K H265 预设
│   └── web_preview.json      # 网页预览预设
├── tests/
│   ├── test_composer.js      # 合成测试
│   ├── test_transition.js    # 转场测试
│   └── test_subtitle.js      # 字幕测试
├── package.json
└── README.md
```

### 6.2 核心 API

```javascript
// composer.js
class VideoComposer {
  constructor(config) {
    this.config = config;
    this.ffmpeg = ffmpeg(config.ffmpegPath);
  }

  // 合成视频
  async compose(inputs, outputPath) {
    // 1. 验证输入文件
    await this.validateInputs(inputs);
    
    // 2. 构建滤镜链
    const filterChain = this.buildFilterChain(inputs);
    
    // 3. 执行 FFmpeg 命令
    await this.runFFmpeg(filterChain, outputPath);
    
    // 4. 生成预览版本
    await this.generatePreview(outputPath);
    
    return { success: true, outputPath };
  }

  // 添加转场
  addTransition(clip1, clip2, type, duration) {
    // ...
  }

  // 混合音频
  mixAudio(tracks) {
    // ...
  }

  // 渲染字幕
  renderSubtitle(video, subtitleFile, style) {
    // ...
  }
}
```

### 6.3 使用示例

```javascript
const { VideoComposer } = require('./modules/video-composite');

const composer = new VideoComposer({
  ffmpegPath: '/usr/local/bin/ffmpeg',
  outputDir: './outputs'
});

const result = await composer.compose({
  videoClips: ['./inputs/clips/*.mp4'],
  voiceOver: './inputs/voice/narration.mp3',
  bgm: './inputs/bgm/background.mp3',
  sfx: ['./inputs/sfx/*.mp3'],
  subtitles: './inputs/subs/episode_01.srt',
  transitions: [
    { type: 'fade', duration: 0.5 },
    { type: 'circlecrop', duration: 0.5 }
  ]
}, './outputs/episode_01_final.mp4');

console.log('合成完成:', result);
```

---

## 7. 性能优化

### 7.1 编码预设

| 预设等级 | 速度 | 压缩率 | 适用场景 |
|----------|------|--------|----------|
| ultrafast | 最快 | 最低 | 快速预览 |
| superfast | 很快 | 低 | 粗剪预览 |
| veryfast | 快 | 中低 | 日常测试 |
| faster | 较快 | 中 | 常规输出 |
| fast | 快 | 中高 | 推荐 |
| medium | 中等 | 高 | 默认 |
| slow | 慢 | 很高 | 最终输出 |
| slower | 很慢 | 极高 | 高质量 |
| veryslow | 极慢 | 最高 | 存档级 |

### 7.2 硬件加速

```bash
# NVIDIA NVENC 硬件编码（如果有 GPU）
ffmpeg -i input.mp4 -c:v h264_nvenc -preset slow -output.mp4

# Apple VideoToolbox（macOS）
ffmpeg -i input.mp4 -c:v h264_videotoolbox -output.mp4

# Intel Quick Sync（Linux/Windows）
ffmpeg -i input.mp4 -c:v h264_qsv -output.mp4
```

### 7.3 并行处理

```bash
# 使用多线程编码
ffmpeg -threads 8 -i input.mp4 -c:v libx264 -threads 4 output.mp4
```

---

## 8. 错误处理与日志

### 8.1 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| 音画不同步 | 帧率不匹配 | 统一输入文件帧率 |
| 字幕乱码 | 编码问题 | 使用 UTF-8 编码 |
| 转场失败 | 时长不足 | 检查视频片段长度 |
| 音频爆音 | 音量过大 | 调整 volume 参数 |
| 输出文件损坏 | 编码中断 | 检查磁盘空间 |

### 8.2 日志记录

```javascript
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`)
};
```

---

## 9. 测试计划

### 9.1 单元测试

- [ ] 视频片段拼接测试
- [ ] 转场效果测试（15 种）
- [ ] 音频混合测试
- [ ] 字幕渲染测试
- [ ] 配置文件解析测试

### 9.2 集成测试

- [ ] 完整流程测试（输入→输出）
- [ ] 多集连续生成测试
- [ ] 并发任务测试
- [ ] 性能基准测试

### 9.3 验收标准

- [ ] 合成成功率 > 99%
- [ ] 单集合成时间 < 5 分钟（10 分钟素材）
- [ ] 输出视频无音画不同步
- [ ] 字幕准确率 100%
- [ ] 转场流畅无卡顿

---

## 10. 依赖项

### 10.1 系统依赖

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
apt-get install ffmpeg

# 需要 FFmpeg 版本 >= 4.4（支持 xfade 滤镜）
```

### 10.2 Node.js 依赖

```json
{
  "dependencies": {
    "fluent-ffmpeg": "^2.1.2",
    "ffmpeg-probe": "^1.0.0",
    "fs-extra": "^11.0.0",
    "uuid": "^9.0.0"
  }
}
```

---

## 11. 后续优化方向

1. **AI 智能转场** - 根据剧情自动选择转场效果
2. **自动调色** - 统一不同片段的色彩风格
3. **智能音频ducking** - 自动降低 BGM 音量突出人声
4. **批量渲染** - 支持多集并行渲染
5. **云端渲染** - 支持分布式渲染集群

---

**文档版本：** v1.0  
**最后更新：** 2026-03-07  
**维护者：** Subagent-09
