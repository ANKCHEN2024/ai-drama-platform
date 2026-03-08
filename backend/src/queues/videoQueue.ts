import Queue from 'bull';
import { queueOptions } from './index';
import { startVideoWorker } from '../workers/videoWorker';

export interface VideoJobData {
  projectId: number;
  userId: number;
  episodeId: number;
  storyboardIds: number[];
  options?: {
    resolution?: string;
    duration?: number;
    aiProvider?: 'keling' | 'jimeng';
  };
}

export const videoQueue = new Queue<VideoJobData>('video-generation', queueOptions);

videoQueue.on('waiting', (jobId) => {
  console.log(`[VideoQueue] Job ${jobId} waiting`);
});

videoQueue.on('active', (job) => {
  console.log(`[VideoQueue] Job ${job.id} active`);
});

videoQueue.on('completed', (job, result) => {
  console.log(`[VideoQueue] Job ${job.id} completed with result:`, result);
});

videoQueue.on('failed', (job, err) => {
  console.error(`[VideoQueue] Job ${job?.id} failed:`, err.message);
});

videoQueue.on('progress', (job, progress) => {
  console.log(`[VideoQueue] Job ${job.id} progress: ${progress}%`);
});

startVideoWorker(videoQueue);

export { videoQueue as default };
