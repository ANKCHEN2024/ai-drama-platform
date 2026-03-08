# 字幕生成方案

**版本：** v1.0  
**最后更新：** 2026-03-07  

---

## 1. 方案概述

### 1.1 字幕生成流程

```
┌─────────────────┐
│  配音音频文件   │
│  (narration.mp3)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  语音识别 API   │  ← 阿里云语音识别
│  (ASR Service)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  原始识别文本   │
│  (带时间戳)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  文本分段优化   │  ← 通义千问 LLM
│  (语义切分)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SRT/ASS 字幕   │
│  (格式化输出)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FFmpeg 嵌入    │
│  (视频渲染)     │
└─────────────────┘
```

### 1.2 技术选型

| 组件 | 技术方案 | 说明 |
|------|----------|------|
| 语音识别 | 阿里云智能语音 | 中文识别准确率 > 98% |
| 文本分段 | 通义千问 LLM | 语义理解，智能切分 |
| 字幕格式 | SRT / ASS | SRT 通用，ASS 样式丰富 |
| 字幕渲染 | FFmpeg subtitles | 高性能渲染 |

---

## 2. 语音识别（ASR）

### 2.1 阿里云语音识别 API

**API 文档：** https://help.aliyun.com/product/30411.html

**请求示例：**

```javascript
// asr_client.js
const http = require('http');

class AliyunASR {
  constructor(accessKeyId, accessKeySecret) {
    this.accessKeyId = accessKeyId;
    this.accessKeySecret = accessKeySecret;
    this.endpoint = 'nls-gateway.cn-shanghai.aliyuncs.com';
  }

  /**
   * 语音识别（长音频）
   * @param {string} audioFile - 音频文件路径
   * @returns {Promise<Array>} - 识别结果（带时间戳）
   */
  async transcribe(audioFile) {
    // 1. 上传音频文件到 OSS
    const ossUrl = await this.uploadToOSS(audioFile);
    
    // 2. 提交识别任务
    const taskId = await this.submitTask(ossUrl);
    
    // 3. 轮询任务状态
    const result = await this.pollTask(taskId);
    
    return result;
  }

  async submitTask(audioUrl) {
    const params = {
      TaskName: 'SpeechTranscriber',
      AudioUrl: audioUrl,
      Format: 'mp3',
      SampleRate: 16000,
      EnableIntermediateResult: false,
      EnablePunctuationPrediction: true,
      EnableInverseTextNormalization: true
    };

    const response = await this.request('/api/v1/tasks', params);
    return response.TaskId;
  }

  async pollTask(taskId) {
    const maxAttempts = 60; // 最多等待 60 秒
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getTaskStatus(taskId);
      
      if (status.Status === 'SUCCEEDED') {
        return status.Result;
      } else if (status.Status === 'FAILED') {
        throw new Error('识别任务失败：' + status.Message);
      }
      
      await this.sleep(1000);
    }
    throw new Error('任务超时');
  }

  async getTaskStatus(taskId) {
    return await this.request(`/api/v1/tasks/${taskId}`, {}, 'GET');
  }

  async request(path, params, method = 'POST') {
    // 实现签名和请求逻辑
    // ...
  }

  async uploadToOSS(filePath) {
    // 上传到 OSS 并返回 URL
    // ...
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AliyunASR;
```

### 2.2 识别结果格式

```json
{
  "Status": "SUCCEEDED",
  "Result": {
    "Sentences": [
      {
        "BeginTime": 1000,
        "EndTime": 4500,
        "Text": "这是第一句台词，显示在屏幕底部。",
        "SentenceId": 1
      },
      {
        "BeginTime": 5000,
        "EndTime": 8200,
        "Text": "第二句台词，带有情感表达。",
        "SentenceId": 2
      },
      {
        "BeginTime": 9000,
        "EndTime": 12000,
        "Text": "第三句台词，配合背景音乐高潮。",
        "SentenceId": 3
      }
    ]
  }
}
```

### 2.3 使用本地 Whisper（备选方案）

```bash
# 安装 Whisper
pip install openai-whisper

# 运行识别
whisper narration.mp3 --model medium --language zh --output_format srt
```

**Whisper 识别脚本：**

