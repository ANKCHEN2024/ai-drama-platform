import Queue from 'bull';
import { queueOptions } from './index';
import { startStoryWorker } from '../workers/storyWorker';

export interface StoryJobData {
  projectId: number;
  userId: number;
  novelText: string;
  options?: {
    episodeCount?: number;
    language?: string;
  };
}

export const storyQueue = new Queue<StoryJobData>('story-analysis', queueOptions);

storyQueue.on('waiting', (jobId) => {
  console.log(`[StoryQueue] Job ${jobId} waiting`);
});

storyQueue.on('active', (job) => {
  console.log(`[StoryQueue] Job ${job.id} active`);
});

storyQueue.on('completed', (job, result) => {
  console.log(`[StoryQueue] Job ${job.id} completed with result:`, result);
});

storyQueue.on('failed', (job, err) => {
  console.error(`[StoryQueue] Job ${job?.id} failed:`, err.message);
});

storyQueue.on('progress', (job, progress) => {
  console.log(`[StoryQueue] Job ${job.id} progress: ${progress}%`);
});

startStoryWorker(storyQueue);

export { storyQueue as default };
