import Queue from 'bull';
import prisma from '../config/database';
import { VideoComposer, VideoCompositeInput } from '../services/videoComposite';
import { broadcastTaskProgress } from '../websocket';
import logger from '../utils/logger';

export interface CompositeJobData {
  projectId: number;
  userId: number;
  episodeId: number;
  videoClipIds: number[];
  voiceOverId?: number;
  bgmId?: number;
  subtitleId?: number;
  transitions?: Array<{ type: string; duration: number }>;
  outputOptions?: any;
}

const videoComposer = new VideoComposer();

export const startCompositeWorker = (queue: Queue.Queue<CompositeJobData>) => {
  queue.process(async (job) => {
    const {
      projectId,
      userId,
      episodeId,
      videoClipIds,
      voiceOverId,
      bgmId,
      subtitleId,
      transitions,
      outputOptions,
    } = job.data;

    let taskId: bigint | undefined;

    try {
      const task = await prisma.task.findFirst({
        where: {
          projectId: BigInt(projectId),
          userId: BigInt(userId),
          taskType: 'video_compose',
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

      await job.progress(10);

      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'processing',
            progress: 10,
            message: '正在合成视频...',
            updatedAt: new Date(),
          },
        });

        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'video_compose',
          progress: 10,
          status: 'processing',
          message: '正在合成视频...',
        });
      }

      const videoClips = await prisma.videoClip.findMany({
        where: { id: { in: videoClipIds.map(id => BigInt(id)) }, storyboard: { episodeId: BigInt(episodeId) } },
      });

      let voiceOver: string | undefined;
      if (voiceOverId) {
        const audio = await prisma.audio.findUnique({
          where: { id: BigInt(voiceOverId), episodeId: BigInt(episodeId) },
        });
        voiceOver = audio?.audioUrl;
      }

      let bgm: string | undefined;
      if (bgmId) {
        const bgmData = await prisma.bgm.findUnique({
          where: { id: BigInt(bgmId), episodeId: BigInt(episodeId) },
        });
        bgm = bgmData?.audioUrl;
      }

      let subtitles: string | undefined;

      const compositeInput: VideoCompositeInput = {
        videoClips: videoClips.map(clip => clip.videoUrl),
        voiceOver,
        bgm,
        subtitles,
        transitions,
        metadata: {
          project_id: projectId,
          episode_id: episodeId,
        },
        outputOptions,
      };

      await job.progress(50);

      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            progress: 50,
            message: '正在处理视频...',
            updatedAt: new Date(),
          },
        });

        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'video_compose',
          progress: 50,
          status: 'processing',
          message: '正在处理视频...',
        });
      }

      const result = await videoComposer.compose(compositeInput);

      await job.progress(90);

      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            progress: 90,
            message: '保存视频...',
            updatedAt: new Date(),
          },
        });

        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'video_compose',
          progress: 90,
          status: 'processing',
          message: '保存视频...',
        });
      }

      const video = await prisma.video.create({
        data: {
          episodeId: BigInt(episodeId),
          videoUrl: result.video_url,
          resolution: result.resolution,
          format: 'mp4',
          duration: result.duration,
          fileSize: result.file_size ? BigInt(result.file_size) : undefined,
          status: 'completed',
          compositionParams: {
            previewUrl: result.preview_url,
            thumbnailUrl: result.thumbnail_url,
          },
        },
      });

      await job.progress(100);

      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'completed',
            progress: 100,
            message: '视频合成完成',
            updatedAt: new Date(),
            completedAt: new Date(),
          },
        });

        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'video_compose',
          progress: 100,
          status: 'completed',
          message: '视频合成完成',
          videoId: video.id,
          videoUrl: result.video_url,
        });
      }

      return {
        success: true,
        videoId: video.id,
        videoUrl: result.video_url,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('视频合成错误:', error);

      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'failed',
            progress: 0,
            message: `视频合成失败: ${errorMessage}`,
            updatedAt: new Date(),
          },
        });

        broadcastTaskProgress(projectId, {
          taskId: taskId.toString(),
          taskType: 'video_compose',
          progress: 0,
          status: 'failed',
          message: `视频合成失败: ${errorMessage}`,
        });
      }

      throw error;
    }
  });
};
