import express from 'express';
import {
  getQueuesStats,
  addStoryJob,
  addCharacterJob,
  addSceneJob,
  addVideoJob,
  addAudioJob,
  getTaskStatus,
  getProjectTasks,
  cancelTaskHandler,
} from '../controllers/queueController';

const router = express.Router();

router.get('/stats', getQueuesStats);

router.post('/story', addStoryJob);
router.post('/character', addCharacterJob);
router.post('/scene', addSceneJob);
router.post('/video', addVideoJob);
router.post('/audio', addAudioJob);

router.get('/tasks/:taskId', getTaskStatus);
router.get('/projects/:projectId/tasks', getProjectTasks);
router.delete('/tasks/:taskId', cancelTaskHandler);

export default router;
