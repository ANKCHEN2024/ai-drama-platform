import request from 'supertest';
import app from '../app';

describe('Auth Controller', () => {
  describe('POST /auth/register', () => {
    it('应该成功注册新用户', async () => {
      const userData = {
        username: `testuser_${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.code).toBe(201);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('应该拒绝重复的用户名', async () => {
      const userData = {
        username: 'duplicate_user',
        email: `duplicate1_${Date.now()}@example.com`,
        password: 'password123'
      };

      // 第一次注册
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // 第二次注册相同用户名
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          email: `duplicate2_${Date.now()}@example.com`
        })
        .expect(400);

      expect(response.body.message).toContain('用户名已存在');
    });

    it('应该拒绝重复的邮箱', async () => {
      const userData = {
        username: `unique_user_${Date.now()}`,
        email: 'duplicate_email@example.com',
        password: 'password123'
      };

      // 第一次注册
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // 第二次注册相同邮箱
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          username: `unique_user_2_${Date.now()}`
        })
        .expect(400);

      expect(response.body.message).toContain('邮箱已被注册');
    });

    it('应该拒绝密码长度不足', async () => {
      const userData = {
        username: `short_pass_user_${Date.now()}`,
        email: `short${Date.now()}@example.com`,
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain('密码长度至少为 6 位');
    });

    it('应该拒绝无效的邮箱格式', async () => {
      const userData = {
        username: `invalid_email_user_${Date.now()}`,
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain('邮箱格式不正确');
    });
  });

  describe('POST /auth/login', () => {
    let testUser: any;

    beforeAll(async () => {
      // 创建测试用户
      const userData = {
        username: `login_test_user_${Date.now()}`,
        email: `login${Date.now()}@example.com`,
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      testUser = response.body.data;
    });

    it('应该成功登录', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.user.email,
          password: 'password123'
        })
        .expect(200);

      expect(response.body.code).toBe(200);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
    });

    it('应该拒绝错误的密码', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.user.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.message).toContain('邮箱或密码错误');
    });

    it('应该拒绝不存在的用户', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.message).toContain('邮箱或密码错误');
    });

    it('应该拒绝缺少字段', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.user.email
        })
        .expect(400);

      expect(response.body.message).toContain('邮箱和密码为必填项');
    });
  });

  describe('GET /auth/profile', () => {
    let token: string;

    beforeAll(async () => {
      // 创建并登录测试用户
      const userData = {
        username: `profile_test_user_${Date.now()}`,
        email: `profile${Date.now()}@example.com`,
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'password123'
        });

      token = loginResponse.body.data.token;
    });

    it('应该成功获取用户资料', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.code).toBe(200);
      expect(response.body.data).toHaveProperty('username');
      expect(response.body.data).toHaveProperty('email');
    });

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.message).toContain('未提供认证令牌');
    });
  });

  describe('PUT /auth/profile', () => {
    let token: string;
    let userId: number;

    beforeAll(async () => {
      const userData = {
        username: `update_test_user_${Date.now()}`,
        email: `update${Date.now()}@example.com`,
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'password123'
        });

      token = loginResponse.body.data.token;
      userId = loginResponse.body.data.user.id;
    });

    it('应该成功更新用户资料', async () => {
      const updateData = {
        username: `updated_user_${Date.now()}`
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.code).toBe(200);
      expect(response.body.data.username).toBe(updateData.username);
    });

    it('应该拒绝更新为已存在的用户名', async () => {
      // 先创建一个用户
      const existingUser = {
        username: `existing_user_${Date.now()}`,
        email: `existing${Date.now()}@example.com`,
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(existingUser);

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: existingUser.username })
        .expect(400);

      expect(response.body.message).toContain('用户名已存在');
    });
  });

  describe('PUT /auth/password', () => {
    let token: string;
    let userEmail: string;

    beforeAll(async () => {
      const userData = {
        username: `password_test_user_${Date.now()}`,
        email: `password${Date.now()}@example.com`,
        password: 'oldpassword123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'oldpassword123'
        });

      token = loginResponse.body.data.token;
      userEmail = userData.email;
    });

    it('应该成功修改密码', async () => {
      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          oldPassword: 'oldpassword123',
          newPassword: 'newpassword123'
        })
        .expect(200);

      expect(response.body.code).toBe(200);
      expect(response.body.message).toContain('修改密码成功');
    });

    it('应该用新密码登录', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: 'newpassword123'
        })
        .expect(200);

      expect(response.body.code).toBe(200);
    });

    it('应该拒绝错误的旧密码', async () => {
      const response = await request(app)
        .put('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          oldPassword: 'wrongpassword',
          newPassword: 'newpassword456'
        })
        .expect(401);

      expect(response.body.message).toContain('旧密码错误');
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('应该发送密码重置邮件', async () => {
      // 先注册用户
      const userData = {
        username: `forgot_user_${Date.now()}`,
        email: `forgot${Date.now()}@example.com`,
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: userData.email })
        .expect(200);

      expect(response.body.code).toBe(200);
      expect(response.body.message).toContain('密码重置邮件');
    });

    it('应该对不存在的邮箱也返回成功（安全考虑）', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.code).toBe(200);
    });
  });
});
