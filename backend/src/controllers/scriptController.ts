import { Request, Response, Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import { validateBody, validateParams } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimit';
import { StoryAnalyzer } from '../services/storyAnalysis';
import { storyQueue } from '../queues/storyQueue';
import { createTask } from '../services/taskService';

const analyzeNovelSchema = z.object({
  projectId: z.string().refine((val) => !isNaN(parseInt(val)), '项目ID必须是有效的数字'),
  novelText: z.string().min(1, '小说内容不能为空'),
  options: z.object({
    episodeCount: z.number().int().min(1).max(50).optional().default(10),
  }).optional(),
});

const idParamsSchema = z.object({
  id: z.string().refine((val) => !isNaN(parseInt(val)), 'ID必须是有效的数字'),
});

const router = Router();

async function checkProjectOwnership(req: Request, projectId: bigint): Promise<boolean> {
  if (!req.user) return false;
  
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  
  return project?.userId === BigInt((req.user as any).userId);
}

router.post('/analyze', strictLimiter, validateBody(analyzeNovelSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { projectId, novelText, options } = (req as any).validatedBody;
    const projectIdNum = BigInt(projectId);

    const isOwner = await checkProjectOwnership(req, projectIdNum);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权操作该项目'));
    }

    const project = await prisma.project.findUnique({
      where: { id: projectIdNum },
    });

    if (!project) {
      return res.status(404).json(errorResponse(404, '项目不存在'));
    }

    const task = await createTask({
      userId: Number((req.user as any).userId),
      projectId: Number(projectIdNum),
      taskType: 'story_analyze',
    });

    await storyQueue.add({
      projectId: Number(projectIdNum),
      userId: Number((req.user as any).userId),
      novelText,
      options: {
        episodeCount: options?.episodeCount || project.episodeCount,
      },
    });

    await prisma.project.update({
      where: { id: projectIdNum },
      data: {
        novelText,
        status: 'analyzing',
        updatedAt: new Date(),
      },
    });

    return res.json(successResponse({
      taskId: task.id,
      projectId: projectIdNum,
      status: 'pending',
      message: '故事分析任务已提交',
    }, '任务提交成功'));
  } catch (error) {
    console.error('分析小说错误:', error);
    return res.status(500).json(errorResponse(500, '分析小说失败'));
  }
});

router.get('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const projectId = BigInt(id);

    const isOwner = await checkProjectOwnership(req, projectId);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权访问该项目'));
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        episodes: true,
        characters: true,
        scenes: true,
        tasks: {
          where: { taskType: 'story_analyze' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      return res.status(404).json(errorResponse(404, '项目不存在'));
    }

    return res.json(successResponse({
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        novelText: project.novelText,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      episodes: project.episodes,
      characters: project.characters,
      scenes: project.scenes,
      latestTask: project.tasks[0],
    }, '获取剧本详情成功'));
  } catch (error) {
    console.error('获取剧本详情错误:', error);
    return res.status(500).json(errorResponse(500, '获取剧本详情失败'));
  }
});

router.get('/:id/episodes', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const projectId = BigInt(id);

    const isOwner = await checkProjectOwnership(req, projectId);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权访问该项目'));
    }

    const episodes = await prisma.episode.findMany({
      where: { projectId },
      orderBy: { episodeNumber: 'asc' },
      include: {
        storyboards: true,
      },
    });

    return res.json(successResponse({ episodes }, '获取分集列表成功'));
  } catch (error) {
    console.error('获取分集列表错误:', error);
    return res.status(500).json(errorResponse(500, '获取分集列表失败'));
  }
});

export default router;