```javascript
// whisper_transcriber.js
const { exec } = require('child_process');
const path = require('path');

class WhisperTranscriber {
  constructor(options = {}) {
    this.model = options.model || 'medium';
    this.language = options.language || 'zh';
    this.whisperPath = options.whisperPath || 'whisper';
  }

  async transcribe(audioFile, outputDir) {
    return new Promise((resolve, reject) => {
      const command = `${this.whisperPath} "${audioFile}" ` +
        `--model ${this.model} ` +
        `--language ${this.language} ` +
        `--output_format srt ` +
        `--output_dir "${outputDir}"`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        // 返回生成的 SRT 文件路径
        const baseName = path.basename(audioFile, path.extname(audioFile));
        const srtPath = path.join(outputDir, `${baseName}.srt`);
        resolve(srtPath);
      });
    });
  }
}

module.exports = WhisperTranscriber;
```

---

## 3. 文本分段优化

### 3.1 使用 LLM 进行语义切分

**问题：** 原始 ASR 结果可能句子过长或过短，不适合字幕显示

**解决方案：** 使用通义千问进行智能分段

```javascript
// subtitle_optimizer.js
const QwenClient = require('./qwen_client');

class SubtitleOptimizer {
  constructor(qwenApiKey) {
    this.qwen = new QwenClient(qwenApiKey);
  }

  /**
   * 优化字幕文本分段
   * @param {Array} sentences - ASR 识别结果
   * @returns {Promise<Array>} - 优化后的字幕段落
   */
  async optimize(sentences) {
    // 合并所有文本
    const fullText = sentences.map(s => s.Text).join('');
    
    // 构建提示词
    const prompt = this.buildPrompt(fullText, sentences);
    
    // 调用 LLM
    const response = await this.qwen.chat(prompt);
    
    // 解析结果
    return this.parseResponse(response, sentences);
  }

  buildPrompt(fullText, sentences) {
    return `你是一个专业的字幕编辑。请将以下视频台词进行字幕分段优化。

要求：
1. 每行字幕不超过 20 个中文字符
2. 每段字幕显示时间 2-5 秒
3. 保持语义完整性，不要在词语中间切断
4. 保持原有时间戳的相对位置

原始台词（带时间戳）：
${sentences.map((s, i) => 
  `[${this.formatTime(s.BeginTime)}-${this.formatTime(s.EndTime)}] ${s.Text}`
).join('\n')}

请按以下 JSON 格式返回优化结果：
[
  {"start": "00:00:01,000", "end": "00:00:04,500", "text": "优化后的第一句"},
  {"start": "00:00:05,000", "end": "00:00:08,200", "text": "优化后的第二句"}
]

只返回 JSON，不要其他内容。`;
  }

  formatTime(ms) {
    const date = new Date(ms);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
  }

  parseResponse(response, originalSentences) {
    try {
      const optimized = JSON.parse(response);
      return optimized;
    } catch (e) {
      // 解析失败，返回原始结果
      console.warn('LLM 解析失败，使用原始 ASR 结果');
      return originalSentences.map(s => ({
        start: this.formatTime(s.BeginTime),
        end: this.formatTime(s.EndTime),
        text: s.Text
      }));
    }
  }
}

module.exports = SubtitleOptimizer;
```

### 3.2 分段规则

```javascript
// subtitle_rules.js

const SUBTITLE_RULES = {
  // 最大字符数（中文）
  maxCharsPerLine: 20,
  
  // 最大行数
  maxLines: 2,
  
  // 最小显示时间（秒）
  minDuration: 2.0,
  
  // 最大显示时间（秒）
  maxDuration: 5.0,
  
  // 阅读速度（字符/秒）
  readingSpeed: 12,
  
  // 避免切断的位置
  avoidBreakPoints: [
    '的', '了', '在', '是', '我', '有', '和', '就',
    '不', '人', '都', '一', '就', '这', '个', '上'
  ]
};

/**
 * 智能切分长句
 */
function splitLongSentence(text, startTime, endTime) {
  const duration = (endTime - startTime) / 1000;
  const maxChars = Math.floor(duration * SUBTITLE_RULES.readingSpeed);
  
  if (text.length <= maxChars) {
    return [{ text, startTime, endTime }];
  }
  
  // 在合适的标点处切分
  const splitPoints = findSplitPoints(text, maxChars);
  return createSegments(text, splitPoints, startTime, endTime);
}

/**
 * 查找合适的切分点
 */
function findSplitPoints(text, maxChars) {
  const punctuation = ['。', '！', '？', '；', '，', '、', '…'];
  const points = [];
  
  for (let i = maxChars; i < text.length; i++) {
    if (punctuation.includes(text[i])) {
      points.push(i + 1);
      i += maxChars; // 跳过一段
    }
  }
  
  return points;
}
```

