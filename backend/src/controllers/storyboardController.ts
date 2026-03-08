import { Request, Response, Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { successResponse, errorResponse, createdResponse } from '../utils/response';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimit';
import { storyboardQueue } from '../queues/storyboardQueue';
import { createTask } from '../services/taskService';

const createStoryboardSchema = z.object({
  shotNumber: z.number().int().min(1, '镜头编号至少为1'),
  description: z.string().optional(),
  visualDescription: z.string().optional(),
  shotType: z.string().optional(),
  cameraAngle: z.string().optional(),
  cameraMovement: z.string().optional(),
  duration: z.number().int().optional(),
  dialogue: z.string().optional(),
  action: z.string().optional(),
});

const updateStoryboardSchema = z.object({
  shotNumber: z.number().int().min(1, '镜头编号至少为1').optional(),
  description: z.string().optional().nullable(),
  visualDescription: z.string().optional().nullable(),
  shotType: z.string().optional().nullable(),
  cameraAngle: z.string().optional().nullable(),
  cameraMovement: z.string().optional().nullable(),
  duration: z.number().int().optional().nullable(),
  dialogue: z.string().optional().nullable(),
  action: z.string().optional().nullable(),
  status: z.enum(['draft', 'ready', 'generating', 'completed', 'failed']).optional(),
});

const generateStoryboardSchema = z.object({
  style: z.string().optional(),
  shotCount: z.number().int().min(1, '镜头数至少为1').max(50, '镜头数最多为50').optional().default(10),
});

const idParamsSchema = z.object({
  id: z.string().refine((val) => !isNaN(parseInt(val)), 'ID必须是有效的数字'),
});

const episodeIdParamsSchema = z.object({
  episodeId: z.string().refine((val) => !isNaN(parseInt(val)), '剧集ID必须是有效的数字'),
});

const storyboardListQuerySchema = z.object({
  page: z.string().optional().default('1').transform((val) => parseInt(val)),
  pageSize: z.string().optional().default('50').transform((val) => parseInt(val)),
  status: z.enum(['draft', 'ready', 'generating', 'completed', 'failed']).optional(),
});

const router = Router();

async function checkEpisodeOwnership(req: Request, episodeId: bigint): Promise<boolean> {
  if (!req.user) return false;
  
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { project: true },
  });
  
  return episode?.project.userId === BigInt(req.user.userId);
}

async function checkStoryboardOwnership(req: Request, storyboardId: bigint): Promise<boolean> {
  if (!req.user) return false;
  
  const storyboard = await prisma.storyboard.findUnique({
    where: { id: storyboardId },
    include: { episode: { include: { project: true } } },
  });
  
  return storyboard?.episode.project.userId === BigInt(req.user.userId);
}

router.get('/episodes/:episodeId/storyboards', validateParams(episodeIdParamsSchema), validateQuery(storyboardListQuerySchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { episodeId } = (req as any).validatedParams;
    const { page, pageSize, status } = (req as any).validatedQuery;
    const episodeIdBigInt = BigInt(episodeId);

    const isOwner = await checkEpisodeOwnership(req, episodeIdBigInt);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权访问该剧集'));
    }

    const skip = (page - 1) * pageSize;
    const where: any = { episodeId: episodeIdBigInt };
    
    if (status) {
      where.status = status;
    }

    const [storyboards, total] = await Promise.all([
      prisma.storyboard.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { shotNumber: 'asc' },
        include: { videoClips: true },
      }),
      prisma.storyboard.count({ where }),
    ]);

    return res.json(successResponse({
      storyboards,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }, '获取分镜列表成功'));
  } catch (error) {
    console.error('获取分镜列表错误:', error);
    return res.status(500).json(errorResponse(500, '获取分镜列表失败'));
  }
});

router.post('/episodes/:episodeId/storyboards', strictLimiter, validateParams(episodeIdParamsSchema), validateBody(generateStoryboardSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { episodeId } = (req as any).validatedParams;
    const options = (req as any).validatedBody;
    const episodeIdBigInt = BigInt(episodeId);

    const isOwner = await checkEpisodeOwnership(req, episodeIdBigInt);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权操作该剧集'));
    }

    const episode = await prisma.episode.findUnique({
      where: { id: episodeIdBigInt },
      include: { project: true },
    });

    if (!episode) {
      return res.status(404).json(errorResponse(404, '剧集不存在'));
    }

    const task = await createTask({
      userId: req.user.userId,
      projectId: Number(episode.projectId),
      taskType: 'storyboard_generate',
      episodeId: Number(episodeId),
      options,
    });

    const job = await storyboardQueue.add({
      projectId: Number(episode.projectId),
      userId: req.user.userId,
      episodeId: Number(episodeId),
      options,
    });

    return res.status(202).json(createdResponse({
      taskId: task.id,
      jobId: job.id,
      episodeId: episodeId,
      status: 'pending',
    }, '分镜生成任务已提交'));
  } catch (error) {
    console.error('生成分镜错误:', error);
    return res.status(500).json(errorResponse(500, '生成分镜失败'));
  }
});

router.post('/episodes/:episodeId/storyboards/create', strictLimiter, validateParams(episodeIdParamsSchema), validateBody(createStoryboardSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { episodeId } = (req as any).validatedParams;
    const data = (req as any).validatedBody;
    const episodeIdBigInt = BigInt(episodeId);

    const isOwner = await checkEpisodeOwnership(req, episodeIdBigInt);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权操作该剧集'));
    }

    const storyboard = await prisma.storyboard.create({
      data: {
        ...data,
        episodeId: episodeIdBigInt,
      },
    });

    return res.status(201).json(createdResponse(storyboard, '创建分镜成功'));
  } catch (error) {
    console.error('创建分镜错误:', error);
    return res.status(500).json(errorResponse(500, '创建分镜失败'));
  }
});

router.get('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const storyboardId = BigInt(id);

    const isOwner = await checkStoryboardOwnership(req, storyboardId);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权访问该分镜'));
    }

    const storyboard = await prisma.storyboard.findUnique({
      where: { id: storyboardId },
      include: { videoClips: true },
    });

    if (!storyboard) {
      return res.status(404).json(errorResponse(404, '分镜不存在'));
    }

    return res.json(successResponse(storyboard, '获取分镜详情成功'));
  } catch (error) {
    console.error('获取分镜详情错误:', error);
    return res.status(500).json(errorResponse(500, '获取分镜详情失败'));
  }
});

router.put('/:id', validateParams(idParamsSchema), validateBody(updateStoryboardSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const storyboardId = BigInt(id);
    const data = (req as any).validatedBody;

    const isOwner = await checkStoryboardOwnership(req, storyboardId);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权修改该分镜'));
    }

    const storyboard = await prisma.storyboard.update({
      where: { id: storyboardId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return res.json(successResponse(storyboard, '更新分镜成功'));
  } catch (error) {
    console.error('更新分镜错误:', error);
    return res.status(500).json(errorResponse(500, '更新分镜失败'));
  }
});

router.delete('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const storyboardId = BigInt(id);

    const isOwner = await checkStoryboardOwnership(req, storyboardId);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权删除该分镜'));
    }

    await prisma.storyboard.delete({
      where: { id: storyboardId },
    });

    return res.json(successResponse(null, '删除分镜成功'));
  } catch (error) {
    console.error('删除分镜错误:', error);
    return res.status(500).json(errorResponse(500, '删除分镜失败'));
  }
});

export default router;
