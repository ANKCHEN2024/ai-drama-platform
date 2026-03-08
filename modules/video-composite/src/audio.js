/**
 * 音频混合类
 * 处理多轨道音频混合、音量调整、淡入淡出等
 */

const ffmpeg = require('fluent-ffmpeg');

class AudioMixer {
  /**
   * 创建音频混合器
   * @param {Object} config - 配置
   * @param {string} config.ffmpegPath - FFmpeg 路径
   */
  constructor(config = {}) {
    this.ffmpegPath = config.ffmpegPath || 'ffmpeg';
  }

  /**
   * 混合多个音频轨道
   * @param {Array<Object>} tracks - 音频轨道配置
   * @param {string} tracks[].file - 音频文件路径
   * @param {number} tracks[].volume - 音量 (0.0-1.0)
   * @param {number} tracks[].startTime - 开始时间 (秒)
   * @param {Object} tracks[].fade - 淡入淡出配置
   * @param {string} outputPath - 输出路径
   * @returns {Promise<Object>} 混合结果
   */
  async mix(tracks, outputPath) {
    if (tracks.length === 0) {
      throw new Error('至少需要一个音频轨道');
    }

    if (tracks.length === 1) {
      // 单轨道：直接复制
      await this._copy(tracks[0], outputPath);
      return { success: true, outputPath };
    }

    // 多轨道：混合
    return await this._mixMultiple(tracks, outputPath);
  }

  /**
   * 复制单轨道（可能应用音量调整）
   */
  async _copy(track, outputPath) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(track.file).setFfmpegPath(this.ffmpegPath);
      
      if (track.volume && track.volume !== 1.0) {
        command.audioFilters(`volume=${track.volume}`);
      }
      
      command
        .on('end', () => resolve({ success: true, outputPath }))
        .on('error', reject)
        .save(outputPath);
    });
  }

  /**
   * 混合多个音频轨道
   */
  async _mixMultiple(tracks, outputPath) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg().setFfmpegPath(this.ffmpegPath);
      
      // 添加所有输入
      tracks.forEach(track => command.input(track.file));
      
      // 构建滤镜链
      const filters = [];
      const inputLabels = tracks.map((_, i) => `${i}:a`);
      
      // 应用音量调整和淡入淡出
      const processedLabels = tracks.map((track, i) => {
        let label = `a${i}`;
        const filtersForTrack = [];
        
        // 音量调整
        if (track.volume && track.volume !== 1.0) {
          filtersForTrack.push(`volume=${track.volume}`);
        }
        
        // 淡入淡出
        if (track.fade) {
          const { fadeIn = 0, fadeOut = 0, duration } = track.fade;
          if (fadeIn > 0) {
            filtersForTrack.push(`afade=t=in:st=0:d=${fadeIn}`);
          }
          if (fadeOut > 0 && duration) {
            filtersForTrack.push(`afade=t=out:st=${duration - fadeOut}:d=${fadeOut}`);
          }
        }
        
        if (filtersForTrack.length > 0) {
          filters.push(`[${inputLabels[i]}]${filtersForTrack.join(',')}[${label}]`);
        }
        
        return label;
      });
      
      // 混合所有轨道
      const mixInputs = processedLabels.join(',');
      filters.push(`[${mixInputs}]amix=inputs=${tracks.length}:duration=longest:dropout_transition=3[out]`);
      
      command.complexFilter(filters.join(';'));
      
      // 输出配置
      command
        .outputOptions([
          '-c:a aac',
          '-b:a 128k',
          '-ar 48000',
          '-ac 2'
        ])
        .on('end', () => resolve({ success: true, outputPath }))
        .on('error', reject)
        .save(outputPath);
    });
  }

  /**
   * 为音频添加淡入淡出
   * @param {string} inputPath - 输入路径
   * @param {Object} options - 选项
   * @param {number} options.fadeIn - 淡入时长 (秒)
   * @param {number} options.fadeOut - 淡出时长 (秒)
   * @param {number} options.duration - 总时长 (秒)
   * @param {string} outputPath - 输出路径
   */
  async addFade(inputPath, options, outputPath) {
    const { fadeIn = 0, fadeOut = 0, duration } = options;
    
    return new Promise((resolve, reject) => {
      const filters = [];
      
      if (fadeIn > 0) {
        filters.push(`afade=t=in:st=0:d=${fadeIn}`);
      }
      
      if (fadeOut > 0 && duration) {
        filters.push(`afade=t=out:st=${duration - fadeOut}:d=${fadeOut}`);
      }
      
      if (filters.length === 0) {
        // 无需处理，直接复制
        await this._copy({ file: inputPath }, outputPath);
        resolve({ success: true, outputPath });
        return;
      }
      
      ffmpeg(inputPath)
        .setFfmpegPath(this.ffmpegPath)
        .audioFilters(filters.join(','))
        .on('end', () => resolve({ success: true, outputPath }))
        .on('error', reject)
        .save(outputPath);
    });
  }

  /**
   * 调整音频音量
   */
  async adjustVolume(inputPath, volume, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setFfmpegPath(this.ffmpegPath)
        .audioFilters(`volume=${volume}`)
        .on('end', () => resolve({ success: true, outputPath }))
        .on('error', reject)
        .save(outputPath);
    });
  }

  /**
   * 音频压缩（防止爆音）
   */
  async compress(inputPath, outputPath, options = {}) {
    const {
      threshold = 0.089,
      ratio = 9,
      attack = 200,
      release = 1000
    } = options;
    
    const filter = `acompressor=threshold=${threshold}:ratio=${ratio}:attack=${attack}:release=${release}`;
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setFfmpegPath(this.ffmpegPath)
        .audioFilters(filter)
        .on('end', () => resolve({ success: true, outputPath }))
        .on('error', reject)
        .save(outputPath);
    });
  }

  /**
   * 提取音频从视频
   */
  async extractFromVideo(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .setFfmpegPath(this.ffmpegPath)
        .noVideo()
        .audioCodec('aac')
        .audioBitrate('128k')
        .on('end', () => resolve({ success: true, outputPath }))
        .on('error', reject)
        .save(outputPath);
    });
  }
}

module.exports = AudioMixer;
