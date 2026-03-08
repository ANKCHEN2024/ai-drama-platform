# Phase 3 P4 - AI 生成与视频合成 部署指南

## 系统要求

### 硬件要求
- **CPU**: 4 核以上（推荐 8 核）
- **内存**: 8GB 以上（推荐 16GB）
- **存储**: 100GB 可用空间（用于视频存储）
- **GPU**: 可选（用于本地视频处理加速）

### 软件要求
- **Node.js**: v18+ 
- **Redis**: v6+
- **PostgreSQL**: v13+
- **FFmpeg**: v4.4+
- **Git**: 最新版本

## 快速开始

### 1. 安装依赖

```bash
# 安装系统依赖（macOS）
brew install redis ffmpeg

# 安装系统依赖（Ubuntu/Debian）
sudo apt-get update
sudo apt-get install -y redis-server ffmpeg

# 安装 Node.js 依赖
cd backend
npm install
```

### 2. 配置环境变量

```bash
# 复制环境配置示例
cp .env.example .env

# 编辑 .env 文件
nano .env
```

**必需配置项**:

```bash
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/ai_drama_platform"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# 阿里百炼 API
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx
DASHSCOPE_ENDPOINT=https://dashscope.aliyuncs.com/api/v1
DASHSCOPE_MODEL=qwen-max

# 视频存储路径
VIDEO_STORAGE_PATH=/path/to/storage/videos
```

### 3. 初始化数据库

```bash
# 运行数据库迁移
npx prisma migrate deploy

# 生成 Prisma 客户端
npx prisma generate

# （可选）种子数据
npx prisma db seed
```

### 4. 启动服务

#### 开发模式

```bash
# 启动 Redis（如果未运行）
redis-server

# 启动后端服务（支持热重载）
npm run dev
```

#### 生产模式

```bash
# 构建项目
npm run build

# 启动服务
npm start

# 或使用 PM2（推荐）
pm2 start dist/server.js --name ai-drama-backend
pm2 save
pm2 startup
```

### 5. 验证安装

```bash
# 检查 API 是否正常运行
curl http://localhost:3000/api/health

# 检查队列状态
curl http://localhost:3000/api/ai/queue/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 配置详解

### Redis 配置

**单机模式**（开发环境）:
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
```

**集群模式**（生产环境）:
```bash
REDIS_HOST=redis-cluster.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
VIDEO_QUEUE_CONCURRENCY=5
```

### DashScope API 配置

**基础配置**:
```bash
DASHSCOPE_API_KEY=sk-xxxxxxxx
DASHSCOPE_ENDPOINT=https://dashscope.aliyuncs.com/api/v1
```

**自定义模型**:
```bash
# 文本生成（剧本）
DASHSCOPE_MODEL=qwen-max

# 视频生成
DASHSCOPE_VIDEO_ENDPOINT=https://dashscope.aliyuncs.com/api/v1
```

### 存储配置

**本地存储**:
```bash
VIDEO_STORAGE_PATH=/var/www/ai-drama/storage/videos
```

**对象存储**（推荐生产环境）:
```bash
# AWS S3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=ai-drama-videos
AWS_REGION=us-east-1

# 或阿里云 OSS
OSS_ACCESS_KEY_ID=xxx
OSS_ACCESS_KEY_SECRET=xxx
OSS_BUCKET=ai-drama-videos
OSS_REGION=oss-cn-hangzhou
```

## 性能优化

### 1. 队列并发配置

根据服务器性能调整并发数：

```bash
# 小型服务器（2-4 核）
VIDEO_QUEUE_CONCURRENCY=2

# 中型服务器（4-8 核）
VIDEO_QUEUE_CONCURRENCY=5

# 大型服务器（8+ 核）
VIDEO_QUEUE_CONCURRENCY=10
```

### 2. 数据库连接池

```bash
# Prisma 连接池配置
DATABASE_CONNECTION_POOL_MIN=2
DATABASE_CONNECTION_POOL_MAX=10
```

### 3. FFmpeg 优化

```typescript
// 在 aiVideoGenerationService.ts 中调整编码参数
const ffmpegArgs = [
  '-c:v', 'libx264',
  '-preset', 'medium',  // 改为 'fast' 或 'ultrafast' 提升速度
  '-crf', '23',        // 改为 25-28 减小文件大小
  // ...
];
```

