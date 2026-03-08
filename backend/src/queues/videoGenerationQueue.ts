import { Queue, Worker, Job } from 'bullmq';
import logger from '../utils/logger';
import { prisma } from '../config/database';
import { aiVideoGenerationService } from '../services/aiVideo/aiVideoGenerationService';
import { aiScriptService } from '../services/aiScript/aiScriptService';
import Redis from 'ioredis';

export interface VideoGenerationJobData {
  type: 'script' | 'storyboard' | 'video' | 'compose';
  projectId?: number;
  episodeId?: number;
  sceneId?: number;
  config?: any;
}

export interface JobProgress {
  status: string;
  progress: number;
  message?: string;
}

export class VideoGenerationQueue {
  private queue: Queue<VideoGenerationJobData, any, string>;
  private worker: Worker<VideoGenerationJobData, any, string>;
  private redisConnection: Redis;

  constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    };

    this.redisConnection = new Redis(redisConfig);

    this.queue = new Queue<VideoGenerationJobData, any, string>('video-generation', {
      connection: this.redisConnection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    this.worker = new Worker<VideoGenerationJobData, any, string>(
      'video-generation',
      async (job) => this.processJob(job),
      {
        connection: this.redisConnection,
        concurrency: parseInt(process.env.VIDEO_QUEUE_CONCURRENCY || '3'),
      }
    );

    this.setupEventHandlers();

    logger.info('Video generation queue initialized');
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers() {
    this.worker.on('completed', async (job) => {
      logger.info('Job completed', { jobId: job.id, type: job.data.type });
      
      // 更新数据库状态
      await this.updateJobStatus(job.id || '', 'completed', 100);
    });

    this.worker.on('failed', async (job, error) => {
      logger.error('Job failed', { jobId: job?.id, type: job?.data.type, error });
      
      // 更新数据库状态
      if (job?.id) {
        await this.updateJobStatus(job.id, 'failed', 0, error.message);
      }
    });

    this.worker.on('progress', async (job, progress) => {
      logger.debug('Job progress', { jobId: job.id, progress });
      
      // 更新数据库进度
      if (job?.id && typeof progress === 'object') {
        await this.updateJobStatus(job.id, progress.status, progress.progress, progress.message);
      }
    });
  }

  /**
   * 处理作业
   */
  private async processJob(job: Job<VideoGenerationJobData>) {
    const { type, projectId, episodeId, sceneId, config } = job.data;

    logger.info('Processing job', { jobId: job.id, type, projectId, episodeId, sceneId });

    try {
      switch (type) {
        case 'script':
          return await this.processScriptGeneration(job, projectId!, episodeId!, config);
        
        case 'storyboard':
          return await this.processStoryboardGeneration(job, episodeId!);
        
        case 'video':
          return await this.processVideoGeneration(job, sceneId!, config);
        
        case 'compose':
          return await this.processVideoComposition(job, projectId!, episodeId!, config);
        
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    } catch (error) {
      logger.error('Job processing failed', error);
      throw error;
    }
  }

  /**
   * 处理剧本生成
   */
  private async processScriptGeneration(
    job: Job<VideoGenerationJobData>,
    projectId: number,
    episodeId: number,
    config: any
  ) {
    await job.updateProgress({
      status: 'generating',
      progress: 10,
      message: '正在生成剧本...',
    });

    const result = await aiScriptService.generateScript({
      projectId,
      episodeNumber: episodeId,
      ...config,
    });

    await job.updateProgress({
      status: 'generating',
      progress: 100,
      message: '剧本生成完成',
    });

    if (!result.success) {
      throw new Error(result.errorMessage);
    }

    return {
      episodeId: result.episodeId,
      title: result.title,
    };
  }

  /**
   * 处理分镜生成
   */
  private async processStoryboardGeneration(
    job: Job<VideoGenerationJobData>,
    episodeId: number
  ) {
    await job.updateProgress({
      status: 'generating',
      progress: 10,
      message: '正在生成分镜...',
    });

    const result = await aiScriptService.generateStoryboardsFromScript(episodeId);

    await job.updateProgress({
      status: 'generating',
      progress: 100,
      message: `分镜生成完成，共${result.storyboardCount}个场景`,
    });

    if (!result.success) {
      throw new Error(result.errorMessage);
    }

    return {
      storyboardCount: result.storyboardCount,
    };
  }

  /**
   * 处理视频生成
   */
  private async processVideoGeneration(
    job: Job<VideoGenerationJobData>,
    sceneId: number,
    config: any
  ) {
    await job.updateProgress({
      status: 'generating',
      progress: 10,
      message: '正在生成视频...',
    });

    const result = await aiVideoGenerationService.generateVideo({
      sceneId,
      ...config,
    });

    if (!result.success) {
      throw new Error(result.errorMessage);
    }

    // 轮询进度直到完成
    let progress = 10;
    while (progress < 100) {
      const status = await aiVideoGenerationService.checkGenerationProgress(result.taskId!);
      progress = status.progress;
      
      await job.updateProgress({
        status: status.status,
        progress,
        message: `视频生成进度：${progress}%`,
      });

      if (status.status === 'completed' || status.status === 'failed') {
        break;
      }

      // 等待 5 秒后再次检查
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (progress < 100) {
      throw new Error('视频生成失败');
    }

    return {
      taskId: result.taskId,
      videoUrl: status?.videoUrl,
    };
  }

  /**
   * 处理视频合成
   */
  private async processVideoComposition(
    job: Job<VideoGenerationJobData>,
    projectId: number,
    episodeId: number,
    config: any
  ) {
    await job.updateProgress({
      status: 'composing',
      progress: 10,
      message: '正在合成视频...',
    });

    // 获取所有分镜的视频
    const scenes = await prisma.sceneV2.findMany({
      where: {
        episodeId,
        status: 'completed',
      },
      orderBy: { number: 'asc' },
      include: {
        videoGenerations: {
          where: { status: 'completed' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (scenes.length === 0) {
      throw new Error('没有可用的视频片段');
    }

    await job.updateProgress({
      status: 'composing',
      progress: 30,
      message: `准备合成${scenes.length}个视频片段...`,
    });

    // 收集视频路径
    const videoClips = scenes
      .map(scene => scene.videoGenerations[0]?.videoUrl)
      .filter(Boolean) as string[];

    if (videoClips.length === 0) {
      throw new Error('所有视频片段都不可用');
    }

    // 构建输出路径
    const outputPath = `/tmp/composed_${projectId}_${episodeId}_${Date.now()}.mp4`;

    await job.updateProgress({
      status: 'composing',
      progress: 50,
      message: '正在合并视频片段...',
    });

    // 合成视频
    const composeResult = await aiVideoGenerationService.composeVideo(videoClips, outputPath, {
      bgmPath: config.bgmPath,
      transitionDuration: config.transitionDuration,
    });

    if (!composeResult.success) {
      throw new Error(composeResult.errorMessage);
    }

    await job.updateProgress({
      status: 'composing',
      progress: 80,
      message: '正在生成缩略图...',
    });

    // 生成缩略图
    const thumbnailPath = outputPath.replace('.mp4', '_thumb.jpg');
    await aiVideoGenerationService.generateThumbnail(outputPath, thumbnailPath);

    await job.updateProgress({
      status: 'composing',
      progress: 100,
      message: '视频合成完成',
    });

    // 更新剧集状态
    await prisma.episodeV2.update({
      where: { id: episodeId },
      data: {
        status: 'completed',
        videoUrl: outputPath,
        thumbnailUrl: thumbnailPath,
      },
    });

    return {
      videoUrl: outputPath,
      thumbnailUrl,
    };
  }

  /**
   * 更新作业状态
   */
  private async updateJobStatus(
    jobId: string,
    status: string,
    progress: number,
    errorMessage?: string
  ) {
    try {
      // 查找关联的视频生成记录
      const videoGen = await prisma.videoGeneration.findFirst({
        where: {
          OR: [
            { id: jobId },
            { externalTaskId: jobId },
          ],
        },
      });

      if (videoGen) {
        await prisma.videoGeneration.update({
          where: { id: videoGen.id },
          data: {
            status: status as any,
            progress,
            errorMessage,
            completedAt: status === 'completed' || status === 'failed' ? new Date() : null,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to update job status', error);
    }
  }

  /**
   * 添加剧本生成任务
   */
  async addScriptGenerationJob(
    projectId: number,
    episodeId: number,
    config?: any
  ): Promise<string> {
    const job = await this.queue.add('script-generation', {
      type: 'script',
      projectId,
      episodeId,
      config,
    });

    logger.info('Script generation job added', { jobId: job.id, projectId, episodeId });
    return job.id;
  }

  /**
   * 添加分镜生成任务
   */
  async addStoryboardGenerationJob(
    episodeId: number
  ): Promise<string> {
    const job = await this.queue.add('storyboard-generation', {
      type: 'storyboard',
      episodeId,
    });

    logger.info('Storyboard generation job added', { jobId: job.id, episodeId });
    return job.id;
  }

  /**
   * 添加视频生成任务
   */
  async addVideoGenerationJob(
    sceneId: number,
    config?: any
  ): Promise<string> {
    const job = await this.queue.add('video-generation', {
      type: 'video',
      sceneId,
      config,
    });

    logger.info('Video generation job added', { jobId: job.id, sceneId });
    return job.id;
  }

  /**
   * 添加视频合成任务
   */
  async addVideoCompositionJob(
    projectId: number,
    episodeId: number,
    config?: any
  ): Promise<string> {
    const job = await this.queue.add('video-composition', {
      type: 'compose',
      projectId,
      episodeId,
      config,
    });

    logger.info('Video composition job added', { jobId: job.id, projectId, episodeId });
    return job.id;
  }

  /**
   * 获取作业状态
   */
  async getJobStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    data?: any;
    failedReason?: string;
  } | null> {
    const job = await this.queue.getJob(jobId);
    
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = await job.progress();

    return {
      status: state,
      progress: typeof progress === 'number' ? progress : (progress as any).progress,
      data: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * 获取队列统计
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * 清空队列
   */
  async clearQueue(): Promise<void> {
    await this.queue.obliterate({ force: true });
    logger.info('Queue cleared');
  }

  /**
   * 关闭队列
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.redisConnection.quit();
    logger.info('Video generation queue closed');
  }
}

export const videoGenerationQueue = new VideoGenerationQueue();
