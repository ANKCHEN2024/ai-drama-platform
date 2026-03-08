/**
 * 视频生成队列管理器
 * 基于 Redis 实现任务队列
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  VideoTask,
  VideoInput,
  TaskStatus,
  TaskPriority,
  APIProvider,
  ProgressResponse,
  VideoResult,
} from '../types';
import { Logger } from '../utils/logger';

export interface QueueManagerConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  maxConcurrentTasks: number;
  defaultPriority: TaskPriority;
}

export class QueueManager {
  private redis: Redis;
  private logger: Logger;
  private config: QueueManagerConfig;
  private activeTasks: Map<string, VideoTask> = new Map();
  private processing: boolean = false;

  private static readonly QUEUE_KEYS = {
    TASK_QUEUE: 'video:tasks:queue',
    TASK_STATUS: 'video:tasks:{id}:status',
    TASK_PROGRESS: 'video:tasks:{id}:progress',
    ACTIVE_TASKS: 'video:tasks:active',
    FAILED_TASKS: 'video:tasks:failed',
    COMPLETED_TASKS: 'video:tasks:completed',
    PRIORITY_QUEUE: 'video:tasks:priority',
  };

  constructor(config: QueueManagerConfig) {
    this.config = config;
    this.logger = new Logger('QueueManager');

    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      retryStrategy: (times) => {
        if (times > 10) {
          this.logger.error('Redis connection failed after multiple retries');
          return null;
        }
        return Math.min(times * 50, 2000);
      },
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis error:', err);
    });

    this.redis.on('connect', () => {
      this.logger.info('Redis connected');
    });

    // 启动队列处理器
    this.startQueueProcessor();
  }

  /**
   * 添加任务到队列
   */
  async addTask(input: VideoInput, priority?: TaskPriority): Promise<string> {
    const taskId = uuidv4();
    const taskPriority = priority || this.config.defaultPriority;

    const task: VideoTask = {
      id: taskId,
      type: 'single',
      priority: taskPriority,
      status: 'pending',
      input,
      progress: {
        current_step: 'waiting',
        percentage: 0,
      },
      metadata: {
        created_at: Date.now(),
        retry_count: 0,
        api_provider: 'keling', // 默认使用可灵
      },
      callbacks: input.callbacks,
    };

    this.logger.info('Adding task to queue:', {
      task_id: taskId,
      priority: taskPriority,
    });

    // 保存任务状态
    await this.saveTask(task);

    // 添加到优先级队列（分数 = 优先级，值 = 任务 ID + 时间戳）
    const score = taskPriority * 10000000000 + Date.now();
    await this.redis.zadd(QUEUE_KEYS.PRIORITY_QUEUE, score.toString(), taskId);

    // 添加到普通队列（向后兼容）
    await this.redis.rpush(QUEUE_KEYS.TASK_QUEUE, taskId);

    return taskId;
  }

  /**
   * 批量添加任务
   */
  async addBatchTasks(inputs: VideoInput[], priority?: TaskPriority): Promise<string[]> {
    const taskIds: string[] = [];

    for (const input of inputs) {
      const taskId = await this.addTask(input, priority);
      taskIds.push(taskId);
    }

    this.logger.info('Batch tasks added:', { count: taskIds.length });

    return taskIds;
  }

  /**
   * 获取下一个待处理任务
   */
  async getNextTask(): Promise<VideoTask | null> {
    // 从优先级队列获取
    const result = await this.redis.zpopmin(QUEUE_KEYS.PRIORITY_QUEUE);
    
    if (!result || result.length === 0) {
      return null;
    }

    const taskId = result[0][0];
    const task = await this.getTask(taskId);

    if (!task) {
      this.logger.warn('Task not found:', taskId);
      return null;
    }

    return task;
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    progress?: { current_step: string; percentage: number; estimated_remaining?: number }
  ): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = status;
    if (progress) {
      task.progress = progress;
    }

    if (status === 'processing' && !task.metadata.started_at) {
      task.metadata.started_at = Date.now();
    }

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      task.metadata.completed_at = Date.now();
      await this.removeActiveTask(taskId);
    }

    await this.saveTask(task);
    this.activeTasks.set(taskId, task);

    this.logger.debug('Task status updated:', {
      task_id: taskId,
      status,
      progress: progress?.percentage,
    });
  }

  /**
   * 更新任务结果
   */
  async updateTaskResult(taskId: string, output: {
    video_url: string;
    cover_url: string;
    duration: number;
    resolution: string;
  }): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.output = output;
    await this.saveTask(task);

    // 添加到完成任务集合
    await this.redis.sadd(QUEUE_KEYS.COMPLETED_TASKS, taskId);

    this.logger.info('Task completed:', {
      task_id: taskId,
      video_url: output.video_url,
    });
  }

  /**
   * 标记任务失败
   */
  async markTaskFailed(taskId: string, error: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'failed';
    task.metadata.completed_at = Date.now();
    task.progress = {
      current_step: 'failed',
      percentage: task.progress.percentage,
    };

    await this.saveTask(task);
    await this.removeActiveTask(taskId);
    await this.redis.sadd(QUEUE_KEYS.FAILED_TASKS, taskId);

    this.logger.error('Task failed:', {
      task_id: taskId,
      error,
    });
  }

  /**
   * 获取任务
   */
  async getTask(taskId: string): Promise<VideoTask | null> {
    // 先从内存缓存获取
    if (this.activeTasks.has(taskId)) {
      return this.activeTasks.get(taskId)!;
    }

    // 从 Redis 获取
    const data = await this.redis.hgetall(this.getTaskKey(taskId));
    if (!data || !data.id) {
      return null;
    }

    // 解析任务
    const task: VideoTask = {
      ...data,
      priority: parseInt(data.priority) as TaskPriority,
      metadata: {
        ...data.metadata,
        created_at: parseInt(data.metadata?.created_at),
        retry_count: parseInt(data.metadata?.retry_count || '0'),
      },
      progress: {
        ...data.progress,
        percentage: parseInt(data.progress?.percentage || '0'),
      },
    } as any;

    // 尝试解析 input 和 output
    try {
      if (data.input) task.input = JSON.parse(data.input);
      if (data.output) task.output = JSON.parse(data.output);
      if (data.callbacks) task.callbacks = JSON.parse(data.callbacks);
    } catch (e) {
      this.logger.warn('Failed to parse task data:', taskId, e);
    }

    return task;
  }

  /**
   * 获取任务进度
   */
  async getTaskProgress(taskId: string): Promise<ProgressResponse | null> {
    const task = await this.getTask(taskId);
    if (!task) {
      return null;
    }

    return {
      task_id: taskId,
      status: task.status,
      progress: task.progress,
      output: task.output,
      error: task.status === 'failed' ? 'Task failed' : undefined,
    };
  }

  /**
   * 获取任务结果
   */
  async getTaskResult(taskId: string): Promise<VideoResult | null> {
    const task = await this.getTask(taskId);
    if (!task) {
      return null;
    }

    return {
      task_id: taskId,
      status: task.status,
      output: task.output,
      error: task.status === 'failed' ? 'Task failed' : undefined,
      metadata: {
        created_at: task.metadata.created_at,
        completed_at: task.metadata.completed_at,
        api_provider: task.metadata.api_provider,
      },
    };
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status === 'completed' || task.status === 'cancelled') {
      this.logger.warn('Cannot cancel task in status:', task.status);
      return;
    }

    await this.updateTaskStatus(taskId, 'cancelled');
    await this.removeActiveTask(taskId);

    this.logger.info('Task cancelled:', taskId);
  }

  /**
   * 获取队列统计
   */
  async getQueueStats(): Promise<{
    pending: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [pending, active, completed, failed] = await Promise.all([
      this.redis.zcard(QUEUE_KEYS.PRIORITY_QUEUE),
      this.redis.scard(QUEUE_KEYS.ACTIVE_TASKS),
      this.redis.scard(QUEUE_KEYS.COMPLETED_TASKS),
      this.redis.scard(QUEUE_KEYS.FAILED_TASKS),
    ]);

    return { pending, active, completed, failed };
  }

  /**
   * 启动队列处理器
   */
  private startQueueProcessor(): void {
    const processQueue = async () => {
      if (this.processing) return;
      
      this.processing = true;

      try {
        while (this.activeTasks.size < this.config.maxConcurrentTasks) {
          const task = await this.getNextTask();
          if (!task) break;

          this.activeTasks.set(task.id, task);
          await this.redis.sadd(QUEUE_KEYS.ACTIVE_TASKS, task.id);
          
          this.logger.debug('Task picked from queue:', task.id);
          
          // 这里会由外部的事件处理器实际处理任务
          // QueueManager 只负责队列管理
        }
      } catch (error) {
        this.logger.error('Queue processor error:', error);
      } finally {
        this.processing = false;
        setTimeout(processQueue, 1000);
      }
    };

    processQueue();
    this.logger.info('Queue processor started');
  }

  /**
   * 保存任务到 Redis
   */
  private async saveTask(task: VideoTask): Promise<void> {
    const key = this.getTaskKey(task.id);
    
    await this.redis.hmset(key, {
      id: task.id,
      type: task.type,
      priority: task.priority.toString(),
      status: task.status,
      input: JSON.stringify(task.input),
      progress: JSON.stringify(task.progress),
      output: task.output ? JSON.stringify(task.output) : '',
      metadata: JSON.stringify(task.metadata),
      callbacks: task.callbacks ? JSON.stringify(task.callbacks) : '',
    });

    // 设置过期时间（7 天）
    await this.redis.expire(key, 7 * 24 * 60 * 60);
  }

  /**
   * 移除活跃任务
   */
  private async removeActiveTask(taskId: string): Promise<void> {
    this.activeTasks.delete(taskId);
    await this.redis.srem(QUEUE_KEYS.ACTIVE_TASKS, taskId);
  }

  /**
   * 获取任务键名
   */
  private getTaskKey(taskId: string): string {
    return QUEUE_KEYS.TASK_STATUS.replace('{id}', taskId);
  }

  /**
   * 关闭连接
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down queue manager...');
    await this.redis.quit();
  }
}

// 导出队列键名常量
const QUEUE_KEYS = QueueManager.QUEUE_KEYS;
