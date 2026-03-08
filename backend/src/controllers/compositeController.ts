import { Request, Response, Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { successResponse, errorResponse, createdResponse } from '../utils/response';
import { validateBody, validateParams } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimit';
import { VideoComposer, VideoCompositeInput } from '../services/videoComposite';
import { broadcastTaskProgress } from '../websocket';
import logger from '../utils/logger';

const composeVideoSchema = z.object({
  projectId: z.string().refine((val) => !isNaN(parseInt(val)), '项目ID必须是有效的数字'),
  episodeId: z.string().refine((val) => !isNaN(parseInt(val)), '剧集ID必须是有效的数字'),
  videoClipIds: z.array(z.string().refine((val) => !isNaN(parseInt(val)), '视频片段ID必须是有效的数字')),
  voiceOverId: z.string().refine((val) => !isNaN(parseInt(val)), '配音ID必须是有效的数字').optional(),
  bgmId: z.string().refine((val) => !isNaN(parseInt(val)), 'BGM ID必须是有效的数字').optional(),
  subtitleId: z.string().refine((val) => !isNaN(parseInt(val)), '字幕ID必须是有效的数字').optional(),
  transitions: z.array(z.object({
    type: z.enum(['fade', 'slide', 'wipe', 'dissolve']).default('fade'),
    duration: z.number().min(0.1).max(5).default(0.5),
  })).optional(),
  outputOptions: z.object({
    resolution: z.enum(['1280x720', '1920x1080', '3840x2160']).optional().default('1920x1080'),
    fps: z.number().int().min(24).max(60).optional().default(30),
    videoCodec: z.string().optional().default('libx264'),
    videoBitrate: z.string().optional().default('8M'),
    audioCodec: z.string().optional().default('aac'),
    audioBitrate: z.string().optional().default('128k'),
  }).optional(),
});

const idParamsSchema = z.object({
  id: z.string().refine((val) => !isNaN(parseInt(val)), 'ID必须是有效的数字'),
});

const router = Router();

const videoComposer = new VideoComposer();

router.post('/', strictLimiter, validateBody(composeVideoSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const data = (req as any).validatedBody;
    const projectId = BigInt(data.projectId);
    const episodeId = BigInt(data.episodeId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project || project.userId !== BigInt(req.user.userId)) {
      return res.status(403).json(errorResponse(403, '无权访问该项目'));
    }

    const videoClips = await prisma.videoClip.findMany({
      where: { id: { in: data.videoClipIds.map((id: string) => BigInt(id)) }, storyboard: { episodeId } },
    });

    if (videoClips.length !== data.videoClipIds.length) {
      return res.status(404).json(errorResponse(404, '部分视频片段不存在'));
    }

    let voiceOver: string | undefined;
    if (data.voiceOverId) {
      const audio = await prisma.audio.findUnique({
        where: { id: BigInt(data.voiceOverId), episodeId },
      });
      voiceOver = audio?.audioUrl;
    }

    let bgm: string | undefined;
    if (data.bgmId) {
      const bgmData = await prisma.bgm.findUnique({
        where: { id: BigInt(data.bgmId), episodeId },
      });
      bgm = bgmData?.audioUrl;
    }

    let subtitles: string | undefined;

    const task = await prisma.task.create({
      data: {
        userId: BigInt(req.user.userId),
        projectId,
        taskType: 'video_compose',
        status: 'pending',
        progress: 0,
        message: '视频合成任务已创建',
        metadata: {
          episodeId: Number(episodeId),
          videoClipIds: data.videoClipIds.map((id: string) => Number(id)),
        },
      },
    });

    broadcastTaskProgress(Number(projectId), {
      taskId: task.id.toString(),
      taskType: 'video_compose',
      progress: 0,
      status: 'pending',
      message: '视频合成任务已创建',
    });

    (async () => {
      try {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'processing',
            progress: 10,
            message: '正在合成视频...',
            updatedAt: new Date(),
          },
        });

        broadcastTaskProgress(Number(projectId), {
          taskId: task.id.toString(),
          taskType: 'video_compose',
          progress: 10,
          status: 'processing',
          message: '正在合成视频...',
        });

        const compositeInput: VideoCompositeInput = {
          videoClips: videoClips.map(clip => clip.videoUrl),
          voiceOver,
          bgm,
          subtitles,
          transitions: data.transitions,
          metadata: {
            project_id: Number(projectId),
            episode_id: Number(episodeId),
          },
          outputOptions: data.outputOptions,
        };

        const result = await videoComposer.compose(compositeInput);

        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'completed',
            progress: 100,
            message: '视频合成完成',
            updatedAt: new Date(),
            completedAt: new Date(),
          },
        });

        const video = await prisma.video.create({
          data: {
            episodeId,
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

        broadcastTaskProgress(Number(projectId), {
          taskId: task.id.toString(),
          taskType: 'video_compose',
          progress: 100,
          status: 'completed',
          message: '视频合成完成',
          videoId: video.id,
          videoUrl: result.video_url,
        });
      } catch (error) {
        logger.error('视频合成错误:', error);
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'failed',
            progress: 0,
            message: error instanceof Error ? error.message : '视频合成失败',
            updatedAt: new Date(),
          },
        });

        broadcastTaskProgress(Number(projectId), {
          taskId: task.id.toString(),
          taskType: 'video_compose',
          progress: 0,
          status: 'failed',
          message: error instanceof Error ? error.message : '视频合成失败',
        });
      }
    })();

    return res.status(201).json(createdResponse({
      taskId: task.id,
    }, '视频合成任务已提交'));
  } catch (error) {
    logger.error('合成视频错误:', error);
    return res.status(500).json(errorResponse(500, '合成视频失败'));
  }
});

router.get('/:id/status', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const taskId = BigInt(id);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    if (!task) {
      return res.status(404).json(errorResponse(404, '任务不存在'));
    }

    if (task.project?.userId !== BigInt(req.user.userId)) {
      return res.status(403).json(errorResponse(403, '无权访问该任务'));
    }

    return res.json(successResponse({
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      message: task.message,
      metadata: task.metadata,
    }, '获取任务状态成功'));
  } catch (error) {
    logger.error('获取任务状态错误:', error);
    return res.status(500).json(errorResponse(500, '获取任务状态失败'));
  }
});

router.get('/:id/result', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const videoId = BigInt(id);

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        episode: {
          include: {
            project: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!video) {
      return res.status(404).json(errorResponse(404, '视频不存在'));
    }

    if (video.episode.project.userId !== BigInt(req.user.userId)) {
      return res.status(403).json(errorResponse(403, '无权访问该视频'));
    }

    return res.json(successResponse(video, '获取视频结果成功'));
  } catch (error) {
    logger.error('获取视频结果错误:', error);
    return res.status(500).json(errorResponse(500, '获取视频结果失败'));
  }
});

export default router;