## 监控与日志

### 1. 应用日志

```bash
# 查看实时日志
pm2 logs ai-drama-backend

# 或使用 Docker
docker logs ai-drama-backend
```

### 2. 队列监控

```bash
# 查看队列统计
curl http://localhost:3000/api/ai/queue/stats

# 查看失败任务
curl http://localhost:3000/api/ai/video/history?status=failed
```

### 3. 系统监控

推荐使用：
- **Prometheus + Grafana**: 系统指标监控
- **Redis Insight**: Redis 监控
- **pgAdmin**: PostgreSQL 监控

## 故障排查

### 问题 1: Redis 连接失败

**症状**: 任务一直处于 pending 状态

**解决方案**:
```bash
# 检查 Redis 状态
redis-cli ping

# 重启 Redis
sudo systemctl restart redis

# 检查 Redis 日志
sudo tail -f /var/log/redis/redis.log
```

### 问题 2: FFmpeg 命令失败

**症状**: 视频合成任务失败

**解决方案**:
```bash
# 验证 FFmpeg 安装
ffmpeg -version

# 测试 FFmpeg 功能
ffmpeg -i test.mp4 -c copy test_output.mp4

# 检查磁盘空间
df -h

# 检查文件权限
ls -la /path/to/storage/videos
```

### 问题 3: API 调用失败

**症状**: 剧本或视频生成返回错误

**解决方案**:
```bash
# 检查 API Key 是否有效
curl https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen-max","input":{"messages":[{"role":"user","content":"test"}]}}'

# 检查 API 配额
# 登录 DashScope 控制台查看使用量
```

### 问题 4: 数据库连接超时

**症状**: 请求超时或数据库错误

**解决方案**:
```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 检查连接数
psql -c "SELECT count(*) FROM pg_stat_activity;"

# 优化连接池配置
# 编辑 .env 文件调整 DATABASE_CONNECTION_POOL_MAX
```

## 备份与恢复

### 数据库备份

```bash
# 备份数据库
pg_dump ai_drama_platform > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql ai_drama_platform < backup_20260308.sql
```

### 视频文件备份

```bash
# 使用 rsync 备份
rsync -avz /path/to/storage/videos/ /backup/location/videos/

# 或使用云存储同步
aws s3 sync /path/to/storage/videos s3://your-bucket/videos/
```

## 安全建议

### 1. API 安全

- 使用 HTTPS（生产环境必须）
- 定期轮换 JWT_SECRET
- 实施 API 限流

### 2. 数据安全

- 加密存储敏感数据
- 定期备份数据库
- 实施访问控制

### 3. 网络安全

```bash
# 配置防火墙（UFW 示例）
sudo ufw allow 3000/tcp  # API 端口
sudo ufw allow 6379/tcp  # Redis（仅内网）
sudo ufw enable
```

## 扩展部署

### Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine

RUN apk add --no-cache ffmpeg redis

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/ai_drama
      - REDIS_HOST=redis
    depends_on:
      - db
      - redis
    volumes:
      - ./storage:/app/storage

  db:
    image: postgres:14
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=ai_drama_platform
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Kubernetes 部署

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-drama-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-drama-backend
  template:
    metadata:
      labels:
        app: ai-drama-backend
    spec:
      containers:
      - name: backend
        image: your-registry/ai-drama-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_HOST
          value: "redis-cluster"
        - name: VIDEO_QUEUE_CONCURRENCY
          value: "5"
```

## 成本估算

### 开发环境（每月）

| 项目 | 费用 |
|------|------|
| 服务器（2 核 4G） | ¥100 |
| 数据库 | ¥50 |
| Redis | ¥30 |
| DashScope API | ¥200 |
| **总计** | **¥380** |

### 生产环境（每月）

| 项目 | 费用 |
|------|------|
| 服务器（8 核 16G） | ¥500 |
| 数据库（高可用） | ¥300 |
| Redis 集群 | ¥200 |
| 对象存储 | ¥100 |
| DashScope API | ¥2000 |
| CDN | ¥200 |
| **总计** | **¥3,300** |

## 支持与联系

- **文档**: `/docs/` 目录
- **API 测试**: Postman 集合（见 `tests/` 目录）
- **问题反馈**: 提交 Issue
- **紧急联系**: 运维团队

---

最后更新：2026-03-08
