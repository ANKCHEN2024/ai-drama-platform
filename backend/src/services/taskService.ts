import { PrismaClient, TaskType } from '@prisma/client';
import redis from '../config/redis';
import { TaskProgress, TaskMetadata } from '../queues';
import { broadcastTaskProgress } from '../websocket';

const prisma = new PrismaClient();

const TASK_CACHE_PREFIX = 'task:';
const TASK_CACHE_TTL = 3600;

// Safe redis helpers
const safeSetex = async (key: string, ttl: number, value: string) => {
  if (redis) {
    try {
      await redis.setex(key, ttl, value);
    } catch (err) {
      console.warn('Redis setex error:', err);
    }
  }
};

const safeGet = async (key: string): Promise<string | null> => {
  if (redis) {
    try {
      return await redis.get(key);
    } catch (err) {
      console.warn('Redis get error:', err);
    }
  }
  return null;
};

const mapTaskType = (taskType: string): TaskType => {
  const typeMap: Record<string, TaskType> = {
    'story_analyze': TaskType.story_analyze,
    'character_generate': TaskType.character_generate,
    'scene_generate': TaskType.scene_generate,
    'storyboard_generate': TaskType.storyboard_generate,
    'video_generate': TaskType.video_generate,
    'audio_synthesize': TaskType.audio_synthesize,
    'bgm_generate': TaskType.bgm_generate,
    'video_compose': TaskType.video_compose,
  };
  return typeMap[taskType] || TaskType.story_analyze;
};

export const createTask = async (metadata: TaskMetadata) => {
  const task = await prisma.task.create({
    data: {
      userId: metadata.userId || 0,
      projectId: metadata.projectId,
      taskType: mapTaskType(metadata.taskType),
      status: 'pending',
      progress: 0,
      message: '任务已创建，等待处理...',
      metadata: metadata,
    },
  });

  await safeSetex(
    `${TASK_CACHE_PREFIX}${task.id}`,
    TASK_CACHE_TTL,
    JSON.stringify({
      id: task.id,
      status: task.status,
      progress: task.progress,
      message: task.message,
      metadata: metadata,
    })
  );

  return task;
};

export const getTask = async (taskId: string) => {
  const cached = await safeGet(`${TASK_CACHE_PREFIX}${taskId}`);
  if (cached) {
    return JSON.parse(cached);
  }

  const task = await prisma.task.findUnique({
    where: { id: parseInt(taskId) },
  });

  if (task) {
    await safeSetex(
      `${TASK_CACHE_PREFIX}${taskId}`,
      TASK_CACHE_TTL,
      JSON.stringify({
        id: task.id,
        status: task.status,
        progress: task.progress,
        message: task.message,
        metadata: task.metadata,
      })
    );
  }

  return task;
};

export const updateTaskProgress = async (
  taskId: string,
  progress: TaskProgress
) => {
  let task;
  try {
    task = await prisma.task.update({
      where: { id: parseInt(taskId) },
      data: {
        status: progress.status,
        progress: progress.progress,
        message: progress.message,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.warn(`Task ${taskId} not found in database, only updating cache`);
  }

  const cachedTask = {
    id: taskId,
    status: progress.status,
    progress: progress.progress,
    message: progress.message,
    updatedAt: new Date().toISOString(),
  };

  await safeSetex(
    `${TASK_CACHE_PREFIX}${taskId}`,
    TASK_CACHE_TTL,
    JSON.stringify(cachedTask)
  );

  if (task && task.projectId) {
    await broadcastTaskProgress(Number(task.projectId), {
      taskId,
      taskType: task.taskType,
      ...progress,
    });
  }

  return cachedTask;
};

export const markTaskComplete = async (
  taskId: string,
  result: Record<string, any>
) => {
  let task;
  try {
    task = await prisma.task.update({
      where: { id: parseInt(taskId) },
      data: {
        status: 'completed',
        progress: 100,
        message: '任务完成',
        completedAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          result,
        },
      },
    });
  } catch (error) {
    console.warn(`Task ${taskId} not found in database`);
  }

  const cachedTask = {
    id: taskId,
    status: 'completed' as const,
    progress: 100,
    message: '任务完成',
    result,
    updatedAt: new Date().toISOString(),
  };

  await safeSetex(
    `${TASK_CACHE_PREFIX}${taskId}`,
    TASK_CACHE_TTL * 24,
    JSON.stringify(cachedTask)
  );

  if (task && task.projectId) {
    await broadcastTaskProgress(Number(task.projectId), {
      taskId,
      taskType: task.taskType,
      ...cachedTask,
    });
  }

  return cachedTask;
};

export const markTaskFailed = async (
  taskId: string,
  errorMessage: string
) => {
  let task;
  try {
    task = await prisma.task.update({
      where: { id: parseInt(taskId) },
      data: {
        status: 'failed',
        message: errorMessage,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.warn(`Task ${taskId} not found in database`);
  }

  const cachedTask = {
    id: taskId,
    status: 'failed' as const,
    progress: 0,
    message: errorMessage,
    updatedAt: new Date().toISOString(),
  };

  await safeSetex(
    `${TASK_CACHE_PREFIX}${taskId}`,
    TASK_CACHE_TTL * 24,
    JSON.stringify(cachedTask)
  );

  if (task && task.projectId) {
    await broadcastTaskProgress(Number(task.projectId), {
      taskId,
      taskType: task.taskType,
      ...cachedTask,
    });
  }

  return cachedTask;
};

export const cancelTask = async (taskId: string) => {
  let task;
  try {
    task = await prisma.task.update({
      where: { id: parseInt(taskId) },
      data: {
        status: 'cancelled',
        message: '任务已取消',
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.warn(`Task ${taskId} not found in database`);
  }

  const cachedTask = {
    id: taskId,
    status: 'cancelled' as const,
    progress: 0,
    message: '任务已取消',
    updatedAt: new Date().toISOString(),
  };

  await safeSetex(
    `${TASK_CACHE_PREFIX}${taskId}`,
    TASK_CACHE_TTL,
    JSON.stringify(cachedTask)
  );

  return cachedTask;
};

export const getTasksByProject = async (projectId: number) => {
  return prisma.task.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getTasksByUser = async (userId: number) => {
  return prisma.task.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};
