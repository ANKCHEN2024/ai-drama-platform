import { Request, Response } from 'express';
import { PrismaClient, ProjectStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 项目控制器 - 项目管理核心功能
 */

// 项目列表查询参数接口
interface ProjectQueryParams {
  page?: string;
  limit?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  archived?: string;
}

/**
 * POST /api/projects
 * 创建项目
 */
export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权，请先登录' });
      return;
    }

    const {
      name,
      description,
      novelText,
      episodeCount = 10,
      episodeDuration = 60,
      videoRatio = '9:16',
      videoQuality = '1080p',
      status = 'draft',
      settings
    } = req.body;

    // 验证必填字段
    if (!name || name.trim() === '') {
      res.status(400).json({ error: '项目名称不能为空' });
      return;
    }

    // 创建项目
    const project = await prisma.project.create({
      data: {
        userId: BigInt(userId),
        name: name.trim(),
        description: description?.trim() || null,
        novelText: novelText?.trim() || null,
        episodeCount,
        episodeDuration,
        videoRatio,
        videoQuality,
        status: status as ProjectStatus,
        settings: settings || null
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        ...project,
        id: project.id.toString()
      }
    });
  } catch (error: any) {
    console.error('创建项目失败:', error);
    res.status(500).json({ error: '创建项目失败', details: error.message });
  }
};

/**
 * GET /api/projects
 * 获取项目列表（支持分页、筛选、排序）
 */
export const getProjectList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权，请先登录' });
      return;
    }

    const {
      page = '1',
      limit = '10',
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      archived
    } = req.query as ProjectQueryParams;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {
      userId: BigInt(userId)
    };

    // 筛选已归档/未归档
    if (archived === 'true') {
      where.archivedAt = { not: null };
    } else if (archived === 'false') {
      where.archivedAt = null;
    }

    // 状态筛选
    if (status && status !== 'all') {
      where.status = status;
    }

    // 搜索（名称或描述）
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim() } },
        { description: { contains: search.trim() } }
      ];
    }

    // 排序字段映射
    const sortFieldMap: { [key: string]: string } = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      name: 'name',
      status: 'status'
    };
    const sortField = sortFieldMap[sortBy] || 'createdAt';

    // 获取总数
    const total = await prisma.project.count({ where });

    // 获取项目列表
    const projects = await prisma.project.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        [sortField]: sortOrder
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        episodes: {
          select: {
            id: true,
            episodeNumber: true,
            status: true
          }
        },
        _count: {
          select: {
            episodes: true,
            characters: true,
            scenes: true
          }
        }
      }
    });

    // 计算项目统计信息
    const projectsWithStats = projects.map(project => ({
      ...project,
      id: project.id.toString(),
      user: {
        ...project.user,
        id: project.user.id.toString()
      },
      statistics: {
        episodeCount: project._count.episodes,
        characterCount: project._count.characters,
        sceneCount: project._count.scenes,
        totalDuration: project.episodes.reduce((sum, ep) => sum + (ep.status === 'completed' ? 1 : 0), 0)
      }
    }));

    res.json({
      success: true,
      data: {
        projects: projectsWithStats,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error: any) {
    console.error('获取项目列表失败:', error);
    res.status(500).json({ error: '获取项目列表失败', details: error.message });
  }
};

/**
 * GET /api/projects/:id
 * 获取项目详情
 */
export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权，请先登录' });
      return;
    }

    const projectId = req.params.id;
    if (!projectId) {
      res.status(400).json({ error: '项目 ID 不能为空' });
      return;
    }

    const project = await prisma.project.findFirst({
      where: {
        id: BigInt(projectId),
        userId: BigInt(userId)
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true
          }
        },
        episodes: {
          orderBy: { episodeNumber: 'asc' },
          include: {
            _count: {
              select: {
                storyboards: true,
                audios: true,
                videos: true
              }
            }
          }
        },
        characters: {
          include: {
            characterImages: true
          }
        },
        scenes: {
          include: {
            sceneImages: true
          }
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    res.json({
      success: true,
      data: {
        ...project,
        id: project.id.toString(),
        user: {
          ...project.user,
          id: project.user.id.toString()
        },
        episodes: project.episodes.map(ep => ({
          ...ep,
          id: ep.id.toString()
        })),
        characters: project.characters.map(char => ({
          ...char,
          id: char.id.toString(),
          characterImages: char.characterImages.map(img => ({
            ...img,
            id: img.id.toString()
          }))
        })),
        scenes: project.scenes.map(scene => ({
          ...scene,
          id: scene.id.toString(),
          sceneImages: scene.sceneImages.map(img => ({
            ...img,
            id: img.id.toString()
          }))
        })),
        tasks: project.tasks.map(task => ({
          ...task,
          id: task.id.toString()
        }))
      }
    });
  } catch (error: any) {
    console.error('获取项目详情失败:', error);
    res.status(500).json({ error: '获取项目详情失败', details: error.message });
  }
};

