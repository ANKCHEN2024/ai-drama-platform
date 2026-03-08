import Queue from 'bull';
import { queueOptions } from './index';
import { startCompositeWorker, CompositeJobData } from '../workers/compositeWorker';

export const compositeQueue = new Queue<CompositeJobData>('video-composite', queueOptions);

compositeQueue.on('waiting', (jobId) => {
  console.log(`[CompositeQueue] Job ${jobId} waiting`);
});

compositeQueue.on('active', (job) => {
  console.log(`[CompositeQueue] Job ${job.id} active`);
});

compositeQueue.on('completed', (job, result) => {
  console.log(`[CompositeQueue] Job ${job.id} completed with result:`, result);
});

compositeQueue.on('failed', (job, err) => {
  console.error(`[CompositeQueue] Job ${job?.id} failed:`, err.message);
});

compositeQueue.on('progress', (job, progress) => {
  console.log(`[CompositeQueue] Job ${job.id} progress: ${progress}%`);
});

startCompositeWorker(compositeQueue);

export { compositeQueue as default };
