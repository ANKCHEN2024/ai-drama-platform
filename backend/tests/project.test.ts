import request from 'supertest';
import app from '../src/app';

describe('Project API', () => {
  let authToken: string;
  let testUserId: number;
  let testProjectId: string;

  // 模拟用户注册和登录获取 token
  beforeAll(async () => {
    // 注册测试用户
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testprojectuser',
        email: `testproject${Date.now()}@example.com`,
        password: 'testpass123'
      });

    if (registerRes.status === 201) {
      // 登录获取 token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: `testproject${Date.now() - 1000}@example.com`,
          password: 'testpass123'
        });

      if (loginRes.status === 200) {
        authToken = loginRes.body.data.token;
        testUserId = loginRes.body.data.user.id;
      }
    }
  });

  describe('POST /api/projects', () => {
    it('应该成功创建项目', async () => {
      const projectData = {
        name: '测试项目',
        description: '这是一个测试项目',
        episodeCount: 10,
        episodeDuration: 60,
        videoRatio: '9:16',
        videoQuality: '1080p'
      };

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(projectData.name);
      expect(res.body.data.description).toBe(projectData.description);
      expect(res.body.data.status).toBe('draft');

      testProjectId = res.body.data.id;
    });

    it('应该拒绝空项目名称', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('不能为空');
    });

    it('应该拒绝未授权请求', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({ name: '未授权项目' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/projects', () => {
    it('应该获取项目列表', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.projects).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
    });

    it('应该支持分页', async () => {
      const res = await request(app)
        .get('/api/projects?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.limit).toBe(5);
    });

    it('应该支持状态筛选', async () => {
      const res = await request(app)
        .get('/api/projects?status=draft')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      res.body.data.projects.forEach((project: any) => {
        expect(project.status).toBe('draft');
      });
    });

    it('应该支持搜索', async () => {
      const res = await request(app)
        .get('/api/projects?search=测试')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      res.body.data.projects.forEach((project: any) => {
        expect(project.name).toContain('测试');
      });
    });
  });

  describe('GET /api/projects/:id', () => {
    it('应该获取项目详情', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testProjectId);
    });

    it('应该拒绝访问不存在的项目', async () => {
      const res = await request(app)
        .get('/api/projects/999999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('应该更新项目', async () => {
      const updateData = {
        name: '更新后的项目名称',
        description: '更新后的描述'
      };

      const res = await request(app)
        .put(`/api/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updateData.name);
      expect(res.body.data.description).toBe(updateData.description);
    });

    it('应该拒绝更新已归档的项目', async () => {
      // 先归档
      await request(app)
        .post(`/api/projects/${testProjectId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .put(`/api/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '不应该成功' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('已归档');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    let deleteProjectId: string;

    beforeAll(async () => {
      // 创建一个专门用于删除测试的项目
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '待删除项目',
          description: '这个项目将被删除'
        });
      deleteProjectId = res.body.data.id;
    });

    it('应该删除项目', async () => {
      const res = await request(app)
        .delete(`/api/projects/${deleteProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该拒绝删除不存在的项目', async () => {
      const res = await request(app)
        .delete('/api/projects/999999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/projects/:id/archive', () => {
    let archiveProjectId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '待归档项目',
          description: '这个项目将被归档'
        });
      archiveProjectId = res.body.data.id;
    });

    it('应该归档项目', async () => {
      const res = await request(app)
        .post(`/api/projects/${archiveProjectId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.archivedAt).toBeDefined();
    });

    it('应该取消归档项目', async () => {
      const res = await request(app)
        .post(`/api/projects/${archiveProjectId}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ unarchive: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.archivedAt).toBeNull();
    });
  });

  describe('GET /api/projects/:id/statistics', () => {
    it('应该获取项目统计信息', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProjectId}/statistics`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.projectId).toBe(testProjectId);
      expect(res.body.data.basics).toBeDefined();
      expect(res.body.data.episodes).toBeDefined();
    });
  });

  describe('POST /api/projects/:id/duplicate', () => {
    it('应该复制项目', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProjectId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '复制的项目' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toContain('复制的项目');

      // 清理复制的项目
      await request(app)
        .delete(`/api/projects/${res.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('应该使用默认名称复制项目', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProjectId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toContain('(副本)');

      // 清理复制的项目
      await request(app)
        .delete(`/api/projects/${res.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });
  });
});
