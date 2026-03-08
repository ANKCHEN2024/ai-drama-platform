import { Request, Response } from 'express';
import logger from '../utils/logger';
import { aiScriptService } from '../services/aiScript/aiScriptService';
import { aiVideoGenerationService } from '../services/aiVideo/aiVideoGenerationService';
import { videoGenerationQueue } from '../queues/videoGenerationQueue';
import { prisma } from '../config/database';

export class AIGenerationController {
  /**
   * 生成剧本（同步）
   * POST /api/ai/generate/script
   */
  async generateScript(req: Request, res: Response) {
    try {
      const {
        projectId,
        episodeNumber,
        seasonNumber,
        genre,
        tone,
        keywords,
        previousEpisodeSummary,
        customRequirements,
      } = req.body;

      // 参数验证
      if (!projectId || !episodeNumber) {
        return res.status(400).json({
          success: false,
          error: 'projectId 和 episodeNumber 是必填项',
        });
      }

      logger.info('Script generation request', { projectId, episodeNumber });

      // 调用服务
      const result = await aiScriptService.generateScript({
        projectId,
        episodeNumber,
        seasonNumber,
        genre,
        tone,
        keywords,
        previousEpisodeSummary,
        customRequirements,
      });

      if (result.success) {
        res.json({
          success: true,
          data: {
            episodeId: result.episodeId,
            title: result.title,
            summary: result.summary,
            script: result.script,
            characterAssignments: result.characterAssignments,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.errorMessage,
        });
      }
    } catch (error) {
      logger.error('Script generation controller error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * 生成分镜（同步）
   * POST /api/ai/generate/storyboard
   */
  async generateStoryboard(req: Request, res: Response) {
    try {
      const { episodeId } = req.body;

      if (!episodeId) {
        return res.status(400).json({
          success: false,
          error: 'episodeId 是必填项',
        });
      }

      logger.info('Storyboard generation request', { episodeId });

      const result = await aiScriptService.generateStoryboardsFromScript(episodeId);

      if (result.success) {
        res.json({
          success: true,
          data: {
            storyboardCount: result.storyboardCount,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.errorMessage,
        });
      }
    } catch (error) {
      logger.error('Storyboard generation controller error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * 生成视频（异步队列）
   * POST /api/ai/generate/video
   */
  async generateVideo(req: Request, res: Response) {
    try {
      const {
        sceneId,
        templateId,
        style,
        duration,
        resolution,
        customPrompt,
      } = req.body;

      if (!sceneId) {
        return res.status(400).json({
          success: false,
          error: 'sceneId 是必填项',
        });
      }

      logger.info('Video generation request', { sceneId });

      // 添加到队列
      const jobId = await videoGenerationQueue.addVideoGenerationJob(sceneId, {
        templateId,
        style,
        duration,
        resolution,
        customPrompt,
      });

      res.json({
        success: true,
        data: {
          jobId,
          status: 'queued',
          message: '视频生成任务已加入队列',
        },
      });
    } catch (error) {
      logger.error('Video generation controller error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * 批量生成视频（异步队列）
   * POST /api/ai/generate/video/batch
   */
  async generateVideoBatch(req: Request, res: Response) {
    try {
      const { episodeId, style, resolution } = req.body;

      if (!episodeId) {
        return res.status(400).json({
          success: false,
          error: 'episodeId 是必填项',
        });
      }

      logger.info('Batch video generation request', { episodeId });

      // 获取所有分镜
      const scenes = await prisma.sceneV2.findMany({
        where: {
          episodeId,
          status: {
            in: ['draft', 'approved'],
          },
        },
        orderBy: { number: 'asc' },
      });

      if (scenes.length === 0) {
        return res.status(400).json({
          success: false,
          error: '没有找到可用的分镜',
        });
      }

      // 为每个分镜创建视频生成任务
      const jobIds: string[] = [];
      for (const scene of scenes) {
        const jobId = await videoGenerationQueue.addVideoGenerationJob(scene.id, {
          style,
          resolution,
        });
        jobIds.push(jobId);
      }

      res.json({
        success: true,
        data: {
          jobIds,
          sceneCount: scenes.length,
          status: 'queued',
          message: `已创建${scenes.length}个视频生成任务`,
        },
      });
    } catch (error) {
      logger.error('Batch video generation controller error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * 合成视频（异步队列）
   * POST /api/ai/generate/compose
   */
  async composeVideo(req: Request, res: Response) {
    try {
      const {
        projectId,
        episodeId,
        bgmPath,
        transitionDuration,
      } = req.body;

      if (!projectId || !episodeId) {
        return res.status(400).json({
          success: false,
          error: 'projectId 和 episodeId 是必填项',
        });
      }

      logger.info('Video composition request', { projectId, episodeId });

      // 添加到队列
      const jobId = await videoGenerationQueue.addVideoCompositionJob(
        projectId,
        episodeId,
        {
          bgmPath,
          transitionDuration,
        }
      );

      res.json({
        success: true,
        data: {
          jobId,
          status: 'queued',
          message: '视频合成任务已加入队列',
        },
      });
    } catch (error) {
      logger.error('Video composition controller error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * 查询任务进度
   * GET /api/ai/task/:jobId/status
   */
  async getTaskStatus(req: Request, res: Response) {
    try {
      const { jobId } = req.params;

      logger.info('Task status query', { jobId });

      // 查询队列状态
      const jobStatus = await videoGenerationQueue.getJobStatus(jobId);

      if (!jobStatus) {
        // 尝试查询数据库中的视频生成记录
        const videoGen = await prisma.videoGeneration.findUnique({
          where: { id: jobId },
        });

        if (videoGen) {
          return res.json({
            success: true,
            data: {
              jobId,
              status: videoGen.status,
              progress: videoGen.progress,
              videoUrl: videoGen.videoUrl,
              thumbnailUrl: videoGen.thumbnailUrl,
              errorMessage: videoGen.errorMessage,
              createdAt: videoGen.createdAt,
              completedAt: videoGen.completedAt,
            },
          });
        }

        return res.status(404).json({
          success: false,
          error: '任务不存在',
        });
      }

      res.json({
        success: true,
        data: {
          jobId,
          status: jobStatus.status,
          progress: jobStatus.progress,
          data: jobStatus.data,
          failedReason: jobStatus.failedReason,
        },
      });
    } catch (error) {
      logger.error('Task status controller error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * 查询队列统计
   * GET /api/ai/queue/stats
   */
  async getQueueStats(req: Request, res: Response) {
    try {
      const stats = await videoGenerationQueue.getQueueStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Queue stats controller error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * 取消任务
   * POST /api/ai/task/:jobId/cancel
   */
  async cancelTask(req: Request, res: Response) {
    try {
      const { jobId } = req.params;

      logger.info('Task cancellation request', { jobId });

      // TODO: 实现任务取消逻辑
      // 这可能需要 BullMQ 的 job.remove() 或自定义的状态管理

      res.json({
        success: true,
        message: '任务取消请求已接收',
      });
    } catch (error) {
      logger.error('Task cancellation controller error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * 重试失败的任务
   * POST /api/ai/task/:jobId/retry
   */
  async retryTask(req: Request, res: Response) {
    try {
      const { jobId } = req.params;

      logger.info('Task retry request', { jobId });

      // TODO: 实现任务重试逻辑

      res.json({
        success: true,
        message: '任务重试请求已接收',
      });
    } catch (error) {
      logger.error('Task retry controller error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * 获取视频生成历史
   * GET /api/ai/video/history
   */
  async getVideoHistory(req: Request, res: Response) {
    try {
      const {
        projectId,
        episodeId,
        status,
        page = '1',
        limit = '20',
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const where: any = {};

      if (projectId) {
        where.scene = {
          episode: {
            projectId: parseInt(projectId as string),
          },
        };
      }

      if (episodeId) {
        where.scene = {
          episodeId: parseInt(episodeId as string),
        };
      }

      if (status) {
        where.status = status;
      }

      const [videoGenerations, total] = await Promise.all([
        prisma.videoGeneration.findMany({
          where,
          include: {
            scene: {
              include: {
                episode: {
                  include: {
                    project: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.videoGeneration.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          items: videoGenerations,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      logger.error('Video history controller error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
}

export const aiGenerationController = new AIGenerationController();
