import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 创建分镜
 * POST /api/episodes/:episodeId/scenes
 */
export const createScene = async (req: Request, res: Response) => {
  try {
    const { episodeId } = req.params;
    const { number, location, timeOfDay, content, dialogue, duration, status } = req.body;

    // 验证必填字段
    if (!number || !location || !timeOfDay || !content) {
      return res.status(400).json({ error: '场号、场景、时间和内容是必填字段' });
    }

    // 验证分集是否存在
    const episode = await prisma.episodeV2.findUnique({
      where: { id: BigInt(episodeId) },
    });

    if (!episode) {
      return res.status(404).json({ error: '分集不存在' });
    }

    // 检查场号是否已存在
    const existingScene = await prisma.sceneV2.findUnique({
      where: {
        episodeId_number: {
          episodeId: BigInt(episodeId),
          number,
        },
      },
    });

    if (existingScene) {
      return res.status(400).json({ error: '该场号已存在' });
    }

    const scene = await prisma.sceneV2.create({
      data: {
        episodeId: BigInt(episodeId),
        number,
        location,
        timeOfDay,
        content,
        dialogue,
        duration,
        status: status || 'draft',
      },
    });

    res.status(201).json(scene);
  } catch (error) {
    console.error('创建分镜失败:', error);
    res.status(500).json({ error: '创建分镜失败' });
  }
};

/**
 * 获取分镜列表
 * GET /api/episodes/:episodeId/scenes
 */
export const getScenes = async (req: Request, res: Response) => {
  try {
    const { episodeId } = req.params;

    const scenes = await prisma.sceneV2.findMany({
      where: { episodeId: BigInt(episodeId) },
      orderBy: { number: 'asc' },
    });

    res.json(scenes);
  } catch (error) {
    console.error('获取分镜列表失败:', error);
    res.status(500).json({ error: '获取分镜列表失败' });
  }
};

/**
 * 获取分镜详情
 * GET /api/scenes/:id
 */
export const getScene = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const scene = await prisma.sceneV2.findUnique({
      where: { id: BigInt(id) },
      include: {
        episode: {
          select: {
            id: true,
            title: true,
            number: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!scene) {
      return res.status(404).json({ error: '分镜不存在' });
    }

    res.json(scene);
  } catch (error) {
    console.error('获取分镜详情失败:', error);
    res.status(500).json({ error: '获取分镜详情失败' });
  }
};

/**
 * 更新分镜
 * PUT /api/scenes/:id
 */
export const updateScene = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { number, location, timeOfDay, content, dialogue, duration, status } = req.body;

    const scene = await prisma.sceneV2.findUnique({
      where: { id: BigInt(id) },
    });

    if (!scene) {
      return res.status(404).json({ error: '分镜不存在' });
    }

    // 如果修改了场号，检查是否冲突
    if (number !== undefined && number !== scene.number) {
      const existingScene = await prisma.sceneV2.findUnique({
        where: {
          episodeId_number: {
            episodeId: scene.episodeId,
            number,
          },
        },
      });

      if (existingScene && existingScene.id !== BigInt(id)) {
        return res.status(400).json({ error: '该场号已存在' });
      }
    }

    const updatedScene = await prisma.sceneV2.update({
      where: { id: BigInt(id) },
      data: {
        number,
        location,
        timeOfDay,
        content,
        dialogue,
        duration,
        status,
      },
    });

    res.json(updatedScene);
  } catch (error) {
    console.error('更新分镜失败:', error);
    res.status(500).json({ error: '更新分镜失败' });
  }
};

/**
 * 删除分镜
 * DELETE /api/scenes/:id
 */
export const deleteScene = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const scene = await prisma.sceneV2.findUnique({
      where: { id: BigInt(id) },
    });

    if (!scene) {
      return res.status(404).json({ error: '分镜不存在' });
    }

    await prisma.sceneV2.delete({
      where: { id: BigInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error('删除分镜失败:', error);
    res.status(500).json({ error: '删除分镜失败' });
  }
};

/**
 * 分镜排序
 * PUT /api/scenes/:id/reorder
 */
export const reorderScene = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newNumber } = req.body;

    if (!newNumber || typeof newNumber !== 'number') {
      return res.status(400).json({ error: '新的场号无效' });
    }

    const scene = await prisma.sceneV2.findUnique({
      where: { id: BigInt(id) },
    });

    if (!scene) {
      return res.status(404).json({ error: '分镜不存在' });
    }

    // 获取同一分集下的所有分镜
    const allScenes = await prisma.sceneV2.findMany({
      where: { episodeId: scene.episodeId },
      orderBy: { number: 'asc' },
    });

    // 检查新场号是否在有效范围内
    if (newNumber < 1 || newNumber > allScenes.length) {
      return res.status(400).json({ error: '新的场号超出范围' });
    }

    // 重新排序
    const updatedNumbers = allScenes
      .filter((s) => s.id !== BigInt(id))
      .map((s) => s.number);

    updatedNumbers.splice(newNumber - 1, 0, scene.number);

    // 批量更新所有分镜的场号
    const updatePromises = allScenes.map((s, index) => {
      const newNum = s.id === BigInt(id) ? newNumber : updatedNumbers[index];
      return prisma.sceneV2.update({
        where: { id: s.id },
        data: { number: newNum },
      });
    });

    await Promise.all(updatePromises);

    const updatedScene = await prisma.sceneV2.findUnique({
      where: { id: BigInt(id) },
    });

    res.json(updatedScene);
  } catch (error) {
    console.error('分镜排序失败:', error);
    res.status(500).json({ error: '分镜排序失败' });
  }
};
