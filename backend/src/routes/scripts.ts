import { Request, Response, Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { successResponse, errorResponse, createdResponse } from '../utils/response';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { ScriptModel } from '../models/Script';

const createScriptSchema = z.object({
  title: z.string().min(1, '剧本标题不能为空').max(200, '剧本标题不能超过 200 个字符'),
  content: z.string().min(1, '剧本内容不能为空'),
  description: z.string().optional(),
});

const updateScriptSchema = z.object({
  title: z.string().min(1, '剧本标题不能为空').max(200, '剧本标题不能超过 200 个字符').optional(),
  content: z.string().optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const addVersionSchema = z.object({
  content: z.string().min(1, '剧本内容不能为空'),
  changeLog: z.string().optional(),
});

const linkCharacterSchema = z.object({
  characterId: z.string().refine((val) => !isNaN(parseInt(val)), '角色 ID 必须是有效的数字'),
});

const idParamsSchema = z.object({
  id: z.string().refine((val) => !isNaN(parseInt(val)), 'ID 必须是有效的数字'),
});

const projectIdParamsSchema = z.object({
  projectId: z.string().refine((val) => !isNaN(parseInt(val)), '项目 ID 必须是有效的数字'),
});

const scriptListQuerySchema = z.object({
  page: z.string().optional().default('1').transform((val) => parseInt(val)),
  pageSize: z.string().optional().default('20').transform((val) => parseInt(val)),
  status: z.enum(['draft', 'published', 'archived']).optional(),
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

async function checkScriptOwnership(req: Request, scriptId: bigint): Promise<boolean> {
  if (!req.user) return false;
  
  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    include: { project: true },
  });
  
  return script?.project.userId === BigInt(req.user.userId);
}

// 获取项目下的剧本列表
router.get('/projects/:projectId/scripts', 
  validateParams(projectIdParamsSchema), 
  validateQuery(scriptListQuerySchema), 
  async (req: Request, res: Response) => {
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

      const [scripts, total] = await Promise.all([
        prisma.script.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            characters: {
              include: {
                character: true,
              },
            },
          },
        }),
        prisma.script.count({ where }),
      ]);

      return res.json(successResponse({
        scripts,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      }, '获取剧本列表成功'));
    } catch (error) {
      console.error('获取剧本列表错误:', error);
      return res.status(500).json(errorResponse(500, '获取剧本列表失败'));
    }
  }
);

// 创建剧本
router.post('/projects/:projectId/scripts', 
  validateParams(projectIdParamsSchema), 
  validateBody(createScriptSchema), 
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

      const script = await ScriptModel.create({
        projectId: projectIdBigInt,
        title: data.title,
        content: data.content,
        description: data.description,
      });

      return res.status(201).json(createdResponse(script, '创建剧本成功'));
    } catch (error) {
      console.error('创建剧本错误:', error);
      return res.status(500).json(errorResponse(500, '创建剧本失败'));
    }
  }
);

// 获取剧本详情
router.get('/:id', 
  validateParams(idParamsSchema), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id } = (req as any).validatedParams;
      const scriptId = BigInt(id);

      const isOwner = await checkScriptOwnership(req, scriptId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权访问该剧本'));
      }

      const script = await ScriptModel.findById(scriptId);

      if (!script) {
        return res.status(404).json(errorResponse(404, '剧本不存在'));
      }

      return res.json(successResponse(script, '获取剧本详情成功'));
    } catch (error) {
      console.error('获取剧本详情错误:', error);
      return res.status(500).json(errorResponse(500, '获取剧本详情失败'));
    }
  }
);

// 更新剧本
router.put('/:id', 
  validateParams(idParamsSchema), 
  validateBody(updateScriptSchema), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id } = (req as any).validatedParams;
      const scriptId = BigInt(id);
      const data = (req as any).validatedBody;

      const isOwner = await checkScriptOwnership(req, scriptId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权修改该剧本'));
      }

      const script = await ScriptModel.update(scriptId, data);

      return res.json(successResponse(script, '更新剧本成功'));
    } catch (error) {
      console.error('更新剧本错误:', error);
      return res.status(500).json(errorResponse(500, '更新剧本失败'));
    }
  }
);

// 删除剧本
router.delete('/:id', 
  validateParams(idParamsSchema), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id } = (req as any).validatedParams;
      const scriptId = BigInt(id);

      const isOwner = await checkScriptOwnership(req, scriptId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权删除该剧本'));
      }

      await ScriptModel.delete(scriptId);

      return res.json(successResponse(null, '删除剧本成功'));
    } catch (error) {
      console.error('删除剧本错误:', error);
      return res.status(500).json(errorResponse(500, '删除剧本失败'));
    }
  }
);

// 添加剧本版本
router.post('/:id/versions', 
  validateParams(idParamsSchema), 
  validateBody(addVersionSchema), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id } = (req as any).validatedParams;
      const scriptId = BigInt(id);
      const { content, changeLog } = (req as any).validatedBody;

      const isOwner = await checkScriptOwnership(req, scriptId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权操作该剧本'));
      }

      const script = await ScriptModel.addVersion(scriptId, content, changeLog);

      return res.json(createdResponse(script, '添加版本成功'));
    } catch (error) {
      console.error('添加版本错误:', error);
      return res.status(500).json(errorResponse(500, '添加版本失败'));
    }
  }
);

