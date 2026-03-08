import Queue from 'bull';
import { StoryboardJobData } from '../queues/storyboardQueue';
import { updateTaskProgress, markTaskComplete, markTaskFailed } from '../services/taskService';
import prisma from '../config/database';

export const startStoryboardWorker = (queue: Queue.Queue<StoryboardJobData>) => {
  queue.process(async (job) => {
    const { projectId, userId, episodeId, options } = job.data;
    
    try {
      await updateTaskProgress(job.id?.toString() || '', {
        progress: 10,
        message: '初始化分镜生成...',
        status: 'processing',
      });
      await job.progress(10);

      await new Promise(resolve => setTimeout(resolve, 1000));

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 30,
        message: '分析剧本内容...',
        status: 'processing',
      });
      await job.progress(30);

      await new Promise(resolve => setTimeout(resolve, 1000));

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 50,
        message: '生成分镜镜头...',
        status: 'processing',
      });
      await job.progress(50);

      const shotCount = options?.shotCount || 10;
      
      for (let i = 1; i <= shotCount; i++) {
        await prisma.storyboard.upsert({
          where: {
            episodeId_shotNumber: {
              episodeId: BigInt(episodeId),
              shotNumber: i,
            },
          },
          create: {
            episodeId: BigInt(episodeId),
            shotNumber: i,
            description: `镜头 ${i} 的描述`,
            visualDescription: `镜头 ${i} 的视觉描述`,
            shotType: i % 3 === 0 ? 'close_up' : i % 2 === 0 ? 'medium_shot' : 'full_shot',
            cameraAngle: i % 2 === 0 ? 'eye_level' : 'slightly_high',
            cameraMovement: i % 4 === 0 ? 'pan' : i % 2 === 0 ? 'tilt' : 'static',
            duration: 3 + Math.floor(Math.random() * 5),
            dialogue: i % 2 === 0 ? '角色对话内容...' : '',
            action: '角色动作描述...',
            status: 'draft',
          },
          update: {
            updatedAt: new Date(),
          },
        });

        const progress = 50 + Math.floor((i / shotCount) * 40);
        await updateTaskProgress(job.id?.toString() || '', {
          progress,
          message: `生成分镜镜头 ${i}/${shotCount}...`,
          status: 'processing',
        });
        await job.progress(progress);

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 90,
        message: '完善分镜细节...',
        status: 'processing',
      });
      await job.progress(90);

      await new Promise(resolve => setTimeout(resolve, 500));

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 100,
        message: '分镜生成完成',
        status: 'completed',
      });
      await job.progress(100);

      await markTaskComplete(job.id?.toString() || '', {
        episodeId,
        shotCount,
      });

      return {
        success: true,
        episodeId,
        shotCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await updateTaskProgress(job.id?.toString() || '', {
        progress: 0,
        message: `分镜生成失败: ${errorMessage}`,
        status: 'failed',
      });
      
      await markTaskFailed(job.id?.toString() || '', errorMessage);
      
      throw error;
    }
  });
};
