import Queue from 'bull';
import { queueOptions } from './index';
import { startCharacterWorker } from '../workers/characterWorker';

export interface CharacterJobData {
  projectId: number;
  userId: number;
  characterId: number;
  options?: {
    style?: string;
    aspectRatio?: string;
  };
}

export const characterQueue = new Queue<CharacterJobData>('character-generation', queueOptions);

characterQueue.on('waiting', (jobId) => {
  console.log(`[CharacterQueue] Job ${jobId} waiting`);
});

characterQueue.on('active', (job) => {
  console.log(`[CharacterQueue] Job ${job.id} active`);
});

characterQueue.on('completed', (job, result) => {
  console.log(`[CharacterQueue] Job ${job.id} completed with result:`, result);
});

characterQueue.on('failed', (job, err) => {
  console.error(`[CharacterQueue] Job ${job?.id} failed:`, err.message);
});

characterQueue.on('progress', (job, progress) => {
  console.log(`[CharacterQueue] Job ${job.id} progress: ${progress}%`);
});

startCharacterWorker(characterQueue);

export { characterQueue as default };
