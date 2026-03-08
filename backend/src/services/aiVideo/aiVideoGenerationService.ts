import axios from 'axios';
import logger from '../../utils/logger';
import { prisma } from '../../config/database';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface VideoGenerationConfig {
  sceneId: number;
  templateId?: string;
  style?: string;
  duration?: number;
  resolution?: string;
  customPrompt?: string;
}

export interface VideoGenerationTask {
  id: string;
  sceneId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  createdAt: Date;
}

export class AIVideoGenerationService {
  private apiKey: string;
  private apiEndpoint: string;
  private storagePath: string;

  constructor() {
    this.apiKey = process.env.DASHSCOPE_API_KEY || '';
    this.apiEndpoint = process.env.DASHSCOPE_VIDEO_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1';
    this.storagePath = process.env.VIDEO_STORAGE_PATH || path.join(process.cwd(), 'storage', 'videos');
  }

  /**
   * 生成视频
   */
  async generateVideo(config: VideoGenerationConfig): Promise<{
    success: boolean;
    taskId?: string;
    errorMessage?: string;
  }> {
    try {
      logger.info('Starting AI video generation', {
        sceneId: config.sceneId,
        templateId: config.templateId,
      });

      // 获取分镜信息
      const scene = await prisma.sceneV2.findUnique({
        where: { id: config.sceneId },
        include: {
          episode: {
            include: {
              project: true,
            },
          },
        },
      });

      if (!scene) {
        throw new Error('Scene not found');
      }

      // 创建视频生成记录
      const videoGeneration = await prisma.videoGeneration.create({
        data: {
          sceneId: config.sceneId,
          status: 'pending',
          progress: 0,
          config: {
            templateId: config.templateId,
            style: config.style,
            duration: config.duration,
            resolution: config.resolution,
            customPrompt: config.customPrompt,
          },
        },
      });

      // 构建视频生成提示词
      const prompt = this.buildVideoPrompt(scene, config);

      // 调用视频生成 API（异步任务）
      const taskResponse = await this.callVideoGenerationAPI(prompt, config);

      // 更新记录
      await prisma.videoGeneration.update({
        where: { id: videoGeneration.id },
        data: {
          status: 'processing',
          externalTaskId: taskResponse.taskId,
          provider: 'dashscope',
          startedAt: new Date(),
        },
      });

      logger.info('Video generation task created', {
        taskId: videoGeneration.id,
        externalTaskId: taskResponse.taskId,
      });

      return {
        success: true,
        taskId: videoGeneration.id,
      };
    } catch (error) {
      logger.error('Video generation failed', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 构建视频生成提示词
   */
  private buildVideoPrompt(scene: any, config: VideoGenerationConfig): string {
    const style = config.style || '写实风格';
    const duration = config.duration || scene.duration || 10;

    return `${scene.content}

风格：${style}
时长：${duration}秒
镜头：${scene.location} - ${scene.timeOfDay}
${config.customPrompt ? `额外要求：${config.customPrompt}` : ''}

高质量，电影感，专业摄影`;
  }

  /**
   * 调用视频生成 API
   */
  private async callVideoGenerationAPI(
    prompt: string,
    config: VideoGenerationConfig
  ): Promise<{ taskId: string }> {
    try {
      const response = await axios.post(
        `${this.apiEndpoint}/services/aigc/video-generation`,
        {
          model: 'wanx-video-v1',
          input: {
            prompt: prompt,
          },
          parameters: {
            duration: config.duration || 10,
            resolution: config.resolution || '720p',
            style: config.style || 'realistic',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return {
        taskId: response.data.output?.taskId || response.data.request_id,
      };
    } catch (error) {
      logger.error('Video generation API call failed', error);
      throw new Error('视频生成 API 调用失败');
    }
  }

  /**
   * 查询视频生成进度
   */
  async checkGenerationProgress(taskId: string): Promise<{
    status: string;
    progress: number;
    videoUrl?: string;
    errorMessage?: string;
  }> {
    try {
      const videoGen = await prisma.videoGeneration.findUnique({
        where: { id: taskId },
      });

      if (!videoGen) {
        throw new Error('Task not found');
      }

      // 如果已完成，直接返回
      if (videoGen.status === 'completed' || videoGen.status === 'failed') {
        return {
          status: videoGen.status,
          progress: videoGen.progress,
          videoUrl: videoGen.videoUrl || undefined,
          errorMessage: videoGen.errorMessage || undefined,
        };
      }

      // 查询外部 API 进度
      if (videoGen.externalTaskId && videoGen.provider === 'dashscope') {
        const apiResponse = await this.queryExternalTaskStatus(videoGen.externalTaskId);

        await prisma.videoGeneration.update({
          where: { id: taskId },
          data: {
            status: apiResponse.status,
            progress: apiResponse.progress,
            videoUrl: apiResponse.videoUrl,
            errorMessage: apiResponse.errorMessage,
            completedAt: apiResponse.status === 'completed' || apiResponse.status === 'failed' ? new Date() : null,
          },
        });

        return {
          status: apiResponse.status,
          progress: apiResponse.progress,
          videoUrl: apiResponse.videoUrl,
          errorMessage: apiResponse.errorMessage,
        };
      }

      return {
        status: videoGen.status,
        progress: videoGen.progress,
      };
    } catch (error) {
      logger.error('Progress check failed', error);
      return {
        status: 'failed',
        progress: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 查询外部任务状态
   */
  private async queryExternalTaskStatus(externalTaskId: string): Promise<{
    status: string;
    progress: number;
    videoUrl?: string;
    errorMessage?: string;
  }> {
    try {
      const response = await axios.get(
        `${this.apiEndpoint}/tasks/${externalTaskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 10000,
        }
      );

      const taskStatus = response.data.output?.task_status || 'processing';
      const progress = response.data.output?.progress || 0;
      const videoUrl = response.data.output?.video_url;

      return {
        status: this.mapExternalStatus(taskStatus),
        progress,
        videoUrl,
      };
    } catch (error) {
      logger.error('External task status query failed', error);
      return {
        status: 'processing',
        progress: 50,
      };
    }
  }

  /**
   * 映射外部状态
   */
  private mapExternalStatus(externalStatus: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'pending',
      'RUNNING': 'processing',
      'SUCCEEDED': 'completed',
      'FAILED': 'failed',
      'CANCELLED': 'cancelled',
    };
    return statusMap[externalStatus] || 'processing';
  }

  /**
   * 合成视频（使用 FFmpeg）
   */
  async composeVideo(
    videoClips: string[],
    outputPath: string,
    options?: {
      audioPath?: string;
      bgmPath?: string;
      transitionDuration?: number;
    }
  ): Promise<{
    success: boolean;
    outputUrl?: string;
    errorMessage?: string;
  }> {
    try {
      logger.info('Starting video composition', {
        clipCount: videoClips.length,
        outputPath,
      });

      // 确保输出目录存在
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 创建临时文件列表
      const listFilePath = path.join(outputDir, 'clips_list.txt');
      const listContent = videoClips.map(clip => `file '${path.resolve(clip)}'`).join('\n');
      fs.writeFileSync(listFilePath, listContent);

      // 构建 FFmpeg 命令
      const ffmpegArgs: string[] = [
        '-f', 'concat',
        '-safe', '0',
        '-i', listFilePath,
      ];

      // 添加音频
      if (options?.audioPath) {
        ffmpegArgs.push('-i', options.audioPath);
      }

      // 添加背景音乐
      if (options?.bgmPath) {
        ffmpegArgs.push('-i', options.bgmPath);
      }

      // 输出参数
      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputPath
      );

      return await this.executeFFmpeg(ffmpegArgs);
    } catch (error) {
      logger.error('Video composition failed', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 执行 FFmpeg
   */
  private executeFFmpeg(args: string[]): Promise<{
    success: boolean;
    outputUrl?: string;
    errorMessage?: string;
  }> {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          const outputPath = args[args.length - 1];
          resolve({
            success: true,
            outputUrl: outputPath,
          });
        } else {
          resolve({
            success: false,
            errorMessage: `FFmpeg exited with code ${code}: ${stderr}`,
          });
        }
      });

      ffmpeg.on('error', (error) => {
        resolve({
          success: false,
          errorMessage: error.message,
        });
      });
    });
  }

  /**
   * 生成缩略图
   */
  async generateThumbnail(videoPath: string, thumbnailPath: string, timePosition: number = 1): Promise<{
    success: boolean;
    thumbnailUrl?: string;
    errorMessage?: string;
  }> {
    try {
      const args = [
        '-i', videoPath,
        '-ss', timePosition.toString(),
        '-vframes', '1',
        '-vf', 'scale=320:-1',
        '-y',
        thumbnailPath,
      ];

      const result = await this.executeFFmpeg(args);

      if (result.success) {
        return {
          success: true,
          thumbnailUrl: thumbnailPath,
        };
      }

      return result;
    } catch (error) {
      logger.error('Thumbnail generation failed', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取视频信息
   */
  async getVideoInfo(videoPath: string): Promise<{
    duration?: number;
    width?: number;
    height?: number;
    codec?: string;
  } | null> {
    try {
      return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          videoPath,
        ]);

        let output = '';

        ffprobe.stdout.on('data', (data) => {
          output += data.toString();
        });

        ffprobe.on('close', (code) => {
          if (code === 0) {
            try {
              const info = JSON.parse(output);
              const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
              resolve({
                duration: parseFloat(info.format.duration),
                width: videoStream?.width,
                height: videoStream?.height,
                codec: videoStream?.codec_name,
              });
            } catch {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      logger.error('Video info extraction failed', error);
      return null;
    }
  }
}

export const aiVideoGenerationService = new AIVideoGenerationService();