---

## 4. 字幕格式

### 4.1 SRT 格式

**格式说明：**

```
序号
开始时间 --> 结束时间
字幕文本
（空行）
```

**示例：**

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

**SRT 生成器：**

```javascript
// srt_generator.js

class SRTGenerator {
  /**
   * 生成 SRT 文件内容
   * @param {Array} subtitles - 字幕数组
   * @returns {string} SRT 文件内容
   */
  generate(subtitles) {
    return subtitles.map((sub, index) => {
      return `${index + 1}\n${sub.start} --> ${sub.end}\n${sub.text}\n`;
    }).join('\n');
  }

  /**
   * 保存 SRT 文件
   * @param {Array} subtitles 
   * @param {string} outputPath 
   */
  save(subtitles, outputPath) {
    const fs = require('fs');
    const content = this.generate(subtitles);
    fs.writeFileSync(outputPath, content, 'utf-8');
  }

  /**
   * 从 SRT 文件解析
   * @param {string} srtPath 
   * @returns {Array}
   */
  parse(srtPath) {
    const fs = require('fs');
    const content = fs.readFileSync(srtPath, 'utf-8');
    
    const blocks = content.trim().split('\n\n');
    return blocks.map(block => {
      const lines = block.split('\n');
      return {
        index: parseInt(lines[0]),
        start: lines[1].split(' --> ')[0],
        end: lines[1].split(' --> ')[1],
        text: lines.slice(2).join('\n')
      };
    });
  }
}

module.exports = SRTGenerator;
```

### 4.2 ASS 格式（高级样式）

**格式说明：** ASS 支持字体、颜色、位置、动画等高级样式

**示例：**

```ass
[Script Info]
Title: AI 短剧 第 1 集
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
Timer: 100.0000

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Source Han Sans CN,48,&H00FFFFFF,&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,50,50,50,1
Style: Emotion,Source Han Sans CN,48,&H00FFFF00,&H00000000,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,2,0,2,50,50,50,1
Style: Narration,Source Han Sans CN,36,&H00CCCCCC,&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,50,50,150,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.50,Default,,0,0,0,,这是第一句台词
Dialogue: 0,0:00:05.00,0:00:08.20,Emotion,,0,0,0,{\be2}第二句台词{\r}
Dialogue: 0,0:00:09.00,0:00:12.00,Narration,,0,0,0,,（旁白）这是一个重要的时刻
```

**ASS 生成器：**

```javascript
// ass_generator.js

class ASSGenerator {
  constructor() {
    this.styles = new Map();
    this.events = [];
  }

  addStyle(name, config) {
    this.styles.set(name, {
      name,
      fontname: config.fontname || 'Source Han Sans CN',
      fontsize: config.fontsize || 48,
      primarycolor: config.primarycolor || '&H00FFFFFF',
      secondarycolor: config.secondarycolor || '&H00000000',
      outlinecolor: config.outlinecolor || '&H00000000',
      backcolor: config.backcolor || '&H00000000',
      bold: config.bold || 0,
      italic: config.italic || 0,
      underline: config.underline || 0,
      strikeout: config.strikeout || 0,
      scalex: config.scalex || 100,
      scaley: config.scaley || 100,
      spacing: config.spacing || 0,
      angle: config.angle || 0,
      borderstyle: config.borderstyle || 1,
      outline: config.outline || 2,
      shadow: config.shadow || 0,
      alignment: config.alignment || 2,
      marginl: config.marginl || 50,
      marginr: config.marginr || 50,
      marginv: config.marginv || 50,
      encoding: config.encoding || 1
    });
  }

  addEvent(start, end, text, style = 'Default') {
    this.events.push({
      layer: 0,
      start: this.formatTimeAss(start),
      end: this.formatTimeAss(end),
      style,
      name: '',
      marginl: 0,
      marginr: 0,
      marginv: 0,
      effect: '',
      text
    });
  }

  formatTimeAss(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }

  generate() {
    let content = `[Script Info]
Title: AI Drama Subtitle
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
`;

    for (const style of this.styles.values()) {
      content += `Style: ${style.name},${style.fontname},${style.fontsize},${style.primarycolor},${style.secondarycolor},${style.outlinecolor},${style.backcolor},${style.bold},${style.italic},${style.underline},${style.strikeout},${style.scalex},${style.scaley},${style.spacing},${style.angle},${style.borderstyle},${style.outline},${style.shadow},${style.alignment},${style.marginl},${style.marginr},${style.marginv},${style.encoding}\n`;
    }

    content += `
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    for (const event of this.events) {
      content += `Dialogue: ${event.layer},${event.start},${event.end},${event.style},${event.name},${event.marginl},${event.marginr},${event.marginv},${event.effect},${event.text}\n`;
    }

    return content;
  }

  save(outputPath) {
    const fs = require('fs');
    fs.writeFileSync(outputPath, this.generate(), 'utf-8');
  }
}