/**
 * PUT /api/projects/:id
 * 更新项目
 */
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权，请先登录' });
      return;
    }

    const projectId = req.params.id;
    if (!projectId) {
      res.status(400).json({ error: '项目 ID 不能为空' });
      return;
    }

    const {
      name,
      description,
      novelText,
      episodeCount,
      episodeDuration,
      videoRatio,
      videoQuality,
      status,
      settings
    } = req.body;

    // 检查项目是否存在且属于当前用户
    const existingProject = await prisma.project.findFirst({
      where: {
        id: BigInt(projectId),
        userId: BigInt(userId)
      }
    });

    if (!existingProject) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    // 如果项目已归档，不允许更新（除非是取消归档）
    if (existingProject.archivedAt && !req.body.unarchive) {
      res.status(400).json({ error: '已归档的项目不能修改' });
      return;
    }

    // 构建更新数据
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (novelText !== undefined) updateData.novelText = novelText?.trim() || null;
    if (episodeCount !== undefined) updateData.episodeCount = episodeCount;
    if (episodeDuration !== undefined) updateData.episodeDuration = episodeDuration;
    if (videoRatio !== undefined) updateData.videoRatio = videoRatio;
    if (videoQuality !== undefined) updateData.videoQuality = videoQuality;
    if (status !== undefined) updateData.status = status as ProjectStatus;
    if (settings !== undefined) updateData.settings = settings;
    if (req.body.unarchive) updateData.archivedAt = null;

    const project = await prisma.project.update({
      where: {
        id: BigInt(projectId)
      },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        ...project,
        id: project.id.toString()
      }
    });
  } catch (error: any) {
    console.error('更新项目失败:', error);
    res.status(500).json({ error: '更新项目失败', details: error.message });
  }
};

/**
 * DELETE /api/projects/:id
 * 删除项目
 */
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权，请先登录' });
      return;
    }

    const projectId = req.params.id;
    if (!projectId) {
      res.status(400).json({ error: '项目 ID 不能为空' });
      return;
    }

    // 检查项目是否存在且属于当前用户
    const project = await prisma.project.findFirst({
      where: {
        id: BigInt(projectId),
        userId: BigInt(userId)
      }
    });

    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    // 删除项目（Prisma 会级联删除关联数据）
    await prisma.project.delete({
      where: {
        id: BigInt(projectId)
      }
    });

    res.json({
      success: true,
      message: '项目已删除'
    });
  } catch (error: any) {
    console.error('删除项目失败:', error);
    res.status(500).json({ error: '删除项目失败', details: error.message });
  }
};

/**
 * POST /api/projects/:id/archive
 * 归档项目
 */
export const archiveProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权，请先登录' });
      return;
    }

    const projectId = req.params.id;
    if (!projectId) {
      res.status(400).json({ error: '项目 ID 不能为空' });
      return;
    }

    const { unarchive } = req.body;

    // 检查项目是否存在且属于当前用户
    const existingProject = await prisma.project.findFirst({
      where: {
        id: BigInt(projectId),
        userId: BigInt(userId)
      }
    });

    if (!existingProject) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    // 归档或取消归档
    const project = await prisma.project.update({
      where: {
        id: BigInt(projectId)
      },
      data: {
        archivedAt: unarchive ? null : new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: unarchive ? '项目已取消归档' : '项目已归档',
      data: {
        ...project,
        id: project.id.toString()
      }
    });
  } catch (error: any) {
    console.error('归档项目失败:', error);
    res.status(500).json({ error: '归档项目失败', details: error.message });
  }
};

