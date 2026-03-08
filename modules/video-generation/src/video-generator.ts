/**
 * 视频生成器主类
 * 整合 API 客户端、队列管理、错误处理
 */

import {
  VideoInput,
  VideoTask,
  TaskStatus,
  TaskResponse,
  BatchTaskResponse,
  ProgressResponse,
  VideoResult,
  HealthStatus,
  APIProvider,
  VideoGeneratorConfig,
  VideoGeneratorError,
  ErrorType,
} from '../types';
import { KelingClient } from '../api/keling-client';
import { JimengClient } from '../api/jimeng-client';
import { QueueManager } from '../queue/queue-manager';
import { Logger } from '../utils/logger';

export class VideoGenerator {
  private kelingClient: KelingClient;
  private jimengClient: JimengClient;
  private queueManager: QueueManager;
  private logger: Logger;
  private config: VideoGeneratorConfig;

  constructor(config: VideoGeneratorConfig) {
    this.config = config;
    this.logger = new Logger('VideoGenerator', config.logging.level);

    // 初始化 API 客户端
    this.kelingClient = new KelingClient({
      apiKey: config.keling.apiKey,
      apiSecret: config.keling.apiSecret,
      baseUrl: config.keling.baseUrl,
    });

    this.jimengClient = new JimengClient({
      apiKey: config.jimeng.apiKey,
      apiSecret: config.jimeng.apiSecret,
      baseUrl: config.jimeng.baseUrl,
    });

    // 初始化队列管理器
    this.queueManager = new QueueManager({
      redis: config.redis,
      maxConcurrentTasks: config.queue.maxConcurrentTasks,
      defaultPriority: config.queue.defaultPriority,
    });

    this.logger.info('VideoGenerator initialized');
  }

  /**
   * 生成单个视频
   */
  async generateVideo(input: VideoInput, priority?: number): Promise<TaskResponse> {
    this.logger.info('Generating video:', {
      scene: input.scene_description.substring(0, 30) + '...',
      character: input.character_description.substring(0, 30) + '...',
      action: input.action_description.substring(0, 30) + '...',
    });

    // 验证输入
    this.validateInput(input);

    // 添加到队列
    const taskId = await this.queueManager.addTask(input, priority as any);

    // 异步处理任务
    this.processTask(taskId).catch((error) => {
      this.logger.error('Task processing failed:', taskId, error);
    });

    return {
      task_id: taskId,
      status: 'pending',
      message: 'Task added to queue',
    };
  }

  /**
   * 批量生成视频
   */
  async generateBatch(inputs: VideoInput[], priority?: number): Promise<BatchTaskResponse> {
    this.logger.info('Generating batch videos:', { count: inputs.length });

    // 验证所有输入
    for (const input of inputs) {
      this.validateInput(input);
    }

    // 批量添加到队列
    const taskIds = await this.queueManager.addBatchTasks(inputs, priority as any);

    // 异步处理所有任务
    taskIds.forEach((taskId) => {
      this.processTask(taskId).catch((error) => {
        this.logger.error('Batch task processing failed:', taskId, error);
      });
    });

    return {
      task_ids: taskIds,
      status: 'pending',
      message: `Added ${inputs.length} tasks to queue`,
    };
  }

  /**
   * 查询任务进度
   */
  async getTaskProgress(taskId: string): Promise<ProgressResponse | null> {
    return await this.queueManager.getTaskProgress(taskId);
  }

  /**
   * 获取任务结果
   */
  async getTaskResult(taskId: string): Promise<VideoResult | null> {
    return await this.queueManager.getTaskResult(taskId);
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    await this.queueManager.cancelTask(taskId);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    const queueStats = await this.queueManager.getQueueStats();

    // 检查 API 提供商状态
    const providers = {
      keling: {
        available: true, // 实际应该 ping API
        latency_ms: undefined,
        error_rate: undefined,
      },
      jimeng: {
        available: true,
        latency_ms: undefined,
        error_rate: undefined,
      },
    };

    const status: HealthStatus = {
      status: 'healthy',
      providers,
      queue: queueStats,
      timestamp: Date.now(),
    };

    return status;
  }

