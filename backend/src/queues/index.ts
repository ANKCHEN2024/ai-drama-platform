import Queue from 'bull';
import redis from '../config/redis';
import { storyQueue } from './storyQueue';
import { characterQueue } from './characterQueue';
import { sceneQueue } from './sceneQueue';
import { storyboardQueue } from './storyboardQueue';
import { videoQueue } from './videoQueue';
import { audioQueue } from './audioQueue';
import { compositeQueue } from './compositeQueue';

export interface TaskProgress {
  progress: number;
  message: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
}

export interface TaskMetadata {
  projectId?: number;
  userId?: number;
  taskType: string;
  [key: string]: any;
}

export const queueOptions = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
};

export const queues = {
  story: storyQueue,
  character: characterQueue,
  scene: sceneQueue,
  storyboard: storyboardQueue,
  video: videoQueue,
  audio: audioQueue,
  composite: compositeQueue,
};

export const getAllQueues = () => Object.values(queues);

export const getQueueByName = (name: string) => queues[name as keyof typeof queues];

export const createQueue = <T = any>(name: string) => {
  return new Queue<T>(name, queueOptions);
};

export const closeAllQueues = async () => {
  for (const queue of getAllQueues()) {
    await queue.close();
  }
};

export const getQueueStats = async () => {
  const stats: Record<string, any> = {};
  for (const [name, queue] of Object.entries(queues)) {
    stats[name] = {
      waiting: await queue.getWaitingCount(),
      active: await queue.getActiveCount(),
      completed: await queue.getCompletedCount(),
      failed: await queue.getFailedCount(),
    };
  }
  return stats;
};

export default queues;
