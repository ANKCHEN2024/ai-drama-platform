import Queue from 'bull';
import { queueOptions } from './index';
import { startStoryboardWorker } from '../workers/storyboardWorker';

export interface StoryboardJobData {
  projectId: number;
  userId: number;
  episodeId: number;
  options?: {
    style?: string;
    shotCount?: number;
  };
}

export const storyboardQueue = new Queue<StoryboardJobData>('storyboard-generation', queueOptions);

storyboardQueue.on('waiting', (jobId) => {
  console.log(`[StoryboardQueue] Job ${jobId} waiting`);
});

storyboardQueue.on('active', (job) => {
  console.log(`[StoryboardQueue] Job ${job.id} active`);
});

storyboardQueue.on('completed', (job, result) => {
  console.log(`[StoryboardQueue] Job ${job.id} completed with result:`, result);
});

storyboardQueue.on('failed', (job, err) => {
  console.error(`[StoryboardQueue] Job ${job?.id} failed:`, err.message);
});

storyboardQueue.on('progress', (job, progress) => {
  console.log(`[StoryboardQueue] Job ${job.id} progress: ${progress}%`);
});

startStoryboardWorker(storyboardQueue);

export { storyboardQueue as default };
