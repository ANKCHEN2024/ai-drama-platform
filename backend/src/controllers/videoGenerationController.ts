import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { VideoGenerationService } from '../services/videoGeneration/videoGenerationService';

const prisma = new PrismaClient();
const videoGenerationService = new VideoGenerationService();

/**
 * 创建视频生成任务
 * POST /api/scenes/:sceneId/generate
 */
export const createGeneration = async (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;
    const { templateId, config } = req.body;

    // 验证场景是否存在
    const scene = await prisma.sceneV2.findUnique({
      where: { id: BigInt(sceneId) },
    });

    if (!scene) {
      return res.status(404).json({ error: '场景不存在' });
    }

    // 如果提供了模板 ID，验证模板
    let template = null;
    if (templateId) {
      template = await prisma.videoTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return res.status(404).json({ error: '视频模板不存在' });
      }
    }

    // 创建生成任务
    const generation = await videoGenerationService.createGeneration({
      sceneId: BigInt(sceneId),
      templateId: template?.id,
      config: config || {},
    });

    res.status(201).json({
      success: true,
      data: generation,
    });
  } catch (error) {
    console.error('创建视频生成任务失败:', error);
    res.status(500).json({ error: '创建视频生成任务失败' });
  }
};

/**
 * 获取场景的视频生成历史
 * GET /api/scenes/:sceneId/generations
 */
export const getSceneGenerations = async (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;
    const { page = '1', limit = '10', status } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { sceneId: BigInt(sceneId) };
    if (status) {
      where.status = status;
    }

    const [generations, total] = await Promise.all([
      prisma.videoGeneration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          scene: {
            select: {
              id: true,
              number: true,
              content: true,
            },
          },
        },
      }),
      prisma.videoGeneration.count({ where }),
    ]);

    res.json({
      success: true,
      data: generations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取视频生成历史失败:', error);
    res.status(500).json({ error: '获取视频生成历史失败' });
  }
};

/**
 * 获取生成任务详情
 * GET /api/generations/:id
 */
export const getGeneration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const generation = await prisma.videoGeneration.findUnique({
      where: { id },
      include: {
        scene: {
          select: {
            id: true,
            number: true,
            content: true,
            episode: {
              select: {
                id: true,
                number: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!generation) {
      return res.status(404).json({ error: '生成任务不存在' });
    }

    res.json({
      success: true,
      data: generation,
    });
  } catch (error) {
    console.error('获取生成任务详情失败:', error);
    res.status(500).json({ error: '获取生成任务详情失败' });
  }
};

/**
 * 删除生成记录
 * DELETE /api/generations/:id
 */
export const deleteGeneration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const generation = await prisma.videoGeneration.findUnique({
      where: { id },
    });

    if (!generation) {
      return res.status(404).json({ error: '生成记录不存在' });
    }

    // 如果正在处理中，先取消任务
    if (generation.status === 'processing') {
      await videoGenerationService.cancelGeneration(id);
    }

    await prisma.videoGeneration.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除生成记录失败:', error);
    res.status(500).json({ error: '删除生成记录失败' });
  }
};

/**
 * 取消生成任务
 * POST /api/generations/:id/cancel
 */
export const cancelGeneration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const generation = await prisma.videoGeneration.findUnique({
      where: { id },
    });

    if (!generation) {
      return res.status(404).json({ error: '生成任务不存在' });
    }

    if (generation.status === 'completed' || generation.status === 'failed') {
      return res.status(400).json({ error: '任务已完成或失败，无法取消' });
    }

    const updated = await videoGenerationService.cancelGeneration(id);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('取消生成任务失败:', error);
    res.status(500).json({ error: '取消生成任务失败' });
  }
};

/**
 * 获取视频模板列表
 * GET /api/generations/templates
 */
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const { category, isActive } = req.query;

    const where: any = {};
    if (category) {
      where.category = category as string;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const templates = await prisma.videoTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('获取视频模板列表失败:', error);
    res.status(500).json({ error: '获取视频模板列表失败' });
  }
};

/**
 * 创建视频模板
 * POST /api/generations/templates
 */
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { name, description, category, duration, thumbnail, config, isDefault } = req.body;

    // 验证必填字段
    if (!name || !category || !duration) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 如果设置为默认模板，取消其他默认模板
    if (isDefault) {
      await prisma.videoTemplate.updateMany({
        where: { category, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.videoTemplate.create({
      data: {
        name,
        description,
        category,
        duration,
        thumbnail,
        config: config || {},
        isDefault: isDefault || false,
      },
    });

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('创建视频模板失败:', error);
    res.status(500).json({ error: '创建视频模板失败' });
  }
};

/**
 * 更新视频模板
 * PUT /api/generations/templates/:id
 */
export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, category, duration, thumbnail, config, isDefault, isActive } = req.body;

    const existing = await prisma.videoTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: '模板不存在' });
    }

    // 如果设置为默认模板，取消其他默认模板
    if (isDefault && existing.category !== category) {
      await prisma.videoTemplate.updateMany({
        where: { category: category as string, isDefault: true },
        data: { isDefault: false },
      });
    } else if (isDefault) {
      await prisma.videoTemplate.updateMany({
        where: { category: existing.category, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const template = await prisma.videoTemplate.update({
      where: { id },
      data: {
        name,
        description,
        category,
        duration,
        thumbnail,
        config,
        isDefault,
        isActive,
      },
    });

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('更新视频模板失败:', error);
    res.status(500).json({ error: '更新视频模板失败' });
  }
};

/**
 * 删除视频模板
 * DELETE /api/generations/templates/:id
 */
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await prisma.videoTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: '模板不存在' });
    }

    await prisma.videoTemplate.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除视频模板失败:', error);
    res.status(500).json({ error: '删除视频模板失败' });
  }
};

/**
 * 下载生成视频
 * GET /api/generations/:id/download
 */
export const downloadGeneration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const generation = await prisma.videoGeneration.findUnique({
      where: { id },
    });

    if (!generation) {
      return res.status(404).json({ error: '生成任务不存在' });
    }

    if (generation.status !== 'completed') {
      return res.status(400).json({ error: '视频尚未生成完成' });
    }

    if (!generation.videoUrl) {
      return res.status(404).json({ error: '视频 URL 不存在' });
    }

    // 重定向到视频 URL
    res.redirect(generation.videoUrl);
  } catch (error) {
    console.error('下载视频失败:', error);
    res.status(500).json({ error: '下载视频失败' });
  }
};

/**
 * 重试生成任务
 * POST /api/generations/:id/retry
 */
export const retryGeneration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const generation = await prisma.videoGeneration.findUnique({
      where: { id },
    });

    if (!generation) {
      return res.status(404).json({ error: '生成任务不存在' });
    }

    if (generation.status === 'processing' || generation.status === 'pending') {
      return res.status(400).json({ error: '任务正在进行中，无法重试' });
    }

    const updated = await videoGenerationService.retryGeneration(id);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('重试生成任务失败:', error);
    res.status(500).json({ error: '重试生成任务失败' });
  }
};
