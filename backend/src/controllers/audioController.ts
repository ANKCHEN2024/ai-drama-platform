import { Request, Response, Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { successResponse, errorResponse, createdResponse } from '../utils/response';
import { validateBody, validateParams } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimit';
import { AudioProcessor, AudioSynthesisInput, SubtitleInput } from '../services/audioProcessing';
import audioQueue from '../queues/audioQueue';
import { broadcastTaskProgress } from '../websocket';
import logger from '../utils/logger';

const synthesizeAudioSchema = z.object({
  projectId: z.string().refine((val) => !isNaN(parseInt(val)), '项目ID必须是有效的数字'),
  episodeId: z.string().refine((val) => !isNaN(parseInt(val)), '剧集ID必须是有效的数字'),
  text: z.string().min(1, '文本内容不能为空'),
  audioType: z.enum(['tts', 'bgm', 'asr']).default('tts'),
  characterId: z.string().refine((val) => !isNaN(parseInt(val)), '人物ID必须是有效的数字').optional(),
  options: z.object({
    voice: z.string().optional(),
    volume: z.number().int().min(0).max(100).optional(),
    speechRate: z.number().int().min(-500).max(500).optional(),
    pitchRate: z.number().int().min(-500).max(500).optional(),
    format: z.enum(['mp3', 'wav', 'pcm']).optional(),
  }).optional(),
});

const generateSubtitleSchema = z.object({
  projectId: z.string().refine((val) => !isNaN(parseInt(val)), '项目ID必须是有效的数字'),
  episodeId: z.string().refine((val) => !isNaN(parseInt(val)), '剧集ID必须是有效的数字'),
  segments: z.array(z.object({
    startTime: z.number().min(0),
    endTime: z.number().min(0),
    text: z.string().min(1),
  })),
  format: z.enum(['srt', 'vtt', 'ass']).optional().default('srt'),
});

const idParamsSchema = z.object({
  id: z.string().refine((val) => !isNaN(parseInt(val)), 'ID必须是有效的数字'),
});

const router = Router();

const audioProcessor = new AudioProcessor();

router.post('/synthesize', strictLimiter, validateBody(synthesizeAudioSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const data = (req as any).validatedBody;
    const projectId = BigInt(data.projectId);
    const episodeId = BigInt(data.episodeId);
    const characterId = data.characterId ? BigInt(data.characterId) : undefined;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project || project.userId !== BigInt(req.user.userId)) {
      return res.status(403).json(errorResponse(403, '无权访问该项目'));
    }

    const job = await audioQueue.add({
      projectId: Number(projectId),
      userId: Number(req.user.userId),
      episodeId: Number(episodeId),
      audioType: data.audioType,
      textContent: data.text,
      characterId: characterId ? Number(characterId) : undefined,
      options: data.options,
    });

    const task = await prisma.task.create({
      data: {
        userId: BigInt(req.user.userId),
        projectId,
        taskType: 'audio_synthesize',
        status: 'pending',
        progress: 0,
        message: '音频合成任务已创建',
        metadata: {
          jobId: job.id,
          episodeId: Number(episodeId),
          audioType: data.audioType,
          characterId: characterId ? Number(characterId) : undefined,
        },
      },
    });

    broadcastTaskProgress(Number(projectId), {
      taskId: task.id.toString(),
      taskType: 'audio_synthesize',
      progress: 0,
      status: 'pending',
      message: '音频合成任务已创建',
    });

    return res.status(201).json(createdResponse({
      taskId: task.id,
      jobId: job.id,
    }, '音频合成任务已提交'));
  } catch (error) {
    logger.error('合成音频错误:', error);
    return res.status(500).json(errorResponse(500, '合成音频失败'));
  }
});

router.post('/subtitle', strictLimiter, validateBody(generateSubtitleSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const data = (req as any).validatedBody;
    const projectId = BigInt(data.projectId);
    const episodeId = BigInt(data.episodeId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project || project.userId !== BigInt(req.user.userId)) {
      return res.status(403).json(errorResponse(403, '无权访问该项目'));
    }

    const subtitleInput: SubtitleInput = {
      segments: data.segments,
      format: data.format,
      metadata: {
        project_id: Number(projectId),
        episode_id: Number(episodeId),
      },
    };

    const result = await audioProcessor.generateSubtitle(subtitleInput);

    return res.status(201).json(createdResponse(result, '字幕生成成功'));
  } catch (error) {
    logger.error('生成字幕错误:', error);
    return res.status(500).json(errorResponse(500, '生成字幕失败'));
  }
});

router.get('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const audioId = BigInt(id);

    const audio = await prisma.audio.findUnique({
      where: { id: audioId },
      include: {
        episode: {
          include: {
            project: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!audio) {
      return res.status(404).json(errorResponse(404, '音频不存在'));
    }

    if (audio.episode.project.userId !== BigInt(req.user.userId)) {
      return res.status(403).json(errorResponse(403, '无权访问该音频'));
    }

    return res.json(successResponse(audio, '获取音频详情成功'));
  } catch (error) {
    logger.error('获取音频详情错误:', error);
    return res.status(500).json(errorResponse(500, '获取音频详情失败'));
  }
});

router.delete('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { id } = (req as any).validatedParams;
    const audioId = BigInt(id);

    const audio = await prisma.audio.findUnique({
      where: { id: audioId },
      include: {
        episode: {
          include: {
            project: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!audio) {
      return res.status(404).json(errorResponse(404, '音频不存在'));
    }

    if (audio.episode.project.userId !== BigInt(req.user.userId)) {
      return res.status(403).json(errorResponse(403, '无权删除该音频'));
    }

    await prisma.audio.delete({
      where: { id: audioId },
    });

    return res.json(successResponse(null, '删除音频成功'));
  } catch (error) {
    logger.error('删除音频错误:', error);
    return res.status(500).json(errorResponse(500, '删除音频失败'));
  }
});

router.post('/transcribe', strictLimiter, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    return res.status(200).json(successResponse({
      message: '语音识别功能开发中',
    }, '功能开发中'));
  } catch (error) {
    logger.error('语音识别错误:', error);
    return res.status(500).json(errorResponse(500, '语音识别失败'));
  }
});

export default router;
