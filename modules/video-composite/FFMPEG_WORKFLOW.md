# FFmpeg 合成流程详解

**版本：** v1.0  
**最后更新：** 2026-03-07  

---

## 1. 快速开始

### 1.1 最简合成命令

```bash
# 三个视频片段拼接 + 自动转场
ffmpeg -i clip1.mp4 -i clip2.mp4 -i clip3.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v01];[v01][2:v]xfade=transition=fade:duration=0.5:offset=9.5[v12]" \
  -map "[v12]" \
  output.mp4
```

### 1.2 完整合成命令（生产环境）

```bash
ffmpeg \
  # === 输入文件 ===
  -i inputs/video/clip_001.mp4 \
  -i inputs/video/clip_002.mp4 \
  -i inputs/video/clip_003.mp4 \
  -i inputs/audio/narration.mp3 \
  -i inputs/audio/bgm.mp3 \
  -i inputs/audio/sfx_001.mp3 \
  -i inputs/audio/sfx_002.mp3 \
  \
  # === 复杂滤镜链 ===
  -filter_complex "
    # --- 视频轨道 ---
    # 片段 1+2 转场
    [0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v01];
    # 片段 2+3 转场
    [v01][2:v]xfade=transition=circlecrop:duration=0.5:offset=9.5[v12];
    # 缩放和填充到 1080p
    [v12]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[scaled];
    # 添加字幕
    [scaled]subtitles=inputs/subtitles/episode_01.srt:force_style='FontSize=48,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Shadow=0,MarginV=50'[video_out];
    
    # --- 音频轨道 ---
    # 混合所有音效
    [5:a][6:a]amix=inputs=2:duration=longest[sfx_mix];
    # 混合配音和音效
    [3:a][sfx_mix]amix=inputs=2:duration=longest[voice_sfx];
    # BGM 淡入淡出
    [4:a]afade=t=in:st=0:d=2,afade=t=out:st=25:d=3[bgm_faded];
    # 最终音频混合
    [voice_sfx][bgm_faded]amix=inputs=2:duration=longest[audio_out]
  " \
  \
  # === 输出映射 ===
  -map "[video_out]" -map "[audio_out]" \
  \
  # === 视频编码参数 ===
  -c:v libx264 \
  -preset slow \
  -crf 20 \
  -profile:v high \
  -level 4.2 \
  -pix_fmt yuv420p \
  \
  # === 音频编码参数 ===
  -c:a aac \
  -b:a 128k \
  -ar 48000 \
  -ac 2 \
  \
  # === 输出 ===
  -y outputs/episode_01_final.mp4
```

---

## 2. 视频片段处理

### 2.1 基础拼接（无转场）

```bash
# 使用 concat 滤镜（适合相同格式的视频）
ffmpeg -i clip1.mp4 -i clip2.mp4 -i clip3.mp4 \
  -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]" \
  -map "[outv]" -map "[outa]" \
  output.mp4
```

### 2.2 带转场的拼接

```bash
# xfade 滤镜（FFmpeg 4.4+，支持多种转场）
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v]" \
  -map "[v]" \
  output.mp4
```

**参数说明：**
- `transition=fade` - 转场类型
- `duration=0.5` - 转场持续时间（秒）
- `offset=4.5` - 转场开始时间（第一个视频结束前 0.5 秒）

### 2.3 多片段链式转场

```bash
# 3 个片段，2 个转场
ffmpeg -i clip1.mp4 -i clip2.mp4 -i clip3.mp4 \
  -filter_complex "
    [0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v01];
    [v01][2:v]xfade=transition=circlecrop:duration=0.5:offset=9.5[v12]
  " \
  -map "[v12]" \
  output.mp4
```

### 2.4 视频缩放和填充

```bash
# 缩放至 1080p 并添加黑边填充
ffmpeg -i input.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1" \
  output.mp4
```

**滤镜链说明：**
1. `scale=1920:1080:force_original_aspect_ratio=decrease` - 等比缩放，不超过 1080p
2. `pad=1920:1080:(ow-iw)/2:(oh-ih)/2` - 添加黑边填充至 1920x1080
3. `setsar=1` - 设置像素宽高比为 1:1

---

## 3. 音频处理

### 3.1 多轨道音频混合

