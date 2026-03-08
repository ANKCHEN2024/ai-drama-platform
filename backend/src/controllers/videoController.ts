import { Request, Response, Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { successResponse, errorResponse, createdResponse } from '../utils/response';
import { validateBody, validateParams } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimit';
import { VideoGenerator, VideoInput, APIProvider } from '../services/videoGeneration';
import videoQueue from '../queues/videoQueue';
import { broadcastTaskProgress } from '../websocket';
import logger from '../utils/logger';

const generateVideoSchema = z.object({
  projectId: z.string().refine((val) => !isNaN(parseInt(val)), '项目ID必须是有效的数字'),
  episodeId: z.string().refine((val) => !isNaN(parseInt(val)), '剧集ID必须是有效的数字'),
  storyboardIds: z.array(z.string().refine((val) => !isNaN(parseInt(val)), '分镜ID必须是有效的数字')),
  aiProvider: z.enum(['keling', 'jimeng']).optional().default('keling'),
  options: z.object({
    resolution: z.enum(['720p', '1080p']).optional().default('720p'),
    duration: z.number().int().min(1).max(10).optional().default(5),
    motion_strength: z.number().int().min(1).max(10).optional().default(5),
    aspect_ratio: z.enum(['16:9', '9:16', '1:1']).optional().default('9:16'),
  }).optional(),
});

const idParamsSchema = z.object({
  id: z.string().refine((val) => !isNaN(parseInt(val)), 'ID必须是有效的数字'),
});

const router = Router();

const videoGenerator = new VideoGenerator();

router.post('/generate', strictLimiter, validateBody(generateVideoSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const data = (req as any).validatedBody;
    const projectId = BigInt(data.projectId);
    const episodeId = BigInt(data.episodeId);
    const storyboardIds = data.storyboardIds.map((id: string) => BigInt(id));

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project || project.userId !== BigInt(req.user.userId)) {
      return res.status(403).json(errorResponse(403, '无权访问该项目'));
    }

    const storyboards = await prisma.storyboard.findMany({
      where: { id: { in: storyboardIds }, episodeId },
    });

    if (storyboards.length !== storyboardIds.length) {
      return res.status(404).json(errorResponse(404, '部分分镜不存在'));
    }

    const job = await videoQueue.add({
      projectId: Number(projectId),
      userId: Number(req.user.userId),
      episodeId: Number(episodeId),
      storyboardIds: storyboardIds.map(Number),
      options: {
        resolution: data.options?.resolution,
        duration: data.options?.duration,
        aiProvider: data.aiProvider,
      },
    });

    const task = await prisma.task.create({
      data: {
        userId: BigInt(req.user.userId),
        projectId,
        taskType: 'video_generate',
        status: 'pending',
        progress: 0,
        message: '视频生成任务已创建',
        metadata: {
          jobId: job.id,
          episodeId: Number(episodeId),
          storyboardIds: storyboardIds.map(Number),
          aiProvider: data.aiProvider,
        },
      },
    });

    broadcastTaskProgress(Number(projectId), {
      taskId: task.id.toString(),
      taskType: 'video_generate',
      progress: 0,
      status: 'pending',
      message: '视频生成任务已创建',
    });

    return res.status(201).json(createdResponse({
      taskId: task.id,
      jobId: job.id,
    }, '视频生成任务已提交'));
  } catch (error) {
    logger.error('生成视频错误:', error);
    return res.status(500).json(errorResponse(500, '生成视频失败'));
  }
});

router.get('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
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

    return res.json(successResponse(video, '获取视频详情成功'));
  } catch (error) {
    logger.error('获取视频详情错误:', error);
    return res.status(500).json(errorResponse(500, '获取视频详情失败'));
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

router.delete('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
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
      return res.status(403).json(errorResponse(403, '无权删除该视频'));
    }

    await prisma.video.delete({
      where: { id: videoId },
    });

    return res.json(successResponse(null, '删除视频成功'));
  } catch (error) {
    logger.error('删除视频错误:', error);
    return res.status(500).json(errorResponse(500, '删除视频失败'));
  }
});

router.post('/:id/regenerate', strictLimiter, validateParams(idParamsSchema), async (req: Request, res: Response) => {
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
              select: { userId: true, id: true },
            },
            storyboards: true,
          },
        },
      },
    });

    if (!video) {
      return res.status(404).json(errorResponse(404, '视频不存在'));
    }

    if (video.episode.project.userId !== BigInt(req.user.userId)) {
      return res.status(403).json(errorResponse(403, '无权重新生成该视频'));
    }

    const storyboardIds = video.episode.storyboards.map(sb => sb.id);

    const job = await videoQueue.add({
      projectId: Number(video.episode.project.id),
      userId: Number(req.user.userId),
      episodeId: Number(video.episodeId),
      storyboardIds: storyboardIds.map(Number),
      options: {
        resolution: '720p',
        duration: 5,
        aiProvider: 'keling',
      },
    });

    const task = await prisma.task.create({
      data: {
        userId: BigInt(req.user.userId),
        projectId: video.episode.project.id,
        taskType: 'video_generate',
        status: 'pending',
        progress: 0,
        message: '视频重新生成任务已创建',
        metadata: {
          jobId: job.id,
          episodeId: Number(video.episodeId),
          storyboardIds: storyboardIds.map(Number),
          aiProvider: 'keling',
        },
      },
    });

    broadcastTaskProgress(Number(video.episode.project.id), {
      taskId: task.id.toString(),
      taskType: 'video_generate',
      progress: 0,
      status: 'pending',
      message: '视频重新生成任务已创建',
    });

    return res.status(201).json(createdResponse({
      taskId: task.id,
      jobId: job.id,
    }, '视频重新生成任务已提交'));
  } catch (error) {
    logger.error('重新生成视频错误:', error);
    return res.status(500).json(errorResponse(500, '重新生成视频失败'));
  }
});

export default router;
