import Queue from 'bull';
import { SceneJobData } from '../queues/sceneQueue';
import { updateTaskProgress, markTaskComplete, markTaskFailed } from '../services/taskService';
import prisma from '../config/database';

export const startSceneWorker = (queue: Queue.Queue<SceneJobData>) => {
  queue.process(async (job) => {
    const { projectId, userId, sceneId, options } = job.data;
    
    try {
      await updateTaskProgress(job.id?.toString() || '', {
        progress: 10,
        message: '初始化场景生成...',
        status: 'processing',
      });
      await job.progress(10);

      await new Promise(resolve => setTimeout(resolve, 1000));

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 40,
        message: '生成场景图像...',
        status: 'processing',
      });
      await job.progress(40);

      await new Promise(resolve => setTimeout(resolve, 1000));

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 70,
        message: '优化场景细节...',
        status: 'processing',
      });
      await job.progress(70);

      await new Promise(resolve => setTimeout(resolve, 1000));

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 90,
        message: '保存场景图像...',
        status: 'processing',
      });
      await job.progress(90);

      const scene = await prisma.scene.findUnique({
        where: { id: BigInt(sceneId) },
      });

      const imageUrl = `/api/images/scenes/${sceneId}`;
      
      await prisma.sceneImage.create({
        data: {
          sceneId: BigInt(sceneId),
          imageUrl,
          imageType: 'scene',
          prompt: scene?.description || '场景图像',
          generationParams: options,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 100,
        message: '场景生成完成',
        status: 'completed',
      });
      await job.progress(100);

      await markTaskComplete(job.id?.toString() || '', {
        sceneId,
        imageUrl,
      });

      return {
        success: true,
        sceneId,
        imageUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await updateTaskProgress(job.id?.toString() || '', {
        progress: 0,
        message: `场景生成失败: ${errorMessage}`,
        status: 'failed',
      });
      
      await markTaskFailed(job.id?.toString() || '', errorMessage);
      
      throw error;
    }
  });
};
