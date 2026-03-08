import Queue from 'bull';
import { AudioJobData } from '../queues/audioQueue';
import { updateTaskProgress, markTaskComplete, markTaskFailed } from '../services/taskService';
import prisma from '../config/database';
import { AudioProcessor, AudioSynthesisInput } from '../services/audioProcessing';
import { broadcastTaskProgress } from '../websocket';
import logger from '../utils/logger';

const audioProcessor = new AudioProcessor();

export const startAudioWorker = (queue: Queue.Queue<AudioJobData>) => {
  queue.process(async (job) => {
    const { projectId, userId, episodeId, audioType, textContent, characterId, options } = job.data;
    
    let taskId: bigint | undefined;
    
    try {
      const typeMessages = {
        tts: '语音合成',
        bgm: '背景音乐生成',
        asr: '语音识别',
      };

      const task = await prisma.task.findFirst({
        where: {
          projectId: BigInt(projectId),
          userId: BigInt(userId),
          taskType: 'audio_synthesize',
          status: 'pending',
          metadata: {
            path: ['jobId'],
            equals: job.id,
          },
        },
      });
      
      if (task) {
        taskId = task.id;
      }

      await updateTaskProgress(taskId?.toString() || '', {
        progress: 10,
        message: `初始化${typeMessages[audioType]}任务...`,
        status: 'processing',
      });
      await job.progress(10);
      
      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'processing',
            progress: 10,
            message: `初始化${typeMessages[audioType]}任务...`,
            updatedAt: new Date(),
          },
        });
        
        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'audio_synthesize',
          progress: 10,
          status: 'processing',
          message: `初始化${typeMessages[audioType]}任务...`,
        });
      }

      await updateTaskProgress(taskId?.toString() || '', {
        progress: 40,
        message: `正在${typeMessages[audioType]}...`,
        status: 'processing',
      });
      await job.progress(40);
      
      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            progress: 40,
            message: `正在${typeMessages[audioType]}...`,
            updatedAt: new Date(),
          },
        });
        
        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'audio_synthesize',
          progress: 40,
          status: 'processing',
          message: `正在${typeMessages[audioType]}...`,
        });
      }

      let result: any;

      if (audioType === 'tts') {
        const audioInput: AudioSynthesisInput = {
          text: textContent,
          type: 'tts',
          parameters: options,
          metadata: {
            project_id: projectId,
            episode_id: episodeId,
            character_id: characterId,
          },
        };

        result = await audioProcessor.synthesizeSpeech(audioInput);

        await prisma.audio.create({
          data: {
            episodeId: BigInt(episodeId),
            characterId: characterId ? BigInt(characterId) : undefined,
            audioUrl: result.audio_url,
            audioType: 'tts',
            textContent,
            voiceId: options?.voice,
            synthesisParams: options,
            duration: result.duration,
            status: 'completed',
          },
        });
      }

      await updateTaskProgress(taskId?.toString() || '', {
        progress: 80,
        message: '处理音频文件...',
        status: 'processing',
      });
      await job.progress(80);
      
      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            progress: 80,
            message: '处理音频文件...',
            updatedAt: new Date(),
          },
        });
        
        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'audio_synthesize',
          progress: 80,
          status: 'processing',
          message: '处理音频文件...',
        });
      }

      await updateTaskProgress(taskId?.toString() || '', {
        progress: 100,
        message: `${typeMessages[audioType]}完成`,
        status: 'completed',
      });
      await job.progress(100);
      
      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'completed',
            progress: 100,
            message: `${typeMessages[audioType]}完成`,
            updatedAt: new Date(),
            completedAt: new Date(),
          },
        });
        
        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'audio_synthesize',
          progress: 100,
          status: 'completed',
          message: `${typeMessages[audioType]}完成`,
        });
      }

      await markTaskComplete(taskId?.toString() || '', {
        episodeId,
        audioType,
        audioUrl: result?.audio_url || `/api/audios/${episodeId}/${audioType}`,
      });

      return {
        success: true,
        episodeId,
        audioType,
        audioUrl: result?.audio_url || `/api/audios/${episodeId}/${audioType}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const typeMessages = {
        tts: '语音合成',
        bgm: '背景音乐生成',
        asr: '语音识别',
      };
      
      logger.error('音频处理错误:', error);
      
      await updateTaskProgress(taskId?.toString() || '', {
        progress: 0,
        message: `${typeMessages[audioType]}失败: ${errorMessage}`,
        status: 'failed',
      });
      
      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'failed',
            progress: 0,
            message: `${typeMessages[audioType]}失败: ${errorMessage}`,
            updatedAt: new Date(),
          },
        });
        
        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'audio_synthesize',
          progress: 0,
          status: 'failed',
          message: `${typeMessages[audioType]}失败: ${errorMessage}`,
        });
      }
      
      await markTaskFailed(taskId?.toString() || '', errorMessage);
      
      throw error;
    }
  });
};