module.exports = ASSGenerator;
```

---

## 5. 字幕渲染

### 5.1 FFmpeg 嵌入字幕

```bash
# 嵌入 SRT 字幕
ffmpeg -i video.mp4 \
  -vf "subtitles=subtitle.srt:force_style='FontSize=48,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,MarginV=50'" \
  -c:a copy \
  output.mp4
```

### 5.2 软字幕 vs 硬字幕

**硬字幕（推荐）：**
- 字幕永久嵌入视频
- 兼容性好，任何播放器都能显示
- 无法关闭或修改

```bash
ffmpeg -i video.mp4 -vf "subtitles=subtitle.srt" output.mp4
```

**软字幕：**
- 字幕作为独立轨道
- 可开关，可切换语言
- 部分播放器可能不支持

```bash
ffmpeg -i video.mp4 -i subtitle.srt \
  -c:v copy -c:a copy -c:s mov_text \
  output.mp4
```

### 5.3 多语言字幕

```bash
# 添加多条字幕轨道（中英文）
ffmpeg -i video.mp4 \
  -i subtitle_zh.srt \
  -i subtitle_en.srt \
  -c:v copy -c:a copy \
  -c:s:0 mov_text -metadata:s:s:0 language=chi \
  -c:s:1 mov_text -metadata:s:s:1 language=eng \
  output.mp4
```

---

## 6. 完整字幕生成流程

### 6.1 主流程脚本

```javascript
// subtitle_pipeline.js
const AliyunASR = require('./asr_client');
const SubtitleOptimizer = require('./subtitle_optimizer');
const SRTGenerator = require('./srt_generator');

class SubtitlePipeline {
  constructor(config) {
    this.asr = new AliyunASR(config.aliyun);
    this.optimizer = new SubtitleOptimizer(config.qwen);
    this.srtGen = new SRTGenerator();
  }

  /**
   * 完整字幕生成流程
   * @param {string} audioFile - 配音音频文件
   * @param {string} outputSrt - 输出 SRT 路径
   * @param {boolean} optimize - 是否进行 LLM 优化
   */
  async generate(audioFile, outputSrt, optimize = true) {
    console.log('开始字幕生成流程...');
    
    // 步骤 1: 语音识别
    console.log('1. 语音识别中...');
    const asrResult = await this.asr.transcribe(audioFile);
    console.log(`   识别完成，共 ${asrResult.Sentences.length} 句`);
    
    // 步骤 2: 文本优化（可选）
    let subtitles;
    if (optimize) {
      console.log('2. 文本优化中...');
      subtitles = await this.optimizer.optimize(asrResult.Sentences);
      console.log(`   优化完成，共 ${subtitles.length} 段`);
    } else {
      subtitles = asrResult.Sentences.map(s => ({
        start: this.formatTime(s.BeginTime),
        end: this.formatTime(s.EndTime),
        text: s.Text
      }));
    }
    
    // 步骤 3: 生成 SRT
    console.log('3. 生成 SRT 文件...');
    this.srtGen.save(subtitles, outputSrt);
    console.log(`   保存至：${outputSrt}`);
    
    return { success: true, subtitleCount: subtitles.length };
  }

  formatTime(ms) {
    const date = new Date(ms);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
  }
}

// 使用示例
async function main() {
  const pipeline = new SubtitlePipeline({
    aliyun: {
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET
    },
    qwen: {
      apiKey: process.env.QWEN_API_KEY
    }
  });

  await pipeline.generate(
    './inputs/audio/narration.mp3',
    './outputs/subtitles/episode_01.srt',
    true
  );
}

main().catch(console.error);
```

### 6.2 命令行工具

```javascript
#!/usr/bin/env node
// subtitle-cli.js

const { program } = require('commander');
const SubtitlePipeline = require('./subtitle_pipeline');

program
  .name('subtitle-generator')
  .description('AI 短剧字幕生成工具')
  .version('1.0.0');