```bash
# 混合 3 个音频轨道
ffmpeg -i voice.mp3 -i bgm.mp3 -i sfx.mp3 \
  -filter_complex "[0:a][1:a][2:a]amix=inputs=3:duration=longest:dropout_transition=3" \
  -c:a aac -b:a 128k \
  output.mp4
```

**参数说明：**
- `inputs=3` - 输入轨道数量
- `duration=longest` - 输出时长与最长输入一致
- `dropout_transition=3` - 淡出过渡时间（秒）

### 3.2 音频淡入淡出

```bash
# BGM 淡入 2 秒，淡出 3 秒
ffmpeg -i bgm.mp3 \
  -af "afade=t=in:st=0:d=2,afade=t=out:st=25:d=3" \
  bgm_faded.mp3
```

**参数说明：**
- `t=in` - 淡入类型
- `st=0` - 淡入开始时间（秒）
- `d=2` - 淡入持续时间（秒）
- `t=out` - 淡出类型
- `st=25` - 淡出开始时间
- `d=3` - 淡出持续时间

### 3.3 音量调整

```bash
# 调整音量（1.0 = 原音量，0.5 = 减半，2.0 = 加倍）
ffmpeg -i input.mp3 -af "volume=0.5" output.mp3

# 动态音量压缩（防止爆音）
ffmpeg -i input.mp3 -af "acompressor=threshold=0.089:ratio=9:attack=200:release=1000" output.mp3
```

### 3.4 音频同步

```bash
# 精确音画同步
ffmpeg -i video.mp4 -i audio.mp3 \
  -filter_complex "[0:v]setpts=PTS-STARTPTS[v];[1:a]asetpts=PTS-STARTPTS[a]" \
  -map "[v]" -map "[a]" \
  -c:v copy -c:a aac \
  -shortest \
  output.mp4
```

---

## 4. 字幕处理

### 4.1 嵌入 SRT 字幕

```bash
# 基础字幕嵌入
ffmpeg -i video.mp4 -i subtitles.srt \
  -vf "subtitles=subtitles.srt" \
  output.mp4
```

### 4.2 自定义字幕样式

```bash
# 完整样式配置
ffmpeg -i video.mp4 \
  -vf "subtitles=subtitles.srt:force_style='
    FontName=Source Han Sans CN,
    FontSize=48,
    PrimaryColour=&H00FFFFFF,
    SecondaryColour=&H00000000,
    OutlineColour=&H00000000,
    BackColour=&H00000000,
    Bold=0,
    Italic=0,
    BorderStyle=1,
    Outline=2,
    Shadow=0,
    Alignment=2,
    MarginL=50,
    MarginR=50,
    MarginV=50,
    Encoding=1
  '" \
  output.mp4
```

**样式参数详解：**

| 参数 | 值 | 说明 |
|------|-----|------|
| FontName | Source Han Sans CN | 字体名称 |
| FontSize | 48 | 字号 |
| PrimaryColour | &H00FFFFFF | 主颜色（白色） |
| OutlineColour | &H00000000 | 描边颜色（黑色） |
| Outline | 2 | 描边宽度 |
| Alignment | 2 | 对齐方式（2=底部居中） |
| MarginV | 50 | 垂直边距 |

### 4.3 ASS 高级字幕

```bash
# 使用 ASS 格式（支持更复杂的样式）
ffmpeg -i video.mp4 \
  -vf "subtitles=subtitles.ass" \
  output.mp4
```

**ASS 字幕示例：**

```ass
[Script Info]
Title: Episode 01
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Source Han Sans CN,48,&H00FFFFFF,&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,50,50,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.50,Default,,0,0,0,,这是第一句台词
Dialogue: 0,0:00:05.00,0:00:08.20,Default,,0,0,0,,第二句台词
```

---

## 5. 转场效果库

### 5.1 所有可用转场

