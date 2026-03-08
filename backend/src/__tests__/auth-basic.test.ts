import request from 'supertest';
import app from '../app';

describe('Auth API - Basic Tests', () => {
  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const userData = {
        username: `testuser_${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.code).toBe(201);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
    });

    it('应该拒绝密码长度不足', async () => {
      const userData = {
        username: `test_${Date.now()}`,
        email: `short${Date.now()}@example.com`,
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('密码长度');
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该拒绝缺少字段', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('必填项');
    });
  });
});
