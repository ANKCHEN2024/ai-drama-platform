# AI 短剧平台 - 快速启动指南

## 前置要求

- Node.js 20+
- npm 或 yarn
- PostgreSQL（可选，可使用模拟数据模式）

## 快速启动

### 1. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

### 2. 配置环境变量

#### 后端配置

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# 最小配置（使用模拟数据）
PORT=3000
NODE_ENV=development
DB_AVAILABLE=false
JWT_SECRET="your-development-secret-key"
FRONTEND_URL=http://localhost:5173

# 邮件服务（可选）
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=your-email@example.com
# SMTP_PASS=your-password
# SMTP_FROM=noreply@example.com
```

#### 前端配置

```bash
cd frontend
cp .env.example .env
```

编辑 `.env` 文件：

```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3. 启动开发服务器

#### 终端 1 - 启动后端

```bash
cd backend
npm run dev
```

后端将在 http://localhost:3000 启动

#### 终端 2 - 启动前端

```bash
cd frontend
npm run dev
```

前端将在 http://localhost:5173 启动

### 4. 访问应用

打开浏览器访问：http://localhost:5173

## 测试用户系统

### 注册新用户

1. 访问 http://localhost:5173/register
2. 填写用户名、邮箱、密码
3. 点击"立即注册"
4. 注册成功后会自动登录

### 邮箱验证（如果配置了 SMTP）

1. 检查注册邮箱
2. 点击验证邮件中的链接
3. 或访问 http://localhost:5173/verify-email?token=xxx

### 忘记密码（如果配置了 SMTP）

1. 访问 http://localhost:5173/forgot-password
2. 输入注册邮箱
3. 点击"发送重置邮件"
4. 检查邮箱并点击重置链接

## API 测试

使用 curl 或 Postman 测试 API：

### 注册

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 获取资料（需要 token）

```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 运行测试

```bash
cd backend
npm test
```

## 构建生产版本

```bash
# 后端
cd backend
npm run build
npm start

# 前端
cd frontend
npm run build
```

## 常见问题

### 邮件发送失败

- 检查 SMTP 配置是否正确
- 确认 SMTP 服务器允许连接
- 开发模式下会降级为日志输出

### 数据库连接失败

- 设置 `DB_AVAILABLE=false` 使用模拟数据
- 或配置正确的 `DATABASE_URL`

### 前端无法连接后端

- 确认后端已启动
- 检查 `VITE_API_BASE_URL` 配置
- 检查浏览器控制台是否有 CORS 错误

## 项目结构

```
ai-drama-platform/
├── backend/           # 后端服务
│   ├── src/
│   │   ├── controllers/   # 控制器
│   │   ├── middleware/    # 中间件
│   │   ├── routes/        # 路由
│   │   ├── utils/         # 工具函数
│   │   └── config/        # 配置
│   ├── prisma/            # 数据库模型
│   └── tests/             # 测试
├── frontend/          # 前端应用
│   ├── src/
│   │   ├── api/           # API 调用
│   │   ├── views/         # 页面组件
│   │   ├── components/    # 通用组件
│   │   ├── stores/        # 状态管理
│   │   ├── router/        # 路由配置
│   │   └── utils/         # 工具函数
│   └── public/            # 静态资源
└── docs/              # 文档
```

## 下一步

- [ ] 配置真实的 PostgreSQL 数据库
- [ ] 配置 SMTP 邮件服务
- [ ] 开始项目管理功能开发
- [ ] 集成 AI 视频生成

---

**文档版本**: 1.0
**最后更新**: 2026-03-07
