/**
 * 字幕生成类
 * 支持从音频生成字幕（ASR）和字幕格式转换
 */

const fs = require('fs-extra');
const path = require('path');

class SubtitleGenerator {
  /**
   * 创建字幕生成器
   * @param {Object} config - 配置
   * @param {string} config.asrProvider - ASR 服务提供商 (aliyun/whisper)
   * @param {Object} config.aliyun - 阿里云配置
   * @param {Object} config.qwen - 通义千问配置（用于文本优化）
   */
  constructor(config = {}) {
    this.asrProvider = config.asrProvider || 'whisper';
    this.aliyunConfig = config.aliyun;
    this.qwenConfig = config.qwen;
  }

  /**
   * 从音频生成字幕
   * @param {string} audioPath - 音频文件路径
   * @param {string} outputPath - 输出 SRT 路径
   * @param {boolean} optimize - 是否使用 LLM 优化
   * @returns {Promise<Object>} 生成结果
   */
  async generateFromAudio(audioPath, outputPath, optimize = true) {
    try {
      // 步骤 1: 语音识别
      const asrResult = await this._transcribe(audioPath);
      
      // 步骤 2: 优化（可选）
      let subtitles = asrResult;
      if (optimize) {
        subtitles = await this._optimize(asrResult);
      }
      
      // 步骤 3: 生成 SRT
      await this._saveSRT(subtitles, outputPath);
      
      return {
        success: true,
        subtitleCount: subtitles.length,
        outputPath
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 语音识别（使用 Whisper）
   */
  async _transcribe(audioPath) {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    const outputDir = path.dirname(audioPath);
    const baseName = path.basename(audioPath, path.extname(audioPath));
    
    try {
      await execPromise(
        `whisper "${audioPath}" --model medium --language zh --output_format srt --output_dir "${outputDir}"`
      );
      
      const srtPath = path.join(outputDir, `${baseName}.srt`);
      return await this._parseSRT(srtPath);
    } catch (error) {
      throw new Error(`语音识别失败：${error.message}`);
    }
  }

  /**
   * 使用 LLM 优化字幕
   */
  async _optimize(subtitles) {
    // 简化实现：实际应调用通义千问 API
    // 这里只做基本的分段和长度调整
    return subtitles.map(sub => ({
      ...sub,
      text: this._truncateText(sub.text, 20)
    }));
  }

  /**
   * 截断文本到指定长度
   */
  _truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    // 在合适的标点处截断
    const punctuations = ['。', '！', '？', '；', '，', '、'];
    let cutIndex = maxLength;
    
    for (const punct of punctuations) {
      const idx = text.lastIndexOf(punct, maxLength);
      if (idx > maxLength / 2) {
        cutIndex = idx + 1;
        break;
      }
    }
    
    return text.substring(0, cutIndex);
  }

  /**
   * 解析 SRT 文件
   */
  async _parseSRT(srtPath) {
    const content = await fs.readFile(srtPath, 'utf-8');
    const blocks = content.trim().split('\n\n');
    
    return blocks.map(block => {
      const lines = block.split('\n');
      const timeLine = lines[1];
      const [start, end] = timeLine.split(' --> ');
      const text = lines.slice(2).join('\n');
      
      return { start, end, text };
    });
  }

  /**
   * 保存 SRT 文件
   */
  async _saveSRT(subtitles, outputPath) {
    const content = subtitles.map((sub, i) => 
      `${i + 1}\n${sub.start} --> ${sub.end}\n${sub.text}\n`
    ).join('\n');
    
    await fs.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * 格式转换：SRT 转 ASS
   */
  async convertToASS(srtPath, assPath, style = {}) {
    const subtitles = await this._parseSRT(srtPath);
    
    const assContent = this._generateASS(subtitles, style);
    await fs.writeFile(assPath, assContent, 'utf-8');
    
    return { success: true, outputPath: assPath };
  }

  /**
   * 生成 ASS 格式内容
   */
  _generateASS(subtitles, style) {
    const defaultStyle = {
      fontname: 'Source Han Sans CN',
      fontsize: 48,
      primarycolor: '&H00FFFFFF',
      outlinecolor: '&H00000000',
      alignment: 2,
      marginv: 50
    };
    
    const s = { ...defaultStyle, ...style };
    
    let content = `[Script Info]
Title: AI Drama Subtitle
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${s.fontname},${s.fontsize},${s.primarycolor},&H00000000,${s.outlinecolor},&H00000000,0,0,0,0,100,100,0,0,1,2,0,${s.alignment},50,50,${s.marginv},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
    
    for (const sub of subtitles) {
      const start = this._convertTimeToASS(sub.start);
      const end = this._convertTimeToASS(sub.end);
      content += `Dialogue: 0,${start},${end},Default,,0,0,0,,${sub.text}\n`;
    }
    
    return content;
  }

  /**
   * 转换时间格式：SRT -> ASS
   */
  _convertTimeToASS(srtTime) {
    // SRT: 00:00:01,000 -> ASS: 0:00:01.00
    const [time, ms] = srtTime.split(',');
    const [h, m, s] = time.split(':');
    return `${h}:${m}:${s}.${ms.substring(0, 2)}`;
  }
}

module.exports = SubtitleGenerator;
