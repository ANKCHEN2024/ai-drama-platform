/**
 * 配置文件示例
 * 复制为 config.ts 并填入实际的 API 密钥
 */

import { VideoGeneratorConfig } from '../types';

export const config: VideoGeneratorConfig = {
  // Redis 配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },

  // MinIO 配置（用于视频存储）
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'video-generation',
  },

  // 快手可灵 AI 配置
  keling: {
    apiKey: process.env.KELING_API_KEY || '',
    apiSecret: process.env.KELING_API_SECRET || '',
    baseUrl: process.env.KELING_BASE_URL || 'https://api.kuaishou.com/kl',
  },

  // 火山引擎即梦 AI 配置
  jimeng: {
    apiKey: process.env.JIMENG_API_KEY || '',
    apiSecret: process.env.JIMENG_API_SECRET || '',
    baseUrl: process.env.JIMENG_BASE_URL || 'https://api.volcengine.com/jimeng',
  },

  // 队列配置
  queue: {
    maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '5'),
    defaultPriority: 5,
  },

  // 重试配置
  retry: {
    maxRetries: 3,
    baseDelay: 1000,      // 1 秒
    maxDelay: 60000,      // 60 秒
    backoffMultiplier: 2,
    getDelay(retryCount: number): number {
      const delay = Math.min(
        this.baseDelay * Math.pow(this.backoffMultiplier, retryCount),
        this.maxDelay
      );
      return delay * (0.9 + Math.random() * 0.2); // 添加±10% 抖动
    },
  },

  // 日志配置
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
  },
};
