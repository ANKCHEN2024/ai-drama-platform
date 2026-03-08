import { FFmpegManager } from './ffmpegManager';
import { TransitionManager } from './transitionManager';
import { VideoCompositeInput, VideoCompositeOutput, Transition } from './types';
import path from 'path';
import logger from '../../utils/logger';

export class VideoComposer {
  private ffmpegManager: FFmpegManager;
  private transitionManager: TransitionManager;
  private readonly outputPreset: {
    resolution: string;
    fps: number;
    videoCodec: string;
    videoBitrate: string;
    audioCodec: string;
    audioBitrate: string;
    audioSampleRate: number;
  };

  constructor() {
    this.ffmpegManager = new FFmpegManager();
    this.transitionManager = new TransitionManager();
    this.outputPreset = {
      resolution: '1920x1080',
      fps: 30,
      videoCodec: 'libx264',
      videoBitrate: '8M',
      audioCodec: 'aac',
      audioBitrate: '128k',
      audioSampleRate: 48000,
    };
  }

  async compose(input: VideoCompositeInput): Promise<VideoCompositeOutput> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.info(`Starting video composition job: ${jobId}`);

    const tempFiles: string[] = [];
    let localOutputPath = '';

    try {
      const {
        videoClips,
        voiceOver,
        bgm,
        sfx = [],
        subtitles,
        transitions = [],
        metadata,
        outputOptions,
      } = input;

      const options = { ...this.outputPreset, ...outputOptions };

      const localVideoClips: string[] = [];
      for (let i = 0; i < videoClips.length; i++) {
        const localPath = await this.ffmpegManager.downloadFile(
          videoClips[i],
          `clip_${jobId}_${i}.mp4`
        );
        localVideoClips.push(localPath);
        tempFiles.push(localPath);
      }

      let localVoiceOver: string | undefined;
      if (voiceOver) {
        localVoiceOver = await this.ffmpegManager.downloadFile(
          voiceOver,
          `voice_${jobId}.mp3`
        );
        tempFiles.push(localVoiceOver);
      }

      let localBgm: string | undefined;
      if (bgm) {
        localBgm = await this.ffmpegManager.downloadFile(
          bgm,
          `bgm_${jobId}.mp3`
        );
        tempFiles.push(localBgm);
      }

      const localSfx: string[] = [];
      for (let i = 0; i < sfx.length; i++) {
        const localPath = await this.ffmpegManager.downloadFile(
          sfx[i],
          `sfx_${jobId}_${i}.mp3`
        );
        localSfx.push(localPath);
        tempFiles.push(localPath);
      }

      let localSubtitles: string | undefined;
      if (subtitles) {
        localSubtitles = await this.ffmpegManager.downloadFile(
          subtitles,
          `subs_${jobId}.srt`
        );
        tempFiles.push(localSubtitles);
      }

      localOutputPath = path.join(this.ffmpegManager['tempDir'], `output_${jobId}.mp4`);
      tempFiles.push(localOutputPath);

      await this.buildAndExecuteFFmpegCommand(
        localVideoClips,
        localVoiceOver,
        localBgm,
        localSfx,
        localSubtitles,
        transitions,
        localOutputPath,
        options
      );

      const objectName = `videos/${metadata?.project_id || 'unknown'}/${metadata?.episode_id || 'unknown'}/${jobId}.mp4`;
      const videoUrl = await this.ffmpegManager.uploadToMinIO(localOutputPath, objectName);

      const localPreviewPath = path.join(this.ffmpegManager['tempDir'], `preview_${jobId}.mp4`);
      tempFiles.push(localPreviewPath);
      await this.generatePreview(localOutputPath, localPreviewPath);
      const previewObjectName = `videos/${metadata?.project_id || 'unknown'}/${metadata?.episode_id || 'unknown'}/${jobId}_preview.mp4`;
      const previewUrl = await this.ffmpegManager.uploadToMinIO(localPreviewPath, previewObjectName);

      const localThumbnailPath = path.join(this.ffmpegManager['tempDir'], `thumb_${jobId}.jpg`);
      tempFiles.push(localThumbnailPath);
      await this.generateThumbnail(localOutputPath, localThumbnailPath);
      const thumbnailObjectName = `videos/${metadata?.project_id || 'unknown'}/${metadata?.episode_id || 'unknown'}/${jobId}_thumb.jpg`;
      const thumbnailUrl = await this.ffmpegManager.uploadToMinIO(localThumbnailPath, thumbnailObjectName);

      const duration = await this.ffmpegManager.getVideoDuration(localOutputPath);
      const fs = await import('fs-extra');
      const stat = await fs.stat(localOutputPath);

      logger.info(`Video composition completed: ${jobId}`);

      return {
        video_url: videoUrl,
        preview_url: previewUrl,
        thumbnail_url: thumbnailUrl,
        duration,
        resolution: options.resolution || this.outputPreset.resolution,
        file_size: stat.size,
      };
    } finally {
      await this.ffmpegManager.cleanupTempFiles(tempFiles);
    }
  }

  private async buildAndExecuteFFmpegCommand(
    videoClips: string[],
    voiceOver: string | undefined,
    bgm: string | undefined,
    sfx: string[],
    subtitles: string | undefined,
    transitions: Transition[],
    outputPath: string,
    options: any
  ): Promise<void> {
    let command = `${this.ffmpegManager['ffmpegPath']} -y`;

    videoClips.forEach(clip => {
      command += ` -i "${clip}"`;
    });

    if (voiceOver) command += ` -i "${voiceOver}"`;
    if (bgm) command += ` -i "${bgm}"`;
    sfx.forEach(sfxFile => {
      command += ` -i "${sfxFile}"`;
    });

    const filterComplex = this.buildFilterComplex(
      videoClips.length,
      !!voiceOver,
      !!bgm,
      sfx.length,
      subtitles,
      transitions,
      options
    );

    if (filterComplex) {
      command += ` -filter_complex "${filterComplex}"`;
    }

    command += ` -c:v ${options.videoCodec} -preset slow -crf 20 -profile:v high -level 4.2 -pix_fmt yuv420p`;
    command += ` -c:a ${options.audioCodec} -b:a ${options.audioBitrate} -ar ${options.audioSampleRate} -ac 2`;
    command += ` "${outputPath}"`;

    await this.ffmpegManager.executeCommand(command);
  }

  private buildFilterComplex(
    videoCount: number,
    hasVoiceOver: boolean,
    hasBgm: boolean,
    sfxCount: number,
    subtitles: string | undefined,
    transitions: Transition[],
    options: any
  ): string {
    const filters: string[] = [];
    const [width, height] = options.resolution.split('x').map(Number);

    if (videoCount === 1) {
      filters.push(`[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[scaled]`);
    } else {
      let currentOutput = '0:v';
      let offset = 0;
      const clipDuration = 5;

      for (let i = 1; i < videoCount; i++) {
        const transition = transitions[i - 1] || { type: 'fade', duration: 0.5 };
        const nextInput = `${i}:v`;
        const outputLabel = i === videoCount - 1 ? 'vfinal' : `v${i}`;

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

      filters.push(`[vfinal]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[scaled]`);
    }

    if (subtitles) {
      const escapedSubs = subtitles.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, '\\\'');
      filters.push(`[scaled]subtitles='${escapedSubs}':force_style='FontSize=48,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Shadow=0,MarginV=50'[video_out]`);
    } else {
      filters.push('[scaled]null[video_out]');
    }

    const audioInputs: string[] = [];
    let audioIndex = videoCount;
    if (hasVoiceOver) {
      audioInputs.push(`${audioIndex}:a`);
      audioIndex++;
    }
    if (hasBgm) {
      audioInputs.push(`${audioIndex}:a`);
      audioIndex++;
    }
    sfx.forEach(() => {
      audioInputs.push(`${audioIndex}:a`);
      audioIndex++;
    });

    if (audioInputs.length === 1) {
      filters.push(`[${audioInputs[0]}]anull[audio_out]`);
    } else if (audioInputs.length > 1) {
      const mixInputs = audioInputs.join(',');
      filters.push(`[${mixInputs}]amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=3[audio_out]`);
    }

    return filters.filter(f => f).join(';');
  }

  private async generatePreview(inputPath: string, outputPath: string): Promise<void> {
    const command = `${this.ffmpegManager['ffmpegPath']} -y -i "${inputPath}" -vf scale=1280:720 -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k "${outputPath}"`;
    await this.ffmpegManager.executeCommand(command);
  }

  private async generateThumbnail(videoPath: string, outputPath: string): Promise<void> {
    const command = `${this.ffmpegManager['ffmpegPath']} -y -i "${videoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${outputPath}"`;
    await this.ffmpegManager.executeCommand(command);
  }
}
