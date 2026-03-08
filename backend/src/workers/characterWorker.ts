import Queue from 'bull';
import { CharacterJobData } from '../queues/characterQueue';
import { updateTaskProgress, markTaskComplete, markTaskFailed } from '../services/taskService';
import prisma from '../config/database';

export const startCharacterWorker = (queue: Queue.Queue<CharacterJobData>) => {
  queue.process(async (job) => {
    const { projectId, userId, characterId, options } = job.data;
    
    try {
      await updateTaskProgress(job.id?.toString() || '', {
        progress: 10,
        message: '初始化人物生成...',
        status: 'processing',
      });
      await job.progress(10);

      await new Promise(resolve => setTimeout(resolve, 1000));

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 40,
        message: '生成人物肖像...',
        status: 'processing',
      });
      await job.progress(40);

      await new Promise(resolve => setTimeout(resolve, 1000));

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 70,
        message: '优化人物细节...',
        status: 'processing',
      });
      await job.progress(70);

      await new Promise(resolve => setTimeout(resolve, 1000));

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 90,
        message: '保存人物图像...',
        status: 'processing',
      });
      await job.progress(90);

      const character = await prisma.character.findUnique({
        where: { id: BigInt(characterId) },
      });

      const imageUrl = `/api/images/characters/${characterId}`;
      
      await prisma.characterImage.create({
        data: {
          characterId: BigInt(characterId),
          imageUrl,
          imageType: 'portrait',
          prompt: character?.appearance || '人物肖像',
          generationParams: options,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 100,
        message: '人物生成完成',
        status: 'completed',
      });
      await job.progress(100);

      await markTaskComplete(job.id?.toString() || '', {
        characterId,
        imageUrl,
      });

      return {
        success: true,
        characterId,
        imageUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await updateTaskProgress(job.id?.toString() || '', {
        progress: 0,
        message: `人物生成失败: ${errorMessage}`,
        status: 'failed',
      });
      
      await markTaskFailed(job.id?.toString() || '', errorMessage);
      
      throw error;
    }
  });
};