/**
 * GET /api/projects/:id/statistics
 * 获取项目统计信息
 */
export const getProjectStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权，请先登录' });
      return;
    }

    const projectId = req.params.id;
    if (!projectId) {
      res.status(400).json({ error: '项目 ID 不能为空' });
      return;
    }

    // 获取项目基本信息
    const project = await prisma.project.findFirst({
      where: {
        id: BigInt(projectId),
        userId: BigInt(userId)
      }
    });

    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    // 获取剧集统计
    const episodeStats = await prisma.episode.groupBy({
      by: ['status'],
      where: { projectId: BigInt(projectId) },
      _count: true
    });

    // 获取角色统计
    const characterStats = await prisma.character.groupBy({
      by: ['status'],
      where: { projectId: BigInt(projectId) },
      _count: true
    });

    // 获取场景统计
    const sceneStats = await prisma.scene.groupBy({
      by: ['status'],
      where: { projectId: BigInt(projectId) },
      _count: true
    });

    // 获取分镜统计
    const storyboardStats = await prisma.storyboard.groupBy({
      by: ['status'],
      where: {
        episode: {
          projectId: BigInt(projectId)
        }
      },
      _count: true
    });

    // 获取视频片段统计
    const videoClipStats = await prisma.videoClip.groupBy({
      by: ['status'],
      where: {
        storyboard: {
          episode: {
            projectId: BigInt(projectId)
          }
        }
      },
      _count: true
    });

    // 获取音频统计
    const audioStats = await prisma.audio.groupBy({
      by: ['status'],
      where: {
        episode: {
          projectId: BigInt(projectId)
        }
      },
      _count: true
    });

    // 获取最终视频统计
    const videoStats = await prisma.video.groupBy({
      by: ['status'],
      where: {
        episode: {
          projectId: BigInt(projectId)
        }
      },
      _count: true
    });

    // 获取任务统计
    const taskStats = await prisma.task.groupBy({
      by: ['status'],
      where: { projectId: BigInt(projectId) },
      _count: true
    });

    // 计算总时长
    const episodesWithDuration = await prisma.episode.findMany({
      where: {
        projectId: BigInt(projectId),
        duration: { not: null }
      },
      select: {
        duration: true
      }
    });
    const totalDuration = episodesWithDuration.reduce((sum, ep) => sum + (ep.duration || 0), 0);

    // 计算最后更新时间
    const latestUpdate = await prisma.episode.findFirst({
      where: { projectId: BigInt(projectId) },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true }
    });

    res.json({
      success: true,
      data: {
        projectId: project.id.toString(),
        projectName: project.name,
        basics: {
          totalEpisodes: project.episodeCount,
          episodeDuration: project.episodeDuration,
          videoRatio: project.videoRatio,
          videoQuality: project.videoQuality,
          status: project.status,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          archivedAt: project.archivedAt
        },
        episodes: {
          total: episodeStats.reduce((sum, stat) => sum + stat._count, 0),
          byStatus: episodeStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count;
            return acc;
          }, {} as any)
        },
        characters: {
          total: characterStats.reduce((sum, stat) => sum + stat._count, 0),
          byStatus: characterStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count;
            return acc;
          }, {} as any)
        },
        scenes: {
          total: sceneStats.reduce((sum, stat) => sum + stat._count, 0),
          byStatus: sceneStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count;
            return acc;
          }, {} as any)
        },
        storyboards: {
          total: storyboardStats.reduce((sum, stat) => sum + stat._count, 0),
          byStatus: storyboardStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count;
            return acc;
          }, {} as any)
        },
        videoClips: {
          total: videoClipStats.reduce((sum, stat) => sum + stat._count, 0),
          byStatus: videoClipStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count;
            return acc;
          }, {} as any)
        },
        audios: {
          total: audioStats.reduce((sum, stat) => sum + stat._count, 0),
          byStatus: audioStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count;
            return acc;
          }, {} as any)
        },
        videos: {
          total: videoStats.reduce((sum, stat) => sum + stat._count, 0),
          byStatus: videoStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count;
            return acc;
          }, {} as any)
        },
        tasks: {
          total: taskStats.reduce((sum, stat) => sum + stat._count, 0),
          byStatus: taskStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count;
            return acc;
          }, {} as any)
        },
        duration: {
          totalSeconds: totalDuration,
          totalMinutes: Math.round(totalDuration / 60),
          formatted: formatDuration(totalDuration)
        },
        lastUpdatedAt: latestUpdate?.updatedAt || project.updatedAt
      }
    });
  } catch (error: any) {
    console.error('获取项目统计失败:', error);
    res.status(500).json({ error: '获取项目统计失败', details: error.message });
  }
};