// 获取剧本版本历史
router.get('/:id/versions', 
  validateParams(idParamsSchema), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id } = (req as any).validatedParams;
      const scriptId = BigInt(id);

      const isOwner = await checkScriptOwnership(req, scriptId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权访问该剧本'));
      }

      const versions = await ScriptModel.getVersions(scriptId);

      return res.json(successResponse(versions, '获取版本历史成功'));
    } catch (error) {
      console.error('获取版本历史错误:', error);
      return res.status(500).json(errorResponse(500, '获取版本历史失败'));
    }
  }
);

// 获取特定版本
router.get('/:id/versions/:version', 
  validateParams(idParamsSchema.extend({
    version: z.string().refine((val) => !isNaN(parseInt(val)), '版本号必须是有效的数字'),
  })), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id, version } = (req as any).validatedParams;
      const scriptId = BigInt(id);
      const versionNum = parseInt(version);

      const isOwner = await checkScriptOwnership(req, scriptId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权访问该剧本'));
      }

      const scriptVersion = await ScriptModel.getVersion(scriptId, versionNum);

      if (!scriptVersion) {
        return res.status(404).json(errorResponse(404, '版本不存在'));
      }

      return res.json(successResponse(scriptVersion, '获取版本详情成功'));
    } catch (error) {
      console.error('获取版本详情错误:', error);
      return res.status(500).json(errorResponse(500, '获取版本详情失败'));
    }
  }
);

// 关联角色到剧本
router.post('/:id/characters', 
  validateParams(idParamsSchema), 
  validateBody(linkCharacterSchema), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id } = (req as any).validatedParams;
      const { characterId } = (req as any).validatedBody;
      const scriptId = BigInt(id);
      const characterIdBigInt = BigInt(characterId);

      const isOwner = await checkScriptOwnership(req, scriptId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权操作该剧本'));
      }

      // 检查角色是否属于同一项目
      const script = await prisma.script.findUnique({
        where: { id: scriptId },
        select: { projectId: true },
      });

      const character = await prisma.character.findUnique({
        where: { id: characterIdBigInt },
        select: { projectId: true },
      });

      if (!script || !character) {
        return res.status(404).json(errorResponse(404, '剧本或角色不存在'));
      }

      if (script.projectId !== character.projectId) {
        return res.status(400).json(errorResponse(400, '角色必须属于同一项目'));
      }

      const link = await ScriptModel.linkCharacter(scriptId, characterIdBigInt);

      return res.status(201).json(createdResponse(link, '关联角色成功'));
    } catch (error) {
      console.error('关联角色错误:', error);
      return res.status(500).json(errorResponse(500, '关联角色失败'));
    }
  }
);

// 取消关联角色
router.delete('/:id/characters/:characterId', 
  validateParams(idParamsSchema.extend({
    characterId: z.string().refine((val) => !isNaN(parseInt(val)), '角色 ID 必须是有效的数字'),
  })), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id, characterId } = (req as any).validatedParams;
      const scriptId = BigInt(id);
      const characterIdBigInt = BigInt(characterId);

      const isOwner = await checkScriptOwnership(req, scriptId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权操作该剧本'));
      }

      await ScriptModel.unlinkCharacter(scriptId, characterIdBigInt);

      return res.json(successResponse(null, '取消关联角色成功'));
    } catch (error) {
      console.error('取消关联角色错误:', error);
      return res.status(500).json(errorResponse(500, '取消关联角色失败'));
    }
  }
);

// 获取剧本关联的角色列表
router.get('/:id/characters', 
  validateParams(idParamsSchema), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id } = (req as any).validatedParams;
      const scriptId = BigInt(id);

      const isOwner = await checkScriptOwnership(req, scriptId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权访问该剧本'));
      }

      const linkedCharacters = await ScriptModel.getLinkedCharacters(scriptId);

      return res.json(successResponse(linkedCharacters, '获取关联角色列表成功'));
    } catch (error) {
      console.error('获取关联角色列表错误:', error);
      return res.status(500).json(errorResponse(500, '获取关联角色列表失败'));
    }
  }
);

// 导出剧本
router.get('/:id/export', 
  validateParams(idParamsSchema), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json(errorResponse(401, '未认证'));
      }

      const { id } = (req as any).validatedParams;
      const scriptId = BigInt(id);

      const isOwner = await checkScriptOwnership(req, scriptId);
      if (!isOwner) {
        return res.status(403).json(errorResponse(403, '无权访问该剧本'));
      }

      const script = await ScriptModel.findById(scriptId);

      if (!script) {
        return res.status(404).json(errorResponse(404, '剧本不存在'));
      }

      // 导出为 JSON 格式
      const exportData = {
        title: script.title,
        description: script.description,
        content: script.content,
        version: script.version,
        status: script.status,
        createdAt: script.createdAt,
        updatedAt: script.updatedAt,
        characters: script.characters.map((sc: any) => ({
          id: sc.character.id,
          name: sc.character.name,
          description: sc.character.description,
        })),
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${script.title}.json"`);
      
      return res.json(successResponse(exportData, '导出剧本成功'));
    } catch (error) {
      console.error('导出剧本错误:', error);
      return res.status(500).json(errorResponse(500, '导出剧本失败'));
    }
  }
);

export default router;
