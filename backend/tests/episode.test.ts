import request from 'supertest';
import express from 'express';
import episodesRouter, { episodeRouter } from '../routes/episodes';
import scenesV2Router, { sceneRouter } from '../routes/scenesV2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use('/api/projects/:projectId/episodes', episodesRouter);
app.use('/api/episodes/:episodeId/scenes', scenesV2Router);
app.use('/api/episodes', episodeRouter);
app.use('/api/scenes', sceneRouter);

describe('Episode API', () => {
  let testProjectId: string;
  let testEpisodeId: string;

  beforeAll(async () => {
    // 创建测试项目
    const project = await prisma.project.create({
      data: {
        name: '测试项目',
        description: '用于测试分集 API',
        userId: 1n,
      },
    });
    testProjectId = project.id.toString();
  });

  afterAll(async () => {
    // 清理测试数据
    if (testEpisodeId) {
      await prisma.sceneV2.deleteMany({ where: { episodeId: BigInt(testEpisodeId) } });
      await prisma.episodeV2.deleteMany({ where: { projectId: BigInt(testProjectId) } });
    }
    if (testProjectId) {
      await prisma.project.delete({ where: { id: BigInt(testProjectId) } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/projects/:projectId/episodes', () => {
    it('应该成功创建分集', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProjectId}/episodes`)
        .send({
          number: 1,
          title: '第一集',
          description: '测试分集',
          status: 'draft',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.number).toBe(1);
      expect(res.body.title).toBe('第一集');
      testEpisodeId = res.body.id.toString();
    });

    it('应该拒绝缺少必填字段的请求', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProjectId}/episodes`)
        .send({ title: '缺少集号' });

      expect(res.status).toBe(400);
    });

    it('应该拒绝重复的集号', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProjectId}/episodes`)
        .send({
          number: 1,
          title: '重复的第一集',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/projects/:projectId/episodes', () => {
    it('应该获取分集列表', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProjectId}/episodes`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/episodes/:id', () => {
    it('应该获取分集详情', async () => {
      const res = await request(app)
        .get(`/api/episodes/${testEpisodeId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('scenes');
    });

    it('应该返回 404 对于不存在的分集', async () => {
      const res = await request(app)
        .get('/api/episodes/999999');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/episodes/:id', () => {
    it('应该更新分集', async () => {
      const res = await request(app)
        .put(`/api/episodes/${testEpisodeId}`)
        .send({
          title: '更新后的标题',
          status: 'recording',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('更新后的标题');
      expect(res.body.status).toBe('recording');
    });
  });

  describe('DELETE /api/episodes/:id', () => {
    let episodeToDelete: any;

    beforeAll(async () => {
      episodeToDelete = await prisma.episodeV2.create({
        data: {
          projectId: BigInt(testProjectId),
          number: 99,
          title: '待删除的分集',
        },
      });
    });

    it('应该删除分集', async () => {
      const res = await request(app)
        .delete(`/api/episodes/${episodeToDelete.id}`);

      expect(res.status).toBe(204);
    });
  });
});

describe('Scene API', () => {
  let testProjectId: string;
  let testEpisodeId: string;
  let testSceneId: string;

  beforeAll(async () => {
    // 创建测试数据
    const project = await prisma.project.create({
      data: {
        name: '测试项目 - 分镜',
        description: '用于测试分镜 API',
        userId: 1n,
      },
    });
    testProjectId = project.id.toString();

    const episode = await prisma.episodeV2.create({
      data: {
        projectId: BigInt(testProjectId),
        number: 1,
        title: '测试分集',
      },
    });
    testEpisodeId = episode.id.toString();
  });

  afterAll(async () => {
    // 清理测试数据
    if (testSceneId) {
      await prisma.sceneV2.deleteMany({ where: { episodeId: BigInt(testEpisodeId) } });
    }
    if (testEpisodeId) {
      await prisma.episodeV2.deleteMany({ where: { projectId: BigInt(testProjectId) } });
    }
    if (testProjectId) {
      await prisma.project.delete({ where: { id: BigInt(testProjectId) } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/episodes/:episodeId/scenes', () => {
    it('应该成功创建分镜', async () => {
      const res = await request(app)
        .post(`/api/episodes/${testEpisodeId}/scenes`)
        .send({
          number: 1,
          location: '内',
          timeOfDay: '日',
          content: '测试分镜内容',
          dialogue: '测试对话',
          duration: 30,
          status: 'draft',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.number).toBe(1);
      testSceneId = res.body.id.toString();
    });

    it('应该拒绝缺少必填字段的请求', async () => {
      const res = await request(app)
        .post(`/api/episodes/${testEpisodeId}/scenes`)
        .send({ number: 2 });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/episodes/:episodeId/scenes', () => {
    it('应该获取分镜列表', async () => {
      const res = await request(app)
        .get(`/api/episodes/${testEpisodeId}/scenes`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/scenes/:id', () => {
    it('应该获取分镜详情', async () => {
      const res = await request(app)
        .get(`/api/scenes/${testSceneId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('episode');
    });
  });

  describe('PUT /api/scenes/:id', () => {
    it('应该更新分镜', async () => {
      const res = await request(app)
        .put(`/api/scenes/${testSceneId}`)
        .send({
          content: '更新后的内容',
          status: 'filming',
        });

      expect(res.status).toBe(200);
      expect(res.body.content).toBe('更新后的内容');
      expect(res.body.status).toBe('filming');
    });
  });

  describe('DELETE /api/scenes/:id', () => {
    let sceneToDelete: any;

    beforeAll(async () => {
      sceneToDelete = await prisma.sceneV2.create({
        data: {
          episodeId: BigInt(testEpisodeId),
          number: 99,
          location: '外',
          timeOfDay: '夜',
          content: '待删除的分镜',
        },
      });
    });

    it('应该删除分镜', async () => {
      const res = await request(app)
        .delete(`/api/scenes/${sceneToDelete.id}`);

      expect(res.status).toBe(204);
    });
  });
});