  /**
   * 处理单个任务
   */
  private async processTask(taskId: string): Promise<void> {
    const taskLogger = this.logger.child(`Task:${taskId}`);
    taskLogger.info('Processing task');

    try {
      // 获取任务
      const task = await this.queueManager.getTask(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // 更新状态为处理中
      await this.queueManager.updateTaskStatus(taskId, 'processing', {
        current_step: 'preparing',
        percentage: 5,
      });

      // 构建 API 请求
      const provider = task.metadata.api_provider;
      taskLogger.info('Using provider:', provider);

      let externalTaskId: string;

      if (provider === 'keling') {
        externalTaskId = await this.processWithKeling(task, taskLogger);
      } else {
        externalTaskId = await this.processWithJimeng(task, taskLogger);
      }

      // 保存外部任务 ID
      task.metadata.external_task_id = externalTaskId;

      // 轮询任务状态
      await this.pollTaskStatus(taskId, provider, externalTaskId, taskLogger);

    } catch (error) {
      taskLogger.error('Task processing failed:', error);
      await this.handleTaskError(taskId, error as Error, taskLogger);
    }
  }

  /**
   * 使用可灵 AI 处理任务
   */
  private async processWithKeling(
    task: VideoTask,
    logger: Logger
  ): Promise<string> {
    logger.info('Processing with Keling AI');

    await this.queueManager.updateTaskStatus(task.id, 'processing', {
      current_step: 'calling_api',
      percentage: 10,
    });

    // 构建提示词
    const prompt = KelingClient.buildPrompt({
      scene_description: task.input.scene_description,
      character_description: task.input.character_description,
      action_description: task.input.action_description,
    });

    // 构建参考图参数
    const referenceParams = task.input.reference_images
      ? KelingClient.buildReferenceParams(task.input.reference_images)
      : {};

    // 调用 API
    const response = await this.kelingClient.generateVideo({
      prompt,
      duration: task.input.parameters?.duration || 5,
      resolution: task.input.parameters?.resolution || '720p',
      motion_strength: task.input.parameters?.motion_strength || 5,
      seed: task.input.parameters?.seed,
      negative_prompt: task.input.parameters?.negative_prompt,
      ...referenceParams,
    });

    logger.info('Keling API response:', {
      task_id: response.data.task_id,
      status: response.data.status,
    });

    return response.data.task_id;
  }

  /**
   * 使用即梦 AI 处理任务
   */
  private async processWithJimeng(
    task: VideoTask,
    logger: Logger
  ): Promise<string> {
    logger.info('Processing with Jimeng AI');

    await this.queueManager.updateTaskStatus(task.id, 'processing', {
      current_step: 'calling_api',
      percentage: 10,
    });

    // 构建提示词
    const prompt = JimengClient.buildPrompt({
      scene_description: task.input.scene_description,
      character_description: task.input.character_description,
      action_description: task.input.action_description,
    });

    // 构建图片提示参数
    const imagePromptParams = task.input.reference_images
      ? JimengClient.buildImagePrompt(task.input.reference_images)
      : {};

    // 调用 API
    const response = await this.jimengClient.generateVideo({
      prompt,
      duration: task.input.parameters?.duration || 5,
      aspect_ratio: task.input.parameters?.aspect_ratio || '16:9',
      video_style: task.input.parameters?.style,
      ...imagePromptParams,
    });

    logger.info('Jimeng API response:', {
      task_id: response.data.task_id,
      status: response.data.status,
    });

    return response.data.task_id;
  }

  /**
   * 轮询任务状态
   */
  private async pollTaskStatus(
    taskId: string,
    provider: APIProvider,
    externalTaskId: string,
    logger: Logger
  ): Promise<void> {
    logger.info('Starting task status polling');

    const pollInterval = 5000; // 5 秒
    const maxPollTime = 10 * 60 * 1000; // 10 分钟
    const startTime = Date.now();

    while (Date.now() - startTime < maxPollTime) {
      // 更新进度
      const elapsed = Date.now() - startTime;
      const percentage = Math.min(90, 10 + Math.floor((elapsed / maxPollTime) * 80));

      await this.queueManager.updateTaskStatus(taskId, 'processing', {
        current_step: 'generating_video',
        percentage,
        estimated_remaining: Math.max(0, Math.floor((maxPollTime - elapsed) / 1000)),
      });

      // 查询外部 API 状态
      let status: TaskStatus;
      let videoUrl: string | undefined;
      let coverUrl: string | undefined;

      try {
        if (provider === 'keling') {
          const response = await this.kelingClient.queryTask(externalTaskId);
          status = response.data.status;
          videoUrl = response.data.video_url;
          coverUrl = response.data.cover_url;
        } else {
          const response = await this.jimengClient.queryTask(externalTaskId);
          status = response.data.status;
          videoUrl = response.data.video_url;
          coverUrl = response.data.cover_url;
        }

        logger.debug('External task status:', status);

        if (status === 'completed') {
          // 任务完成
          if (!videoUrl) {
            throw new Error('Video URL missing in completed task');
          }

          await this.queueManager.updateTaskStatus(taskId, 'completed', {
            current_step: 'completed',
            percentage: 100,
          });

          await this.queueManager.updateTaskResult(taskId, {
            video_url: videoUrl,
            cover_url: coverUrl || '',
            duration: 5,
            resolution: '720p',
          });

          logger.info('Task completed successfully');
          return;
        }

        if (status === 'failed') {
          throw new Error('External API reported task failure');
        }

      } catch (error) {
        logger.warn('Polling error:', error);
        // 继续轮询，可能是临时错误
      }

      // 等待下一次轮询
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Task polling timeout');
  }

  /**
   * 处理任务错误
   */
  private async handleTaskError(
    taskId: string,
    error: Error,
    logger: Logger
  ): Promise<void> {
    const task = await this.queueManager.getTask(taskId);
    if (!task) return;

    const videoError = error instanceof VideoGeneratorError
      ? error
      : new VideoGeneratorError(error.message, ErrorType.NETWORK_ERROR, true, error);

    logger.error('Task error:', {
      type: videoError.type,
      retryable: videoError.retryable,
      retry_count: task.metadata.retry_count,
    });

    // 检查是否可以重试
    if (videoError.retryable && task.metadata.retry_count < this.config.retry.maxRetries) {
      const delay = this.config.retry.getDelay(task.metadata.retry_count);
      logger.info('Retrying task after delay:', { delay, retry_count: task.metadata.retry_count + 1 });

      task.metadata.retry_count++;
      
      // 延迟后重试
      setTimeout(() => {
        this.processTask(taskId).catch((e) => {
          logger.error('Retry failed:', e);
        });
      }, delay);

      return;
    }

    // 检查是否可以切换提供商
    if (task.metadata.api_provider === 'keling' && videoError.retryable) {
      logger.info('Switching to backup provider (Jimeng)');
      task.metadata.api_provider = 'jimeng';
      task.metadata.retry_count = 0; // 重置重试计数

      // 使用新提供商重试
      this.processTask(taskId).catch((e) => {
        logger.error('Provider switch retry failed:', e);
      });

      return;
    }

    // 标记为失败
    await this.queueManager.markTaskFailed(taskId, videoError.message);

    // 触发错误回调
    if (task.callbacks?.on_error) {
      try {
        await this.sendWebhook(task.callbacks.on_error, {
          task_id: taskId,
          status: 'failed',
          error: videoError.message,
        });
      } catch (e) {
        logger.error('Failed to send error webhook:', e);
      }
    }
  }

  /**
   * 验证输入
   */
  private validateInput(input: VideoInput): void {
    if (!input.scene_description || input.scene_description.trim().length === 0) {
      throw new VideoGeneratorError(
        'Scene description is required',
        ErrorType.INVALID_INPUT
      );
    }

    if (!input.character_description || input.character_description.trim().length === 0) {
      throw new VideoGeneratorError(
        'Character description is required',
        ErrorType.INVALID_INPUT
      );
    }

    if (!input.action_description || input.action_description.trim().length === 0) {
      throw new VideoGeneratorError(
        'Action description is required',
        ErrorType.INVALID_INPUT
      );
    }

    // 验证时长
    if (input.parameters?.duration && ![5, 10].includes(input.parameters.duration)) {
      throw new VideoGeneratorError(
        'Duration must be 5 or 10 seconds',
        ErrorType.INVALID_INPUT
      );
    }

    // 验证运动强度
    if (input.parameters?.motion_strength) {
      if (input.parameters.motion_strength < 1 || input.parameters.motion_strength > 10) {
        throw new VideoGeneratorError(
          'Motion strength must be between 1 and 10',
          ErrorType.INVALID_INPUT
        );
      }
    }
  }

  /**
   * 发送 Webhook
   */
  private async sendWebhook(url: string, data: any): Promise<void> {
    const axios = (await import('axios')).default;
    await axios.post(url, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
  }

  /**
   * 关闭服务
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down VideoGenerator...');
    await this.queueManager.shutdown();
  }
}
