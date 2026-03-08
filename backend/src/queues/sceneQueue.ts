import Queue from 'bull';
import { queueOptions } from './index';
import { startSceneWorker } from '../workers/sceneWorker';

export interface SceneJobData {
  projectId: number;
  userId: number;
  sceneId: number;
  options?: {
    style?: string;
    aspectRatio?: string;
  };
}

export const sceneQueue = new Queue<SceneJobData>('scene-generation', queueOptions);

sceneQueue.on('waiting', (jobId) => {
  console.log(`[SceneQueue] Job ${jobId} waiting`);
});

sceneQueue.on('active', (job) => {
  console.log(`[SceneQueue] Job ${job.id} active`);
});

sceneQueue.on('completed', (job, result) => {
  console.log(`[SceneQueue] Job ${job.id} completed with result:`, result);
});

sceneQueue.on('failed', (job, err) => {
  console.error(`[SceneQueue] Job ${job?.id} failed:`, err.message);
});

sceneQueue.on('progress', (job, progress) => {
  console.log(`[SceneQueue] Job ${job.id} progress: ${progress}%`);
});

startSceneWorker(sceneQueue);

export { sceneQueue as default };