program
  .command('generate')
  .description('从音频生成字幕')
  .requiredOption('-i, --input <file>', '输入音频文件')
  .requiredOption('-o, --output <file>', '输出 SRT 文件')
  .option('--no-optimize', '跳过 LLM 优化')
  .option('--format <format>', '输出格式 (srt/ass)', 'srt')
  .action(async (options) => {
    const pipeline = new SubtitlePipeline({
      aliyun: {
        accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET
      },
      qwen: {
        apiKey: process.env.QWEN_API_KEY
      }
    });

    try {
      const result = await pipeline.generate(
        options.input,
        options.output,
        options.optimize
      );
      console.log('✅ 字幕生成完成！');
      console.log(`   段落数：${result.subtitleCount}`);
    } catch (error) {
      console.error('❌ 生成失败:', error.message);
      process.exit(1);
    }
  });

program.parse();
```

**使用方式：**

```bash
# 基础用法
node subtitle-cli.js generate -i narration.mp3 -o subtitle.srt

# 跳过优化（快速模式）
node subtitle-cli.js generate -i narration.mp3 -o subtitle.srt --no-optimize

# 指定环境变量
export ALIYUN_ACCESS_KEY_ID=xxx
export ALIYUN_ACCESS_KEY_SECRET=xxx
export QWEN_API_KEY=xxx
node subtitle-cli.js generate -i narration.mp3 -o subtitle.srt
```

---

## 7. 质量检查

### 7.1 字幕质量指标

| 指标 | 标准 | 检测方法 |
|------|------|----------|
| 准确率 | > 98% | 人工抽检 |
| 时间同步 | 误差 < 100ms | 自动检测 |
| 单行长度 | ≤ 20 字符 | 规则检查 |
| 显示时长 | 2-5 秒 | 规则检查 |
| 错别字 | 0 | LLM 校对 |

### 7.2 自动检查脚本

```javascript
// subtitle_validator.js

class SubtitleValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validate(subtitles) {
    this.errors = [];
    this.warnings = [];

    for (let i = 0; i < subtitles.length; i++) {
      const sub = subtitles[i];
      this.checkDuration(sub, i);
      this.checkLength(sub, i);
      this.checkOverlap(subtitles, i);
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  checkDuration(sub, index) {
    const start = this.parseTime(sub.start);
    const end = this.parseTime(sub.end);
    const duration = (end - start) / 1000;

    if (duration < 1.0) {
      this.errors.push(`第${index + 1}条：显示时间过短 (${duration.toFixed(2)}秒)`);
    } else if (duration > 7.0) {
      this.warnings.push(`第${index + 1}条：显示时间过长 (${duration.toFixed(2)}秒)`);
    }
  }

  checkLength(sub, index) {
    const lines = sub.text.split('\n');
    for (const line of lines) {
      if (line.length > 25) {
        this.warnings.push(`第${index + 1}条：单行过长 (${line.length}字符)`);
      }
    }
  }

  checkOverlap(subtitles, index) {
    if (index === 0) return;

    const prevEnd = this.parseTime(subtitles[index - 1].end);
    const currStart = this.parseTime(subtitles[index].start);

    if (currStart < prevEnd) {
      this.errors.push(`第${index + 1}条：与上一条重叠`);
    }
  }

  parseTime(timeStr) {
    const [time, ms] = timeStr.split(',');
    const [h, m, s] = time.split(':').map(Number);
    return ((h * 3600 + m * 60 + s) * 1000) + parseInt(ms);
  }
}

module.exports = SubtitleValidator;
```

---

## 8. 性能优化

### 8.1 批量处理

```javascript
// 并行处理多个音频文件
const files = ['ep1.mp3', 'ep2.mp3', 'ep3.mp3', 'ep4.mp3', 'ep5.mp3'];
const results = await Promise.all(
  files.map(file => pipeline.generate(file, `sub_${file.replace('.mp3', '.srt')}`))
);
```

### 8.2 缓存机制

```javascript
// 避免重复识别相同音频
const crypto = require('crypto');

async function getCacheKey(audioFile) {
  const hash = crypto.createHash('md5');
  hash.update(fs.readFileSync(audioFile));
  return hash.digest('hex');
}

async function transcribeWithCache(audioFile) {
  const cacheKey = await getCacheKey(audioFile);
  const cached = await redis.get(`asr:${cacheKey}`);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const result = await asr.transcribe(audioFile);
  await redis.setex(`asr:${cacheKey}`, 86400 * 7, JSON.stringify(result));
  return result;
}
```

---

**文档版本：** v1.0  
**最后更新：** 2026-03-07  
**维护者：** Subagent-09