/**
 * POST /api/projects/:id/duplicate
 * 复制项目
 */
export const duplicateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权，请先登录' });
      return;
    }

    const projectId = req.params.id;
    if (!projectId) {
      res.status(400).json({ error: '项目 ID 不能为空' });
      return;
    }

    const { name: newName } = req.body;

    // 获取原项目
    const originalProject = await prisma.project.findFirst({
      where: {
        id: BigInt(projectId),
        userId: BigInt(userId)
      },
      include: {
        episodes: {
          orderBy: { episodeNumber: 'asc' },
          include: {
            storyboards: {
              orderBy: { shotNumber: 'asc' }
            },
            audios: true,
            bgms: true,
            videos: true
          }
        },
        characters: {
          include: {
            characterImages: true
          }
        },
        scenes: {
          include: {
            sceneImages: true
          }
        }
      }
    });

    if (!originalProject) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    // 创建新项目（使用事务）
    const duplicatedProject = await prisma.$transaction(async (tx) => {
      // 创建项目副本
      const newProject = await tx.project.create({
        data: {
          userId: BigInt(userId),
          name: newName || `${originalProject.name} (副本)`,
          description: originalProject.description,
          novelText: originalProject.novelText,
          episodeCount: originalProject.episodeCount,
          episodeDuration: originalProject.episodeDuration,
          videoRatio: originalProject.videoRatio,
          videoQuality: originalProject.videoQuality,
          status: 'draft',
          settings: originalProject.settings
        }
      });

      // 复制剧集
      for (const episode of originalProject.episodes) {
        await tx.episode.create({
          data: {
            projectId: newProject.id,
            episodeNumber: episode.episodeNumber,
            title: episode.title,
            summary: episode.summary,
            script: episode.script,
            status: 'draft',
            duration: episode.duration
          }
        });
      }

      // 复制角色
      for (const character of originalProject.characters) {
        await tx.character.create({
          data: {
            projectId: newProject.id,
            name: character.name,
            description: character.description,
            appearance: character.appearance,
            gender: character.gender,
            ageRange: character.ageRange,
            personality: character.personality,
            status: character.status
          }
        });
      }

      // 复制场景
      for (const scene of originalProject.scenes) {
        await tx.scene.create({
          data: {
            projectId: newProject.id,
            name: scene.name,
            description: scene.description,
            locationType: scene.locationType,
            timeOfDay: scene.timeOfDay,
            atmosphere: scene.atmosphere,
            visualStyle: scene.visualStyle,
            status: scene.status
          }
        });
      }

      return newProject;
    });

    res.status(201).json({
      success: true,
      message: '项目已复制',
      data: {
        ...duplicatedProject,
        id: duplicatedProject.id.toString()
      }
    });
  } catch (error: any) {
    console.error('复制项目失败:', error);
    res.status(500).json({ error: '复制项目失败', details: error.message });
  }
};

/**
 * 辅助函数：格式化时长
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}