```bash
# 1. Fade（淡入淡出）
[0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5

# 2. Circlecrop（圆形擦除）
[0:v][1:v]xfade=transition=circlecrop:duration=0.5:offset=4.5:direction=right

# 3. Wipeleft（从左到右擦除）
[0:v][1:v]xfade=transition=wipeleft:duration=0.5:offset=4.5

# 4. Wiperight（从右到左擦除）
[0:v][1:v]xfade=transition=wiperight:duration=0.5:offset=4.5

# 5. Slidyleft（向左滑动）
[0:v][1:v]xfade=transition=slidyleft:duration=0.5:offset=4.5

# 6. Slideright（向右滑动）
[0:v][1:v]xfade=transition=slideright:duration=0.5:offset=4.5

# 7. Slideup（向上滑动）
[0:v][1:v]xfade=transition=slideup:duration=0.5:offset=4.5

# 8. Slidedown（向下滑动）
[0:v][1:v]xfade=transition=slidedown:duration=0.5:offset=4.5

# 9. Circleopen（圆形展开）
[0:v][1:v]xfade=transition=circleopen:duration=0.5:offset=4.5

# 10. Rectopen（矩形展开）
[0:v][1:v]xfade=transition=rectopen:duration=0.5:offset=4.5

# 11. Hlslice（水平切片）
[0:v][1:v]xfade=transition=hlslice:duration=0.5:offset=4.5:direction=right

# 12. Vlslice（垂直切片）
[0:v][1:v]xfade=transition=vlslice:duration=0.5:offset=4.5:direction=down

# 13. Dissolve（溶解）
[0:v][1:v]xfade=transition=dissolve:duration=0.5:offset=4.5

# 14. Pixelize（像素化）
[0:v][1:v]xfade=transition=pixelize:duration=0.5:offset=4.5

# 15. Radial（径向擦除）
[0:v][1:v]xfade=transition=radial:duration=0.5:offset=4.5:direction=right
```

### 5.2 转场效果预览生成脚本

```bash
#!/bin/bash
# generate_transition_previews.sh

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

for transition in "${TRANSITIONS[@]}"; do
  echo "生成 $transition 转场预览..."
  
  ffmpeg -f lavfi -i color=c=red:s=1920x1080:d=5 \
         -f lavfi -i color=c=blue:s=1920x1080:d=5 \
         -filter_complex "[0:v][1:v]xfade=transition=$transition:duration=1:offset=4[outv]" \
         -map "[outv]" \
         -t 10 \
         -y "previews/preview_$transition.mp4"
done

echo "所有预览生成完成！"
```

---

## 6. 编码参数优化

### 6.1 H.264 编码预设

```bash
# 高质量输出（推荐）
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -preset slow \
  -crf 20 \
  -profile:v high \
  -level 4.2 \
  -pix_fmt yuv420p \
  output.mp4
```

**关键参数：**
- `preset` - 编码速度/压缩率平衡
  - ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
- `crf` - 质量因子（0-51，越小质量越高）
  - 18-22：高质量
  - 23-28：中等质量
  - 29+：低质量
- `profile:v high` - H.264 高级配置文件
- `level 4.2` - 支持 1080p60

### 6.2 H.265/HEVC 编码（更高压缩率）

```bash
ffmpeg -i input.mp4 \
  -c:v libx265 \
  -preset slow \
  -crf 22 \
  -tag:v hvc1 \
  output.mp4
```

### 6.3 硬件加速编码

```bash
# macOS VideoToolbox
ffmpeg -i input.mp4 -c:v h264_videotoolbox -b:v 8M output.mp4

# NVIDIA NVENC
ffmpeg -i input.mp4 -c:v h264_nvenc -preset slow -b:v 8M output.mp4

# Intel Quick Sync
ffmpeg -i input.mp4 -c:v h264_qsv -preset slow -b:v 8M output.mp4
```

---

## 7. 批量处理脚本

### 7.1 批量合成多集短剧

```bash
#!/bin/bash
# batch_compose.sh

EPISODES=(1 2 3 4 5)

for ep in "${EPISODES[@]}"; do
  echo "正在合成第 $ep 集..."
  
  ffmpeg \
    -i "inputs/video/ep${ep}_clip1.mp4" \
    -i "inputs/video/ep${ep}_clip2.mp4" \
    -i "inputs/video/ep${ep}_clip3.mp4" \
    -i "inputs/audio/ep${ep}_narration.mp3" \
    -i "inputs/audio/ep${ep}_bgm.mp3" \
    -filter_complex "
      [0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v01];
      [v01][2:v]xfade=transition=circlecrop:duration=0.5:offset=9.5[v12];
      [3:a][4:a]amix=inputs=2:duration=longest[a]
    " \
    -map "[v12]" -map "[a]" \
    -c:v libx264 -preset slow -crf 20 \
    -c:a aac -b:a 128k \
    "outputs/episode_${ep}_final.mp4"
  
  echo "第 $ep 集合成完成！"
done
```

