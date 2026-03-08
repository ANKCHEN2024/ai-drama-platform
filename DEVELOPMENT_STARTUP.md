# 开发环境启动指南

## 前置条件

### 必需软件
- Node.js 18+ 
- PostgreSQL 14+
- Redis 7+
- MinIO (可选，用于对象存储)

### 可选软件
- Docker (用于快速部署依赖)
- FFmpeg (用于视频处理)

---

## 快速启动 (使用 Docker)

### 1. 启动依赖服务

```bash
cd /Users/chenggl/workspace/ai-drama-platform

# 使用 Docker Compose 启动 PostgreSQL, Redis, MinIO
docker-compose up -d
```

### 2. 初始化数据库

```bash
cd backend

# 安装依赖
npm install

# 运行数据库迁移
npx prisma migrate dev

# 生成 Prisma 客户端
npx prisma generate
```

### 3. 启动后端服务

```bash
cd backend

# 开发模式 (带热重载)
npm run dev

# 或生产模式
npm run build
npm start
```

后端服务将在 http://localhost:3000 启动

### 4. 启动前端服务

```bash
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev
```

前端服务将在 http://localhost:5173 启动

---

## 手动启动 (不使用 Docker)

### 1. 安装并配置 PostgreSQL

```bash
# macOS (使用 Homebrew)
brew install postgresql@14
brew services start postgresql@14

# 创建数据库
createdb ai_drama_platform
```

### 2. 安装并配置 Redis

```bash
# macOS (使用 Homebrew)
brew install redis
brew services start redis
```

### 3. 安装并配置 MinIO (可选)

```bash
# macOS (使用 Homebrew)
brew install minio/stable/minio
minio server /data/minio
```

### 4. 初始化项目

```bash
# 后端
cd backend
npm install
npx prisma migrate dev
npx prisma generate

# 前端
cd frontend
npm install
```

### 5. 启动服务

```bash
# 终端 1 - 后端
cd backend
npm run dev

# 终端 2 - 前端
cd frontend
npm run dev
```

---

## 验证安装

### 后端健康检查

```bash
curl http://localhost:3000/api/v1/health
```

期望响应:
```json
{
  "status": "ok",
  "timestamp": "2025-03-07T12:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "minio": "connected"
  }
}
```

### 前端访问

浏览器访问：http://localhost:5173

应该看到登录/注册页面

---

## 常见问题

### 1. 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
brew services list | grep postgres

# 重启 PostgreSQL
brew services restart postgresql@14

# 检查连接
psql -h localhost -U postgres -d ai_drama_platform
```

### 2. Redis 连接失败

```bash
# 检查 Redis 是否运行
brew services list | grep redis

# 测试 Redis 连接
redis-cli ping
# 应返回：PONG
```

### 3. 端口被占用

```bash
# 查看端口占用
lsof -i :3000
lsof -i :5173

# 杀死占用端口的进程
kill -9 <PID>
```

### 4. Prisma 迁移错误

```bash
# 重置数据库 (开发环境)
npx prisma migrate reset

# 重新生成客户端
npx prisma generate
```

---

## 开发工具推荐

### VS Code 扩展
- Prisma (Prisma 语法高亮)
- ESLint (代码检查)
- Prettier (代码格式化)
- Vue Language Features (前端开发)
- Thunder Client (API 测试)

### 数据库工具
- TablePlus (PostgreSQL GUI)
- pgAdmin (PostgreSQL 管理)
- RedisInsight (Redis GUI)

### API 测试
- Postman
- Insomnia
- Thunder Client (VS Code 扩展)

---

## 下一步

启动开发环境后，参考 `PHASE3_TASKS.md` 开始开发工作。

建议从 P0 任务开始：
1. 用户系统完善
2. 项目管理核心流程
3. 分集管理
4. 分镜管理
5. 视频生成流程

---

_最后更新：2025-03-07_
