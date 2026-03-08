import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 创建分集
 * POST /api/projects/:projectId/episodes
 */
export const createEpisode = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { number, title, description, status } = req.body;

    // 验证必填字段
    if (!number || !title) {
      return res.status(400).json({ error: '集号和标题是必填字段' });
    }

    // 验证项目是否存在
    const project = await prisma.project.findUnique({
      where: { id: BigInt(projectId) },
    });

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 检查集号是否已存在
    const existingEpisode = await prisma.episodeV2.findUnique({
      where: {
        projectId_number: {
          projectId: BigInt(projectId),
          number,
        },
      },
    });

    if (existingEpisode) {
      return res.status(400).json({ error: '该集号已存在' });
    }

    const episode = await prisma.episodeV2.create({
      data: {
        projectId: BigInt(projectId),
        number,
        title,
        description,
        status: status || 'draft',
      },
    });

    res.status(201).json(episode);
  } catch (error) {
    console.error('创建分集失败:', error);
    res.status(500).json({ error: '创建分集失败' });
  }
};

/**
 * 获取分集列表
 * GET /api/projects/:projectId/episodes
 */
export const getEpisodes = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const episodes = await prisma.episodeV2.findMany({
      where: { projectId: BigInt(projectId) },
      include: {
        scenes: {
          orderBy: { number: 'asc' },
        },
      },
      orderBy: { number: 'asc' },
    });

    res.json(episodes);
  } catch (error) {
    console.error('获取分集列表失败:', error);
    res.status(500).json({ error: '获取分集列表失败' });
  }
};

/**
 * 获取分集详情
 * GET /api/episodes/:id
 */
export const getEpisode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const episode = await prisma.episodeV2.findUnique({
      where: { id: BigInt(id) },
      include: {
        scenes: {
          orderBy: { number: 'asc' },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!episode) {
      return res.status(404).json({ error: '分集不存在' });
    }

    res.json(episode);
  } catch (error) {
    console.error('获取分集详情失败:', error);
    res.status(500).json({ error: '获取分集详情失败' });
  }
};

/**
 * 更新分集
 * PUT /api/episodes/:id
 */
export const updateEpisode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { number, title, description, status } = req.body;

    const episode = await prisma.episodeV2.findUnique({
      where: { id: BigInt(id) },
    });

    if (!episode) {
      return res.status(404).json({ error: '分集不存在' });
    }

    // 如果修改了集号，检查是否冲突
    if (number !== undefined && number !== episode.number) {
      const existingEpisode = await prisma.episodeV2.findUnique({
        where: {
          projectId_number: {
            projectId: episode.projectId,
            number,
          },
        },
      });

      if (existingEpisode && existingEpisode.id !== BigInt(id)) {
        return res.status(400).json({ error: '该集号已存在' });
      }
    }

    const updatedEpisode = await prisma.episodeV2.update({
      where: { id: BigInt(id) },
      data: {
        number,
        title,
        description,
        status,
      },
    });

    res.json(updatedEpisode);
  } catch (error) {
    console.error('更新分集失败:', error);
    res.status(500).json({ error: '更新分集失败' });
  }
};

/**
 * 删除分集
 * DELETE /api/episodes/:id
 */
export const deleteEpisode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const episode = await prisma.episodeV2.findUnique({
      where: { id: BigInt(id) },
    });

    if (!episode) {
      return res.status(404).json({ error: '分集不存在' });
    }

    // 删除分集会自动删除关联的分镜（onDelete: Cascade）
    await prisma.episodeV2.delete({
      where: { id: BigInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error('删除分集失败:', error);
    res.status(500).json({ error: '删除分集失败' });
  }
};

/**
 * 分集排序
 * PUT /api/episodes/:id/reorder
 */
export const reorderEpisode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newNumber } = req.body;

    if (!newNumber || typeof newNumber !== 'number') {
      return res.status(400).json({ error: '新的集号无效' });
    }

    const episode = await prisma.episodeV2.findUnique({
      where: { id: BigInt(id) },
    });

    if (!episode) {
      return res.status(404).json({ error: '分集不存在' });
    }

    // 获取同一项目下的所有分集
    const allEpisodes = await prisma.episodeV2.findMany({
      where: { projectId: episode.projectId },
      orderBy: { number: 'asc' },
    });

    // 检查新集号是否在有效范围内
    if (newNumber < 1 || newNumber > allEpisodes.length) {
      return res.status(400).json({ error: '新的集号超出范围' });
    }

    // 重新排序
    const updatedNumbers = allEpisodes
      .filter((ep) => ep.id !== BigInt(id))
      .map((ep) => ep.number);

    updatedNumbers.splice(newNumber - 1, 0, episode.number);

    // 批量更新所有分集的集号
    const updatePromises = allEpisodes.map((ep, index) => {
      const newNum = ep.id === BigInt(id) ? newNumber : updatedNumbers[index];
      return prisma.episodeV2.update({
        where: { id: ep.id },
        data: { number: newNum },
      });
    });

    await Promise.all(updatePromises);

    const updatedEpisode = await prisma.episodeV2.findUnique({
      where: { id: BigInt(id) },
    });

    res.json(updatedEpisode);
  } catch (error) {
    console.error('分集排序失败:', error);
    res.status(500).json({ error: '分集排序失败' });
  }
};