### 7.2 并行处理（加速批量合成）

```bash
#!/bin/bash
# parallel_compose.sh

export -f compose_episode
EPISODES=(1 2 3 4 5)

# 使用 GNU parallel 并行处理
parallel -j 4 compose_episode ::: "${EPISODES[@]}"
```

---

## 8. 常见问题排查

### 8.1 音画不同步

**问题：** 视频和音频不同步

**解决方案：**
```bash
# 方法 1：使用 -shortest 参数
ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac -shortest output.mp4

# 方法 2：重新同步时间戳
ffmpeg -i video.mp4 -i audio.mp3 \
  -filter_complex "[0:v]setpts=PTS-STARTPTS[v];[1:a]asetpts=PTS-STARTPTS[a]" \
  -map "[v]" -map "[a]" output.mp4

# 方法 3：手动调整音频延迟（+2 秒）
ffmpeg -i video.mp4 -i audio.mp3 \
  -af "adelay=2000|2000" \
  output.mp4
```

### 8.2 字幕乱码

**问题：** 字幕显示乱码

**解决方案：**
```bash
# 确保 SRT 文件是 UTF-8 编码
iconv -f GBK -t UTF-8 subtitles_gbk.srt > subtitles_utf8.srt

# 或者在 FFmpeg 中指定编码
ffmpeg -i video.mp4 \
  -vf "subtitles=subtitles.srt:chapters_id=0:original_size=1920x1080" \
  output.mp4
```

### 8.3 转场失败

**问题：** xfade 滤镜报错

**解决方案：**
```bash
# 检查 FFmpeg 版本（需要 4.4+）
ffmpeg -version

# 如果版本过低，使用 fade 滤镜替代
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "[0:v]fade=t=out:st=4.5:d=0.5[f0];[1:v]fade=t=in:st=0:d=0.5[f1];[f0][f1]overlay[out]" \
  -map "[out]" output.mp4
```

### 8.4 输出文件过大

**问题：** 输出文件体积太大

**解决方案：**
```bash
# 降低 CRF 值（提高压缩率）
ffmpeg -i input.mp4 -c:v libx264 -crf 28 output.mp4

# 使用 H.265 编码
ffmpeg -i input.mp4 -c:v libx265 -crf 28 output.mp4

# 限制最大码率
ffmpeg -i input.mp4 -c:v libx264 -maxrate 4M -bufsize 8M output.mp4
```

---

## 9. 性能基准测试

### 9.1 测试脚本

```bash
#!/bin/bash
# benchmark.sh

echo "FFmpeg 性能基准测试"
echo "=================="

# 测试素材：10 分钟 1080p 视频
INPUT="test_input.mp4"
OUTPUT="test_output.mp4"

# 测试不同 preset
for preset in ultrafast superfast veryfast faster fast medium slow slower veryslow; do
  echo "测试 preset=$preset..."
  
  START=$(date +%s.%N)
  
  ffmpeg -i $INPUT \
    -c:v libx264 \
    -preset $preset \
    -crf 23 \
    -c:a aac \
    -y $OUTPUT \
    2>&1 | grep -E "frame|time|speed"
  
  END=$(date +%s.%N)
  DURATION=$(echo "$END - $START" | bc)
  
  echo "耗时：${DURATION}秒"
  echo "输出文件大小：$(du -h $OUTPUT | cut -f1)"
  echo "---"
done
```

### 9.2 参考基准

| Preset | 相对速度 | 压缩率 | 推荐用途 |
|--------|----------|--------|----------|
| ultrafast | 10x | 1.0x | 快速预览 |
| veryfast | 5x | 1.3x | 粗剪测试 |
| fast | 2x | 1.5x | 日常输出 |
| medium | 1x | 1.7x | 默认设置 |
| slow | 0.5x | 2.0x | 最终输出 |
| veryslow | 0.2x | 2.3x | 存档级 |

---

**文档版本：** v1.0  
**最后更新：** 2026-03-07  
**维护者：** Subagent-09
