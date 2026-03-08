import Queue from 'bull';
import { queueOptions } from './index';
import { startAudioWorker } from '../workers/audioWorker';

export interface AudioJobData {
  projectId: number;
  userId: number;
  episodeId: number;
  audioType: 'tts' | 'bgm' | 'asr';
  textContent?: string;
  characterId?: number;
  options?: {
    voiceId?: string;
    musicStyle?: string;
    mood?: string;
  };
}

export const audioQueue = new Queue<AudioJobData>('audio-processing', queueOptions);

audioQueue.on('waiting', (jobId) => {
  console.log(`[AudioQueue] Job ${jobId} waiting`);
});

audioQueue.on('active', (job) => {
  console.log(`[AudioQueue] Job ${job.id} active`);
});

audioQueue.on('completed', (job, result) => {
  console.log(`[AudioQueue] Job ${job.id} completed with result:`, result);
});

audioQueue.on('failed', (job, err) => {
  console.error(`[AudioQueue] Job ${job?.id} failed:`, err.message);
});

audioQueue.on('progress', (job, progress) => {
  console.log(`[AudioQueue] Job ${job.id} progress: ${progress}%`);
});

startAudioWorker(audioQueue);

export { audioQueue as default };
