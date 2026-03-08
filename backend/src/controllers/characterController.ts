import { Request, Response, Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { successResponse, errorResponse, createdResponse } from '../utils/response';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimit';
import { characterQueue } from '../queues/characterQueue';
import { createTask } from '../services/taskService';

const createCharacterSchema = z.object({
  name: z.string().min(1, '人物名称不能为空').max(100, '人物名称不能超过100个字符'),
  description: z.string().optional(),
  appearance: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  ageRange: z.enum(['child', 'teen', 'young_adult', 'adult', 'middle_aged', 'senior']).optional(),
  personality: z.record(z.string(), z.any()).optional(),
});

const updateCharacterSchema = z.object({
  name: z.string().min(1, '人物名称不能为空').max(100, '人物名称不能超过100个字符').optional(),
  description: z.string().optional().nullable(),
  appearance: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  ageRange: z.enum(['child', 'teen', 'young_adult', 'adult', 'middle_aged', 'senior']).optional().nullable(),
  personality: z.record(z.string(), z.any()).optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
});

const generateImageSchema = z.object({
  style: z.string().optional(),
  aspectRatio: z.enum(['9:16', '16:9', '1:1', '4:3']).optional().default('9:16'),
});

const idParamsSchema = z.object({
  id: z.string().refine((val) => !isNaN(parseInt(val)), 'ID必须是有效的数字'),
});

const projectIdParamsSchema = z.object({
  projectId: z.string().refine((val) => !isNaN(parseInt(val)), '项目ID必须是有效的数字'),
});

const characterListQuerySchema = z.object({
  page: z.string().optional().default('1').transform((val) => parseInt(val)),
  pageSize: z.string().optional().default('20').transform((val) => parseInt(val)),
  status: z.enum(['active', 'inactive']).optional(),
});

const router = Router();

async function checkProjectOwnership(req: Request, projectId: bigint): Promise<boolean> {
  if (!req.user) return false;
  
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  
  return project?.userId === BigInt(req.user.userId);
}

async function checkCharacterOwnership(req: Request, characterId: bigint): Promise<boolean> {
  if (!req.user) return false;
  
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { project: true },
  });
  
  return character?.project.userId === BigInt(req.user.userId);
}

router.get('/projects/:projectId/characters', validateParams(projectIdParamsSchema), validateQuery(characterListQuerySchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { projectId } = (req as any).validatedParams;
    const { page, pageSize, status } = (req as any).validatedQuery;
    const projectIdBigInt = BigInt(projectId);

    const isOwner = await checkProjectOwnership(req, projectIdBigInt);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权访问该项目'));
    }

    const skip = (page - 1) * pageSize;
    const where: any = { projectId: projectIdBigInt };
    
    if (status) {
      where.status = status;
    }

    const [characters, total] = await Promise.all([
      prisma.character.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { characterImages: true },
      }),
      prisma.character.count({ where }),
    ]);

    return res.json(successResponse({
      characters,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }, '获取人物列表成功'));
  } catch (error) {
    console.error('获取人物列表错误:', error);
    return res.status(500).json(errorResponse(500, '获取人物列表失败'));
  }
});

router.post('/projects/:projectId/characters', strictLimiter, validateParams(projectIdParamsSchema), validateBody(createCharacterSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { projectId } = (req as any).validatedParams;
    const data = (req as any).validatedBody;
    const projectIdBigInt = BigInt(projectId);

    const isOwner = await checkProjectOwnership(req, projectIdBigInt);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权操作该项目'));
    }

    const character = await prisma.character.create({
      data: {
        ...data,
        projectId: projectIdBigInt,
      },
    });

    return res.status(201).json(createdResponse(character, '创建人物成功'));
  } catch (error) {
    console.error('创建人物错误:', error);
    return res.status(500).json(errorResponse(500, '创建人物失败'));
  }
});

router.get('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const characterId = BigInt(id);

    const isOwner = await checkCharacterOwnership(req, characterId);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权访问该人物'));
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: { characterImages: true },
    });

    if (!character) {
      return res.status(404).json(errorResponse(404, '人物不存在'));
    }

    return res.json(successResponse(character, '获取人物详情成功'));
  } catch (error) {
    console.error('获取人物详情错误:', error);
    return res.status(500).json(errorResponse(500, '获取人物详情失败'));
  }
});

router.put('/:id', validateParams(idParamsSchema), validateBody(updateCharacterSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const characterId = BigInt(id);
    const data = (req as any).validatedBody;

    const isOwner = await checkCharacterOwnership(req, characterId);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权修改该人物'));
    }

    const character = await prisma.character.update({
      where: { id: characterId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return res.json(successResponse(character, '更新人物成功'));
  } catch (error) {
    console.error('更新人物错误:', error);
    return res.status(500).json(errorResponse(500, '更新人物失败'));
  }
});

router.delete('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const characterId = BigInt(id);

    const isOwner = await checkCharacterOwnership(req, characterId);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权删除该人物'));
    }

    await prisma.character.delete({
      where: { id: characterId },
    });

    return res.json(successResponse(null, '删除人物成功'));
  } catch (error) {
    console.error('删除人物错误:', error);
    return res.status(500).json(errorResponse(500, '删除人物失败'));
  }
});

router.post('/:id/generate', strictLimiter, validateParams(idParamsSchema), validateBody(generateImageSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const characterId = BigInt(id);
    const options = (req as any).validatedBody;

    const isOwner = await checkCharacterOwnership(req, characterId);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权操作该人物'));
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: { project: true },
    });

    if (!character) {
      return res.status(404).json(errorResponse(404, '人物不存在'));
    }

    const task = await createTask({
      userId: req.user.userId,
      projectId: Number(character.projectId),
      taskType: 'character_generate',
      characterId: Number(characterId),
      options,
    });

    const job = await characterQueue.add({
      projectId: Number(character.projectId),
      userId: req.user.userId,
      characterId: Number(characterId),
      options,
    });

    return res.status(202).json(createdResponse({
      taskId: task.id,
      jobId: job.id,
      characterId: characterId,
      status: 'pending',
    }, '人物图像生成任务已提交'));
  } catch (error) {
    console.error('生成人物图像错误:', error);
    return res.status(500).json(errorResponse(500, '生成人物图像失败'));
  }
});

router.get('/:id/images', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const characterId = BigInt(id);

    const isOwner = await checkCharacterOwnership(req, characterId);
    if (!isOwner) {
      return res.status(403).json(errorResponse(403, '无权访问该人物'));
    }

    const images = await prisma.characterImage.findMany({
      where: { characterId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(successResponse(images, '获取人物图像列表成功'));
  } catch (error) {
    console.error('获取人物图像列表错误:', error);
    return res.status(500).json(errorResponse(500, '获取人物图像列表失败'));
  }
});

export default router;
