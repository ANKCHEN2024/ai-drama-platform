import { Request, Response } from 'express';
import { queues, getQueueStats, getAllQueues } from '../queues';
import { storyQueue, StoryJobData } from '../queues/storyQueue';
import { characterQueue, CharacterJobData } from '../queues/characterQueue';
import { sceneQueue, SceneJobData } from '../queues/sceneQueue';
import { videoQueue, VideoJobData } from '../queues/videoQueue';
import { audioQueue, AudioJobData } from '../queues/audioQueue';
import { createTask, getTask, getTasksByProject, cancelTask } from '../services/taskService';
import { successResponse, errorResponse } from '../utils/response';

export const getQueuesStats = async (req: Request, res: Response) => {
  try {
    const stats = await getQueueStats();
    res.json(successResponse(stats));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get queue stats';
    res.status(500).json(errorResponse(500, errorMessage));
  }
};

export const addStoryJob = async (req: Request, res: Response) => {
  try {
    const { projectId, userId, novelText, options } = req.body;

    const task = await createTask({
      projectId,
      userId,
      taskType: 'story_analyze',
    });

    const jobData: StoryJobData = {
      projectId,
      userId,
      novelText,
      options,
    };

    const job = await storyQueue.add(jobData, {
      jobId: task.id.toString(),
    });

    res.json(successResponse({
      taskId: task.id,
      jobId: job.id,
      message: 'Story analysis job added',
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add story job';
    res.status(500).json(errorResponse(500, errorMessage));
  }
};

export const addCharacterJob = async (req: Request, res: Response) => {
  try {
    const { projectId, userId, characterId, options } = req.body;

    const task = await createTask({
      projectId,
      userId,
      taskType: 'character_generate',
      characterId,
    });

    const jobData: CharacterJobData = {
      projectId,
      userId,
      characterId,
      options,
    };

    const job = await characterQueue.add(jobData, {
      jobId: task.id.toString(),
    });

    res.json(successResponse({
      taskId: task.id,
      jobId: job.id,
      message: 'Character generation job added',
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add character job';
    res.status(500).json(errorResponse(500, errorMessage));
  }
};

export const addSceneJob = async (req: Request, res: Response) => {
  try {
    const { projectId, userId, sceneId, options } = req.body;

    const task = await createTask({
      projectId,
      userId,
      taskType: 'scene_generate',
      sceneId,
    });

    const jobData: SceneJobData = {
      projectId,
      userId,
      sceneId,
      options,
    };

    const job = await sceneQueue.add(jobData, {
      jobId: task.id.toString(),
    });

    res.json(successResponse({
      taskId: task.id,
      jobId: job.id,
      message: 'Scene generation job added',
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add scene job';
    res.status(500).json(errorResponse(500, errorMessage));
  }
};

export const addVideoJob = async (req: Request, res: Response) => {
  try {
    const { projectId, userId, episodeId, storyboardIds, options } = req.body;

    const task = await createTask({
      projectId,
      userId,
      taskType: 'video_generate',
      episodeId,
    });

    const jobData: VideoJobData = {
      projectId,
      userId,
      episodeId,
      storyboardIds,
      options,
    };

    const job = await videoQueue.add(jobData, {
      jobId: task.id.toString(),
    });

    res.json(successResponse({
      taskId: task.id,
      jobId: job.id,
      message: 'Video generation job added',
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add video job';
    res.status(500).json(errorResponse(500, errorMessage));
  }
};

export const addAudioJob = async (req: Request, res: Response) => {
  try {
    const { projectId, userId, episodeId, audioType, textContent, characterId, options } = req.body;

    const task = await createTask({
      projectId,
      userId,
      taskType: 'audio_synthesize',
      episodeId,
    });

    const jobData: AudioJobData = {
      projectId,
      userId,
      episodeId,
      audioType,
      textContent,
      characterId,
      options,
    };

    const job = await audioQueue.add(jobData, {
      jobId: task.id.toString(),
    });

    res.json(successResponse({
      taskId: task.id,
      jobId: job.id,
      message: 'Audio processing job added',
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add audio job';
    res.status(500).json(errorResponse(500, errorMessage));
  }
};

export const getTaskStatus = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = await getTask(taskId);
    
    if (!task) {
      return res.status(404).json(errorResponse(404, 'Task not found'));
    }
    
    res.json(successResponse(task));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get task status';
    res.status(500).json(errorResponse(500, errorMessage));
  }
};

export const getProjectTasks = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const tasks = await getTasksByProject(parseInt(projectId));
    res.json(successResponse(tasks));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get project tasks';
    res.status(500).json(errorResponse(500, errorMessage));
  }
};

export const cancelTaskHandler = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const allQueues = getAllQueues();
    for (const queue of allQueues) {
      const job = await queue.getJob(taskId);
      if (job) {
        await job.remove();
        break;
      }
    }
    
    const task = await cancelTask(taskId);
    res.json(successResponse(task));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel task';
    res.status(500).json(errorResponse(500, errorMessage));
  }
};
