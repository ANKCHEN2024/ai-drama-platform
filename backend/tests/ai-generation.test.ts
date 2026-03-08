import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/database';

describe('AI Generation API', () => {
  let authToken: string;
  let testProjectId: number;
  let testEpisodeId: number;
  let testSceneId: number;

  beforeAll(async () => {
    // 获取测试用的认证 token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword',
      });

    authToken = loginResponse.body.data.token;

    // 创建测试项目
    const project = await prisma.project.create({
      data: {
        name: '测试项目 - AI 生成',
        description: '用于测试 AI 生成功能',
        episodeCount: 10,
        episodeDuration: 60,
        videoRatio: '9:16',
        status: 'active',
      },
    });
    testProjectId = project.id;
  });

  afterAll(async () => {
    // 清理测试数据
    if (testProjectId) {
      await prisma.project.delete({
        where: { id: testProjectId },
      });
    }
  });

  describe('POST /api/ai/generate/script', () => {
    it('应该成功生成剧本', async () => {
      const response = await request(app)
        .post('/api/ai/generate/script')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId,
          episodeNumber: 1,
          genre: '都市情感',
          tone: '轻松幽默',
          keywords: ['爱情', '职场', '成长'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('episodeId');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('script');

      testEpisodeId = response.body.data.episodeId;
    });

    it('应该拒绝缺少必填参数的请求', async () => {
      const response = await request(app)
        .post('/api/ai/generate/script')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          episodeNumber: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/ai/generate/storyboard', () => {
    it('应该成功生成分镜', async () => {
      const response = await request(app)
        .post('/api/ai/generate/storyboard')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          episodeId: testEpisodeId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('storyboardCount');
    });

    it('应该拒绝无效的分集 ID', async () => {
      const response = await request(app)
        .post('/api/ai/generate/storyboard')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          episodeId: 99999,
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/ai/generate/video', () => {
    it('应该成功创建视频生成任务', async () => {
      // 先创建一个测试分镜
      const scene = await prisma.sceneV2.create({
        data: {
          episodeId: testEpisodeId,
          number: 1,
          location: '室内 - 办公室',
          timeOfDay: '日',
          content: '主角坐在办公桌前工作',
          duration: 10,
          status: 'draft',
        },
      });
      testSceneId = scene.id;

      const response = await request(app)
        .post('/api/ai/generate/video')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sceneId: testSceneId,
          style: '写实风格',
          duration: 10,
          resolution: '720p',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data.status).toBe('queued');
    });
  });

  describe('GET /api/ai/task/:jobId/status', () => {
    it('应该返回任务状态', async () => {
      // 创建一个测试任务
      const createResponse = await request(app)
        .post('/api/ai/generate/video')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sceneId: testSceneId,
        });

      const jobId = createResponse.body.data.jobId;

      const response = await request(app)
        .get(`/api/ai/task/${jobId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('progress');
    });

    it('应该返回 404 对于不存在的任务', async () => {
      const response = await request(app)
        .get('/api/ai/task/nonexistent-job-id/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/ai/generate/video/batch', () => {
    it('应该成功创建批量视频生成任务', async () => {
      const response = await request(app)
        .post('/api/ai/generate/video/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          episodeId: testEpisodeId,
          style: '写实风格',
          resolution: '720p',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('jobIds');
      expect(response.body.data).toHaveProperty('sceneCount');
    });
  });

  describe('POST /api/ai/generate/compose', () => {
    it('应该成功创建视频合成任务', async () => {
      const response = await request(app)
        .post('/api/ai/generate/compose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId,
          episodeId: testEpisodeId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('jobId');
    });
  });

  describe('GET /api/ai/queue/stats', () => {
    it('应该返回队列统计信息', async () => {
      const response = await request(app)
        .get('/api/ai/queue/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('waiting');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('completed');
      expect(response.body.data).toHaveProperty('failed');
    });
  });

  describe('GET /api/ai/video/history', () => {
    it('应该返回视频生成历史', async () => {
      const response = await request(app)
        .get('/api/ai/video/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page');
    });

    it('应该支持分页', async () => {
      const response = await request(app)
        .get('/api/ai/video/history?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.limit).toBe(10);
    });
  });
});
