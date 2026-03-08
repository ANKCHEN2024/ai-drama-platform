/**
 * 视频合成核心类
 * 负责 orchestrating 所有视频、音频、字幕的合成流程
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const TransitionManager = require('./transition');

class VideoComposer {
  /**
   * 创建视频合成器实例
   * @param {Object} config - 配置选项
   * @param {string} config.ffmpegPath - FFmpeg 可执行路径
   * @param {string} config.outputDir - 输出目录
   * @param {string} config.tempDir - 临时文件目录
   * @param {Object} config.outputPreset - 输出预设（分辨率、码率等）
   */
  constructor(config = {}) {
    this.ffmpegPath = config.ffmpegPath || 'ffmpeg';
    this.outputDir = config.outputDir || './outputs';
    this.tempDir = config.tempDir || './temp';
    this.outputPreset = config.outputPreset || {
      resolution: '1920x1080',
      fps: 30,
      videoCodec: 'libx264',
      videoBitrate: '8M',
      audioCodec: 'aac',
      audioBitrate: '128k',
      audioSampleRate: 48000
    };
    
    this.transitionManager = new TransitionManager();
    this.logger = config.logger || console;
    
    // 确保输出目录存在
    fs.ensureDirSync(this.outputDir);
    fs.ensureDirSync(this.tempDir);
  }

  /**
   * 合成视频
   * @param {Object} inputs - 输入文件配置
   * @param {Array<string>} inputs.videoClips - 视频片段路径数组
   * @param {string} inputs.voiceOver - 配音音频路径
   * @param {string} inputs.bgm - 背景音乐路径
   * @param {Array<string>} inputs.sfx - 音效数组
   * @param {string} inputs.subtitles - 字幕文件路径
   * @param {Array<Object>} inputs.transitions - 转场配置数组
   * @param {string} outputPath - 输出文件路径
   * @returns {Promise<Object>} 合成结果
   */
  async compose(inputs, outputPath) {
    const jobId = uuidv4();
    this.logger.info(`[Compose] 开始任务 ${jobId}`);
    
    try {
      // 1. 验证输入文件
      await this.validateInputs(inputs);
      this.logger.info(`[Compose] 输入文件验证通过`);
      
      // 2. 构建 FFmpeg 命令
      const command = this.buildFFmpegCommand(inputs);
      this.logger.info(`[Compose] FFmpeg 命令构建完成`);
      
      // 3. 执行合成
      await this.execute(command, outputPath);
      this.logger.info(`[Compose] 合成完成：${outputPath}`);
      
      // 4. 生成预览版本
      const previewPath = await this.generatePreview(outputPath);
      
      // 5. 生成封面图
      const thumbnailPath = await this.generateThumbnail(outputPath);
      
      return {
        success: true,
        jobId,
        outputPath,
        previewPath,
        thumbnailPath
      };
    } catch (error) {
      this.logger.error(`[Compose] 任务失败：${error.message}`);
      return {
        success: false,
        jobId,
        error: error.message
      };
    }
  }

  /**
   * 验证输入文件
   */
  async validateInputs(inputs) {
    const required = ['videoClips'];
    
    for (const field of required) {
      if (!inputs[field] || inputs[field].length === 0) {
        throw new Error(`缺少必要输入：${field}`);
      }
    }
    
    // 验证视频文件存在
    for (const clip of inputs.videoClips) {
      if (!await fs.pathExists(clip)) {
        throw new Error(`视频文件不存在：${clip}`);
      }
    }
    
    // 验证音频文件（如果提供）
    if (inputs.voiceOver && !await fs.pathExists(inputs.voiceOver)) {
      throw new Error(`配音文件不存在：${inputs.voiceOver}`);
    }
    
    if (inputs.bgm && !await fs.pathExists(inputs.bgm)) {
      throw new Error(`BGM 文件不存在：${inputs.bgm}`);
    }
  }

  /**
   * 构建 FFmpeg 命令
   */
  buildFFmpegCommand(inputs) {
    const {
      videoClips,
      voiceOver,
      bgm,
      sfx = [],
      subtitles,
      transitions = []
    } = inputs;
    
    // 创建 FFmpeg 命令
    let command = ffmpeg().setFfmpegPath(this.ffmpegPath);
    
    // 添加所有输入文件
    videoClips.forEach(clip => command.input(clip));
    if (voiceOver) command.input(voiceOver);
    if (bgm) command.input(bgm);
    sfx.forEach(sfxFile => command.input(sfxFile));
    
    // 构建视频滤镜链
    const videoFilters = this.buildVideoFilters(videoClips, transitions, subtitles);
    
    // 构建音频滤镜链
    const audioFilters = this.buildAudioFilters(voiceOver, bgm, sfx);
    
    // 合并滤镜
    const filterComplex = [...videoFilters, ...audioFilters].filter(f => f).join(';');
    
    if (filterComplex) {
      command.complexFilter(filterComplex);
    }
    
    // 配置输出参数
    command
      .outputOptions([
        `-c:v ${this.outputPreset.videoCodec}`,
        `-preset slow`,
        `-crf 20`,
        `-profile:v high`,
        `-level 4.2`,
        `-pix_fmt yuv420p`,
        `-c:a ${this.outputPreset.audioCodec}`,
        `-b:a ${this.outputPreset.audioBitrate}`,
        `-ar ${this.outputPreset.audioSampleRate}`,
        `-ac 2`
      ]);
    
    return command;
  }

  /**
   * 构建视频滤镜链
   */
  buildVideoFilters(videoClips, transitions, subtitles) {
    const filters = [];
    const [width, height] = this.outputPreset.resolution.split('x').map(Number);
    
    if (videoClips.length === 1) {
      // 单片段：只需缩放
      filters.push(`[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[scaled]`);
    } else {
      // 多片段：添加转场
      let currentOutput = '0:v';
      let offset = 0;
      
      // 获取第一个片段时长（简化处理，实际应使用 ffprobe）
      const clipDuration = 5; // 秒
      
      for (let i = 1; i < videoClips.length; i++) {
        const transition = transitions[i - 1] || { type: 'fade', duration: 0.5 };
        const nextInput = `${i}:v`;
        const outputLabel = i === videoClips.length - 1 ? 'vfinal' : `v${i}`;
        
        const filter = this.transitionManager.generateFilter(
          currentOutput,
          nextInput,
          outputLabel,
          transition.type,
          transition.duration,
          offset
        );
        
        filters.push(filter);
        currentOutput = outputLabel;
        offset += clipDuration - transition.duration;
      }
      
      // 缩放最后一个输出
      filters.push(`[vfinal]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[scaled]`);
    }
    
    // 添加字幕
    if (subtitles) {
      const subtitleFilter = `[scaled]subtitles=${subtitles.replace(/:/g, '\\:').replace(/'/g, '\\\'')}:force_style='FontSize=48,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Shadow=0,MarginV=50'[video_out]`;
      filters.push(subtitleFilter);
    } else {
      filters.push('[scaled][video_out]copy');
    }
    
    return filters;
  }

  /**
   * 构建音频滤镜链
   */
  buildAudioFilters(voiceOver, bgm, sfx) {
    const filters = [];
    const audioInputs = [];
    
    // 收集所有音频输入
    let audioIndex = 0;
    if (voiceOver) {
      audioInputs.push(`${audioIndex}:a`);
      audioIndex++;
    }
    if (bgm) {
      audioInputs.push(`${audioIndex}:a`);
      audioIndex++;
    }
    sfx.forEach(() => {
      audioInputs.push(`${audioIndex}:a`);
      audioIndex++;
    });
    
    if (audioInputs.length === 0) {
      return filters;
    }
    
    if (audioInputs.length === 1) {
      filters.push(`[${audioInputs[0]}]anull[audio_out]`);
    } else {
      // 混合所有音频
      const mixInputs = audioInputs.join(',');
      filters.push(`[${mixInputs}]amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=3[audio_out]`);
    }
    
    return filters;
  }

  /**
   * 执行 FFmpeg 命令
   */
  execute(command, outputPath) {
    return new Promise((resolve, reject) => {
      command
        .on('start', (cmd) => {
          this.logger.info(`[FFmpeg] 启动：${cmd}`);
        })
        .on('progress', (progress) => {
          this.logger.info(`[FFmpeg] 进度：${progress.percent || 0}%`);
        })
        .on('error', (err) => {
          reject(new Error(`FFmpeg 错误：${err.message}`));
        })
        .on('end', () => {
          resolve();
        })
        .save(outputPath);
    });
  }

  /**
   * 生成预览版本（低分辨率）
   */
  async generatePreview(inputPath) {
    const previewPath = inputPath.replace('.mp4', '_preview.mp4');
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setFfmpegPath(this.ffmpegPath)
        .outputOptions([
          '-vf scale=1280:720',
          '-c:v libx264',
          '-preset ultrafast',
          '-crf 28',
          '-c:a aac',
          '-b:a 64k'
        ])
        .on('end', () => resolve(previewPath))
        .on('error', reject)
        .save(previewPath);
    });
  }

  /**
   * 生成封面图
   */
  async generateThumbnail(videoPath) {
    const thumbnailPath = videoPath.replace('.mp4', '_thumbnail.jpg');
    
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .setFfmpegPath(this.ffmpegPath)
        .screenshots({
          timestamps: ['1%'],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: '1280x720'
        })
        .on('end', () => resolve(thumbnailPath))
        .on('error', reject);
    });
  }
}

module.exports = VideoComposer;
