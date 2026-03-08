import Queue from 'bull';
import { VideoJobData } from '../queues/videoQueue';
import { updateTaskProgress, markTaskComplete, markTaskFailed } from '../services/taskService';
import prisma from '../config/database';
import { VideoGenerator, VideoInput } from '../services/videoGeneration';
import { broadcastTaskProgress } from '../websocket';
import logger from '../utils/logger';

const videoGenerator = new VideoGenerator();

export const startVideoWorker = (queue: Queue.Queue<VideoJobData>) => {
  queue.process(async (job) => {
    const { projectId, userId, episodeId, storyboardIds, options } = job.data;
    const totalStoryboards = storyboardIds.length;
    
    let taskId: bigint | undefined;
    
    try {
      const task = await prisma.task.findFirst({
        where: {
          projectId: BigInt(projectId),
          userId: BigInt(userId),
          taskType: 'video_generate',
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
        progress: 5,
        message: '初始化视频生成任务...',
        status: 'processing',
      });
      await job.progress(5);
      
      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'processing',
            progress: 5,
            message: '初始化视频生成任务...',
            updatedAt: new Date(),
          },
        });
        
        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'video_generate',
          progress: 5,
          status: 'processing',
          message: '初始化视频生成任务...',
        });
      }

      const storyboards = await prisma.storyboard.findMany({
        where: { id: { in: storyboardIds.map(id => BigInt(id)) }, episodeId: BigInt(episodeId) },
      });

      const externalTaskIds: string[] = [];

      for (let i = 0; i < totalStoryboards; i++) {
        const storyboard = storyboards[i];
        const progress = 5 + Math.floor((i / totalStoryboards) * 70);
        
        const progressMessage = `正在生成第 ${i + 1}/${totalStoryboards} 个镜头...`;
        
        await updateTaskProgress(taskId?.toString() || '', {
          progress,
          message: progressMessage,
          status: 'processing',
        });
        await job.progress(progress);
        
        if (taskId) {
          await prisma.task.update({
            where: { id: taskId },
            data: {
              progress,
              message: progressMessage,
              updatedAt: new Date(),
            },
          });
          
          broadcastTaskProgress(projectId, {
            taskId: taskId.toString(),
            taskType: 'video_generate',
            progress,
            status: 'processing',
            message: progressMessage,
          });
        }

        const videoInput: VideoInput = {
          scene_description: storyboard.visualDescription || storyboard.description || '',
          action_description: storyboard.action || storyboard.dialogue || '',
          parameters: {
            duration: options?.duration || 5,
            resolution: options?.resolution || '720p',
            motion_strength: options?.motion_strength || 5,
            aspect_ratio: options?.aspect_ratio || '9:16',
          },
          metadata: {
            project_id: projectId,
            episode_id: episodeId,
            storyboard_id: Number(storyboard.id),
          },
        };

        const externalTaskId = await videoGenerator.generateVideo(
          videoInput,
          options?.aiProvider || 'keling'
        );
        externalTaskIds.push(externalTaskId);

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await updateTaskProgress(taskId?.toString() || '', {
        progress: 75,
        message: '等待视频生成完成...',
        status: 'processing',
      });
      await job.progress(75);

      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            progress: 75,
            message: '等待视频生成完成...',
            updatedAt: new Date(),
          },
        });
        
        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'video_generate',
          progress: 75,
          status: 'processing',
          message: '等待视频生成完成...',
        });
      }

      for (let i = 0; i < storyboards.length; i++) {
        const storyboard = storyboards[i];
        const externalTaskId = externalTaskIds[i];
        const progress = 75 + Math.floor(((i + 1) / storyboards.length) * 15);
        
        const progressMessage = `正在保存第 ${i + 1}/${storyboards.length} 个视频片段...`;
        
        await updateTaskProgress(taskId?.toString() || '', {
          progress,
          message: progressMessage,
          status: 'processing',
        });
        await job.progress(progress);
        
        if (taskId) {
          await prisma.task.update({
            where: { id: taskId },
            data: {
              progress,
              message: progressMessage,
              updatedAt: new Date(),
            },
          });
          
          broadcastTaskProgress(projectId, {
            taskId: taskId.toString(),
            taskType: 'video_generate',
            progress,
            status: 'processing',
            message: progressMessage,
          });
        }

        const maxPollTime = 10 * 60 * 1000;
        const pollInterval = 5000;
        const startTime = Date.now();
        let videoUrl: string | undefined;

        while (Date.now() - startTime < maxPollTime) {
          const status = await videoGenerator.pollTaskStatus(
            externalTaskId,
            options?.aiProvider || 'keling'
          );

          if (status.status === 'completed' && status.videoUrl) {
            videoUrl = status.videoUrl;
            break;
          }

          if (status.status === 'failed') {
            throw new Error(`视频生成失败: ${status.errorMessage}`);
          }

          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        if (!videoUrl) {
          throw new Error('视频生成超时');
        }

        const minioVideoUrl = await videoGenerator.downloadAndSaveToMinIO(
          videoUrl,
          `video-clips/${projectId}/${episodeId}/${storyboard.id}.mp4`
        );

        await prisma.videoClip.create({
          data: {
            storyboardId: storyboard.id,
            videoUrl: minioVideoUrl,
            sourceType: 'ai_generated',
            aiProvider: options?.aiProvider || 'keling',
            generationParams: options,
            duration: options?.duration || 5,
            status: 'completed',
          },
        });
      }

      await updateTaskProgress(taskId?.toString() || '', {
        progress: 100,
        message: '视频生成完成',
        status: 'completed',
      });
      await job.progress(100);

      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'completed',
            progress: 100,
            message: '视频生成完成',
            updatedAt: new Date(),
            completedAt: new Date(),
          },
        });
        
        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'video_generate',
          progress: 100,
          status: 'completed',
          message: '视频生成完成',
        });
      }

      await markTaskComplete(taskId?.toString() || '', {
        episodeId,
        videoUrl: `/api/videos/${episodeId}`,
        duration: options?.duration || 60,
      });

      return {
        success: true,
        episodeId,
        videoUrl: `/api/videos/${episodeId}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('视频生成错误:', error);
      
      await updateTaskProgress(taskId?.toString() || '', {
        progress: 0,
        message: `视频生成失败: ${errorMessage}`,
        status: 'failed',
      });
      
      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'failed',
            progress: 0,
            message: `视频生成失败: ${errorMessage}`,
            updatedAt: new Date(),
          },
        });
        
        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'video_generate',
          progress: 0,
          status: 'failed',
          message: `视频生成失败: ${errorMessage}`,
        });
      }
      
      await markTaskFailed(taskId?.toString() || '', errorMessage);
      
      throw error;
    }
  });
};
