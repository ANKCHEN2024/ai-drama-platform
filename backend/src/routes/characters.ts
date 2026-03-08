import { Request, Response, Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { successResponse, errorResponse, createdResponse } from '../utils/response';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { CharacterModel } from '../models/Character';

const createCharacterSchema = z.object({
  name: z.string().min(1, '角色名称不能为空').max(100, '角色名称不能超过 100 个字符'),
  description: z.string().optional(),
  appearance: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  ageRange: z.enum(['child', 'teen', 'young_adult', 'adult', 'middle_aged', 'senior']).optional(),
  personality: z.record(z.any()).optional(),
});

const updateCharacterSchema = z.object({
  name: z.string().min(1, '角色名称不能为空').max(100, '角色名称不能超过 100 个字符').optional(),
  description: z.string().optional().nullable(),
  appearance: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  ageRange: z.enum(['child', 'teen', 'young_adult', 'adult', 'middle_aged', 'senior']).optional().nullable(),
  personality: z.record(z.any()).optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
});

const idParamsSchema = z.object({
  id: z.string().refine((val) => !isNaN(parseInt(val)), 'ID 必须是有效的数字'),
});

const projectIdParamsSchema = z.object({
  projectId: z.string().refine((val) => !isNaN(parseInt(val)), '项目 ID 必须是有效的数字'),
});

const characterListQuerySchema = z.object({
  page: z.string().optional().default('1').transform((val) => parseInt(val)),
  pageSize: z.string().optional().default('20').transform((val) => parseInt(val)),
  status: z.enum(['active', 'inactive']).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  ageRange: z.enum(['child', 'teen', 'young_adult', 'adult', 'middle_aged', 'senior']).optional(),
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

// 获取项目下的角色列表
router.get('/projects/:projectId/characters', 
  validateParams(projectIdParamsSchema), 
  validateQuery(characterListQuerySchema), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { projectId } = (req as any).validatedParams;
      const { page, pageSize, status, gender, ageRange } = (req as any).validatedQuery;
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
      if (gender) {
        where.gender = gender;
      }
      if (ageRange) {
        where.ageRange = ageRange;
      }

      const [characters, total] = await Promise.all([
        prisma.character.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            characterImages: true,
            scripts: {
              include: {
                script: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
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
      }, '获取角色列表成功'));
    } catch (error) {
      console.error('获取角色列表错误:', error);
      return res.status(500).json(errorResponse(500, '获取角色列表失败'));
    }
  }
);

// 创建角色
router.post('/projects/:projectId/characters', 
  validateParams(projectIdParamsSchema), 
  validateBody(createCharacterSchema), 
  async (req: Request, res: Response) => {
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

      const character = await CharacterModel.create({
        projectId: projectIdBigInt,
        name: data.name,
        description: data.description,
        appearance: data.appearance,
        gender: data.gender,
        ageRange: data.ageRange,
        personality: data.personality,
      });

      return res.status(201).json(createdResponse(character, '创建角色成功'));
    } catch (error) {
      console.error('创建角色错误:', error);
      return res.status(500).json(errorResponse(500, '创建角色失败'));
    }
  }
);

// 获取角色详情
router.get('/:id', 
  validateParams(idParamsSchema), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id } = (req as any).validatedParams;
      const characterId = BigInt(id);

      const isOwner = await checkCharacterOwnership(req, characterId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权访问该角色'));
      }

      const character = await CharacterModel.findById(characterId);

      if (!character) {
        return res.status(404).json(errorResponse(404, '角色不存在'));
      }

      return res.json(successResponse(character, '获取角色详情成功'));
    } catch (error) {
      console.error('获取角色详情错误:', error);
      return res.status(500).json(errorResponse(500, '获取角色详情失败'));
    }
  }
);

// 更新角色
router.put('/:id', 
  validateParams(idParamsSchema), 
  validateBody(updateCharacterSchema), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id } = (req as any).validatedParams;
      const characterId = BigInt(id);
      const data = (req as any).validatedBody;

      const isOwner = await checkCharacterOwnership(req, characterId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权修改该角色'));
      }

      const character = await CharacterModel.update(characterId, data);

      return res.json(successResponse(character, '更新角色成功'));
    } catch (error) {
      console.error('更新角色错误:', error);
      return res.status(500).json(errorResponse(500, '更新角色失败'));
    }
  }
);

// 删除角色
router.delete('/:id', 
  validateParams(idParamsSchema), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id } = (req as any).validatedParams;
      const characterId = BigInt(id);

      const isOwner = await checkCharacterOwnership(req, characterId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权删除该角色'));
      }

      await CharacterModel.delete(characterId);

      return res.json(successResponse(null, '删除角色成功'));
    } catch (error) {
      console.error('删除角色错误:', error);
      return res.status(500).json(errorResponse(500, '删除角色失败'));
    }
  }
);

// 获取角色关联的剧本列表
router.get('/:id/scripts', 
  validateParams(idParamsSchema), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id } = (req as any).validatedParams;
      const characterId = BigInt(id);

      const isOwner = await checkCharacterOwnership(req, characterId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权访问该角色'));
      }

      const linkedScripts = await CharacterModel.getLinkedScripts(characterId);

      return res.json(successResponse(linkedScripts, '获取关联剧本列表成功'));
    } catch (error) {
      console.error('获取关联剧本列表错误:', error);
      return res.status(500).json(errorResponse(500, '获取关联剧本列表失败'));
    }
  }
);

export default router;
