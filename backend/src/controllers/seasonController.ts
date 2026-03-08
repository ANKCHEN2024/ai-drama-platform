import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 创建分季
 * POST /api/projects/:projectId/seasons
 */
export const createSeason = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { number, title, description } = req.body;

    // 验证必填字段
    if (!number || !title) {
      return res.status(400).json({ error: '季号和标题是必填字段' });
    }

    // 验证项目是否存在
    const project = await prisma.project.findUnique({
      where: { id: BigInt(projectId) },
    });

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 检查季号是否已存在
    const existingSeason = await prisma.season.findUnique({
      where: {
        projectId_number: {
          projectId: BigInt(projectId),
          number,
        },
      },
    });

    if (existingSeason) {
      return res.status(400).json({ error: '该季号已存在' });
    }

    const season = await prisma.season.create({
      data: {
        projectId: BigInt(projectId),
        number,
        title,
        description,
      },
    });

    res.status(201).json(season);
  } catch (error) {
    console.error('创建分季失败:', error);
    res.status(500).json({ error: '创建分季失败' });
  }
};

/**
 * 获取分季列表
 * GET /api/projects/:projectId/seasons
 */
export const getSeasons = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const seasons = await prisma.season.findMany({
      where: { projectId: BigInt(projectId) },
      include: {
        episodes: {
          orderBy: { number: 'asc' },
        },
      },
      orderBy: { number: 'asc' },
    });

    res.json(seasons);
  } catch (error) {
    console.error('获取分季列表失败:', error);
    res.status(500).json({ error: '获取分季列表失败' });
  }
};

/**
 * 获取分季详情
 * GET /api/seasons/:id
 */
export const getSeasonById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const season = await prisma.season.findUnique({
      where: { id: BigInt(id) },
      include: {
        episodes: {
          orderBy: { number: 'asc' },
          include: {
            scenes: {
              orderBy: { number: 'asc' },
            },
          },
        },
      },
    });

    if (!season) {
      return res.status(404).json({ error: '分季不存在' });
    }

    res.json(season);
  } catch (error) {
    console.error('获取分季详情失败:', error);
    res.status(500).json({ error: '获取分季详情失败' });
  }
};

/**
 * 更新分季
 * PUT /api/seasons/:id
 */
export const updateSeason = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { number, title, description } = req.body;

    // 验证分季是否存在
    const existingSeason = await prisma.season.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existingSeason) {
      return res.status(404).json({ error: '分季不存在' });
    }

    // 如果修改了季号，检查是否冲突
    if (number !== undefined && number !== existingSeason.number) {
      const conflict = await prisma.season.findUnique({
        where: {
          projectId_number: {
            projectId: existingSeason.projectId,
            number,
          },
        },
      });

      if (conflict) {
        return res.status(400).json({ error: '该季号已存在' });
      }
    }

    const season = await prisma.season.update({
      where: { id: BigInt(id) },
      data: {
        number,
        title,
        description,
      },
    });

    res.json(season);
  } catch (error) {
    console.error('更新分季失败:', error);
    res.status(500).json({ error: '更新分季失败' });
  }
};

/**
 * 删除分季
 * DELETE /api/seasons/:id
 */
export const deleteSeason = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const season = await prisma.season.findUnique({
      where: { id: BigInt(id) },
    });

    if (!season) {
      return res.status(404).json({ error: '分季不存在' });
    }

    await prisma.season.delete({
      where: { id: BigInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error('删除分季失败:', error);
    res.status(500).json({ error: '删除分季失败' });
  }
};
