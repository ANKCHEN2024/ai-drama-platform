# AI 短剧平台 2.0 - 部署文档

## 目录
1. [系统要求](#系统要求)
2. [快速开始](#快速开始)
3. [详细配置](#详细配置)
4. [服务访问](#服务访问)
5. [常见问题](#常见问题)
6. [生产环境部署](#生产环境部署)

---

## 系统要求

### 硬件要求
- **CPU**: 4 核及以上
- **内存**: 8GB 及以上（推荐 16GB）
- **存储**: 100GB 及以上 SSD

### 软件要求
- Docker 20.10+
- Docker Compose 2.0+
- Git (可选，用于克隆代码)

---

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd ai-drama-platform
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入必要的配置
# 特别是数据库密码、JWT 密钥和 AI 服务 API Key
vim .env
```

### 3. 启动所有服务
```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 4. 等待服务启动
首次启动需要等待：
- PostgreSQL 初始化（约 10-30 秒）
- Redis 启动（约 5-10 秒）
- MinIO 初始化和 bucket 创建（约 10-20 秒）
- 后端服务构建和数据库迁移（约 1-2 分钟）
- 前端服务构建（约 1-2 分钟）

### 5. 访问应用
- 前端应用: http://localhost
- 后端 API: http://localhost/api/v1
- MinIO 控制台: http://localhost:9001
- 健康检查: http://localhost/health

---

## 详细配置

### 环境变量说明

#### 基础配置
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NODE_ENV | 运行环境 | production |
| APP_NAME | 应用名称 | AI 短剧平台 |
| APP_VERSION | 应用版本 | 2.0.0 |

#### 网络配置
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| BACKEND_PORT | 后端服务端口 | 3000 |
| FRONTEND_PORT | 前端开发端口 | 5173 |
| HTTP_PORT | Nginx HTTP 端口 | 80 |
| HTTPS_PORT | Nginx HTTPS 端口 | 443 |

#### PostgreSQL 配置
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| POSTGRES_USER | 数据库用户名 | drama_admin |
| POSTGRES_PASSWORD | 数据库密码 | change_this_password_in_production |
| POSTGRES_DB | 数据库名称 | drama_platform |
| POSTGRES_HOST | 数据库主机 | postgres |
| POSTGRES_PORT | 数据库端口 | 5432 |
| DATABASE_URL | 数据库连接字符串 | - |

#### Redis 配置
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| REDIS_HOST | Redis 主机 | redis |
| REDIS_PORT | Redis 端口 | 6379 |
| REDIS_PASSWORD | Redis 密码 | (空) |
| REDIS_URL | Redis 连接字符串 | - |

#### MinIO 配置
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| MINIO_ENDPOINT | MinIO 端点 | minio |
| MINIO_PORT | MinIO API 端口 | 9000 |
| MINIO_CONSOLE_PORT | MinIO 控制台端口 | 9001 |
| MINIO_ACCESS_KEY | MinIO 访问密钥 | minioadmin |
| MINIO_SECRET_KEY | MinIO 秘密密钥 | minioadmin_change_this |
| MINIO_BUCKET_NAME | MinIO Bucket 名称 | drama-platform |
| MINIO_USE_SSL | 是否使用 SSL | false |

#### JWT 配置
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| JWT_SECRET | JWT 签名密钥 | your_super_secret_jwt_key_here_change_in_production |
| JWT_EXPIRES_IN | JWT 过期时间 | 7d |

#### AI 服务配置
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| TONGYI_API_KEY | 阿里通义千问 API Key | - |
| TONGYI_WANXIANG_API_KEY | 阿里通义万相 API Key | - |
| KELING_API_KEY | 快手可灵 AI API Key | - |
| JIMENG_API_KEY | 火山即梦 AI API Key | - |
| ALIYUN_VOICE_API_KEY | 阿里云语音 API Key | - |
| ALIYUN_ACCESS_KEY_ID | 阿里云 Access Key ID | - |
| ALIYUN_ACCESS_KEY_SECRET | 阿里云 Access Key Secret | - |
| NETEASE_MUSIC_API_KEY | 网易云音乐 API Key | - |

#### 日志和文件配置
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| LOG_LEVEL | 日志级别 | info |
| LOG_DIR | 日志目录 | /app/logs |
| LOG_FILE | 日志文件路径 | /app/logs/app.log |
| MAX_FILE_SIZE | 最大文件大小（字节） | 104857600 |
| UPLOAD_DIR | 上传文件目录 | /app/uploads |

#### 前端配置
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| VITE_API_BASE_URL | API 基础 URL | http://localhost/api/v1 |
| VITE_WS_URL | WebSocket URL | ws://localhost/ws |

---

## 服务访问

### 主要服务
| 服务 | 地址 | 说明 |
|------|------|------|
| 前端应用 | http://localhost | 主应用界面 |
| 后端 API | http://localhost/api/v1 | REST API |
| WebSocket | ws://localhost/ws | 实时通信 |
| MinIO 控制台 | http://localhost:9001 | 对象存储管理 |
| PostgreSQL | localhost:5432 | 数据库（需本地客户端） |
| Redis | localhost:6379 | 缓存/队列（需本地客户端） |

### MinIO 登录
- 访问: http://localhost:9001
- 用户名: `MINIO_ACCESS_KEY` (默认: minioadmin)
- 密码: `MINIO_SECRET_KEY` (默认: minioadmin_change_this)

### 健康检查
- Nginx: http://localhost/health
- 后端: http://localhost/api/v1/health

---

## 常用 Docker 命令

### 服务管理
```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启所有服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 数据管理
```bash
# 备份 PostgreSQL 数据库
docker-compose exec postgres pg_dump -U drama_admin drama_platform > backup.sql

# 恢复 PostgreSQL 数据库
docker-compose exec -T postgres psql -U drama_admin drama_platform < backup.sql

# 进入容器
docker-compose exec backend sh
docker-compose exec postgres sh
docker-compose exec redis sh
docker-compose exec minio sh

# 清理所有数据（谨慎使用！）
docker-compose down -v
```

### 构建管理
```bash
# 重新构建镜像
docker-compose build

# 重新构建并启动
docker-compose up -d --build

# 清理未使用的镜像
docker image prune -a
```

---

## 常见问题

### 1. 服务启动失败
**问题**: 某些服务无法启动
**解决方案**:
```bash
# 查看具体服务日志
docker-compose logs <service-name>

# 检查端口占用
lsof -i :80
lsof -i :3000
lsof -i :5432
lsof -i :6379

# 停止占用端口的进程或修改 .env 中的端口配置
```

### 2. 数据库连接失败
**问题**: 后端无法连接到 PostgreSQL
**解决方案**:
- 确认 PostgreSQL 容器正在运行: `docker-compose ps postgres`
- 检查 DATABASE_URL 配置是否正确
- 等待 PostgreSQL 完全启动（首次启动可能需要 30 秒）

### 3. MinIO bucket 创建失败
**问题**: minio-init 服务失败
**解决方案**:
- 检查 MinIO 访问密钥和秘密密钥配置
- 手动创建 bucket:
  ```bash
  docker-compose exec minio mc alias set ai-drama-minio http://localhost:9000 minioadmin minioadmin_change_this
  docker-compose exec minio mc mb ai-drama-minio/drama-platform
  docker-compose exec minio mc policy set public ai-drama-minio/drama-platform
  ```

### 4. 前端无法访问后端 API
**问题**: 前端页面显示 API 连接错误
**解决方案**:
- 检查 VITE_API_BASE_URL 配置
- 确认后端服务正在运行
- 检查浏览器控制台的网络请求

### 5. 内存不足
**问题**: 服务因内存不足被杀死
**解决方案**:
- 增加 Docker Desktop 的内存限制（Mac/Windows）
- 在 Linux 上添加 swap 空间
- 减少同时运行的服务数量

---

## 生产环境部署

### 1. 安全配置
```bash
# 修改所有默认密码和密钥
# 在 .env 文件中更新：
POSTGRES_PASSWORD=your_strong_password
MINIO_SECRET_KEY=your_strong_minio_secret
JWT_SECRET=your_very_long_and_secure_jwt_secret
REDIS_PASSWORD=your_redis_password

# 启用 Redis 密码认证
```

### 2. HTTPS 配置
1. 获取 SSL 证书（Let's Encrypt）
2. 修改 nginx/nginx.conf，添加 HTTPS 配置
3. 更新 VITE_API_BASE_URL 使用 https

### 3. 数据备份
- 配置 PostgreSQL 定期备份
- 配置 MinIO 数据备份
- 使用 Docker volumes 持久化所有数据

### 4. 监控和日志
- 配置 Prometheus + Grafana 监控
- 配置 ELK Stack 日志收集
- 设置告警通知

### 5. 高可用
- PostgreSQL 主从复制
- Redis Cluster
- MinIO 分布式部署
- 后端服务负载均衡

---

## 更新和维护

### 应用更新
```bash
# 1. 拉取最新代码
git pull

# 2. 停止服务
docker-compose down

# 3. 重新构建并启动
docker-compose up -d --build

# 4. 查看日志确认正常
docker-compose logs -f
```

### 数据库迁移
后端容器启动时会自动运行 `prisma migrate deploy`，无需手动操作。

---

## 技术支持

如遇到问题，请：
1. 查看本文档的[常见问题](#常见问题)部分
2. 检查服务日志: `docker-compose logs -f`
3. 提交 Issue 到项目仓库

---

**文档版本**: 1.0  
**最后更新**: 2026-03-07
