# 🎬 AI 短剧平台 2.0

> **工作准则**：本项目遵循 `../WORK_PRINCIPLES.md` 全部 15 条准则，特别是：
> - 第 2 条：24 小时不间断开发
> - 第 4 条：质量第一（零缺陷交付）
> - 第 6 条：定时汇报
> - 第 8 条：Subagent 优先（并行开发）
> - 第 10 条：写下来>脑子记
> - 第 12 条：快速迭代（MVP 优先）
> - 第 13 条：透明沟通


> 基于 100% 国产 AI 技术的短剧内容创作平台，支持从小说到完整短剧视频的端到端生成。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-20.x-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-20.10%2B-blue.svg)](https://www.docker.com/)

---

## 📋 目录

- [项目简介](#项目简介)
- [技术栈](#技术栈)
- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [文档](#文档)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 🚀 项目简介

AI 短剧平台 2.0 是一个完整的短剧内容创作解决方案，利用先进的 AI 技术将小说文本自动转换为高质量的短剧视频。平台支持：

- 📖 小说文本智能分析和剧本生成
- 🎭 人物设计和 AI 图像生成
- 🎬 场景构建和分镜设计
- 🎥 AI 视频片段生成
- 🎵 智能语音合成和背景音乐
- ✂️ 视频合成和最终导出

---

## 🛠️ 技术栈

### 后端技术
- **Node.js 20.x** - 运行时环境
- **Express 4.x** - Web 框架
- **TypeScript** - 类型安全
- **PostgreSQL 15** - 主数据库
- **Redis 7** - 缓存和任务队列
- **MinIO** - 对象存储
- **Prisma** - ORM
- **Bull** - 任务队列
- **JWT** - 认证

### 前端技术
- **Vue 3** - 前端框架
- **Element Plus** - UI 组件库
- **Pinia** - 状态管理
- **Vue Router** - 路由管理
- **Vite** - 构建工具
- **Axios** - HTTP 客户端

### AI 服务（100% 国产）
- **阿里通义千问** - 大语言模型
- **阿里通义万相** - 图像生成
- **快手可灵 AI** - 视频生成
- **火山即梦 AI** - 视频生成
- **阿里云智能语音** - 语音合成

### DevOps
- **Docker** - 容器化
- **Docker Compose** - 多容器编排
- **Nginx** - 反向代理

---

## ✨ 功能特性

### 📚 智能剧本分析
- 小说文本导入和解析
- 自动人物识别和提取
- 场景自动分析和分类
- 智能分集规划
- 故事结构可视化

### 🎭 人物管理
- 人物信息编辑和管理
- AI 驱动的人物图像生成
- 多风格人物设计支持
- 人物一致性保持
- 人物素材库

### 🎬 场景设计
- 场景创建和编辑
- AI 场景图像生成
- 场景属性配置
- 场景素材管理
- 场景分类和标签

### 🎞️ 分镜生成
- 自动分镜设计
- 分镜可视化编辑
- 丰富的镜头类型支持
- 摄像机参数配置
- 对话和动作编辑

### 🎥 视频生成
- AI 视频片段生成
- 多 AI 提供商支持
- 实时生成进度跟踪
- 视频质量配置
- 批量生成支持

### 🎵 音频处理
- AI 语音合成
- 多音色选择
- 背景音乐生成
- 音频混音和合成
- 音频预览

### ✂️ 视频合成
- 智能片段拼接
- 丰富的过渡效果
- 自动字幕生成
- 视频格式导出
- 质量配置

---

## 🚀 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ 可用内存
- 100GB+ 可用磁盘空间

### 一键启动

```bash
# 1. 克隆项目
git clone <repository-url>
cd ai-drama-platform

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要的配置（特别是 AI 服务 API Key）

# 3. 启动所有服务
docker-compose up -d

# 4. 查看服务状态
docker-compose ps

# 5. 查看日志（可选）
docker-compose logs -f
```

### 访问应用

启动成功后，可以访问以下服务：

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端应用 | http://localhost | 主应用界面 |
| 后端 API | http://localhost/api/v1 | REST API |
| MinIO 控制台 | http://localhost:9001 | 对象存储管理 |
| 健康检查 | http://localhost/health | 系统健康状态 |

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（谨慎使用！）
docker-compose down -v
```

---

## 📁 项目结构

```
ai-drama-platform/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── config/          # 配置文件
│   │   ├── controllers/     # 控制器
│   │   ├── middleware/      # 中间件
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # 路由
│   │   ├── services/        # 业务服务
│   │   ├── queues/          # 任务队列
│   │   ├── workers/         # 队列 Worker
│   │   ├── utils/           # 工具函数
│   │   ├── websocket/       # WebSocket
│   │   └── app.ts           # 应用入口
│   ├── prisma/              # Prisma 配置
│   ├── Dockerfile           # 后端 Dockerfile
│   └── package.json
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── api/             # API 封装
│   │   ├── components/      # 组件
│   │   ├── views/           # 页面视图
│   │   ├── stores/          # Pinia 状态管理
│   │   ├── router/          # 路由配置
│   │   ├── utils/           # 工具函数
│   │   └── main.js          # 应用入口
│   ├── Dockerfile           # 前端 Dockerfile
│   └── package.json
├── modules/                 # 独立功能模块
│   ├── story-analysis/      # 故事分析模块
│   ├── character-builder/   # 人物构建模块
│   ├── scene-builder/       # 场景构建模块
│   ├── storyboard/          # 分镜模块
│   ├── video-generation/    # 视频生成模块
│   └── video-composite/     # 视频合成模块
├── nginx/                   # Nginx 配置
│   └── nginx.conf           # Nginx 配置文件
├── .env.example             # 环境变量示例
├── docker-compose.yml       # Docker Compose 配置
├── DEPLOYMENT.md            # 部署文档
├── USER_GUIDE.md            # 使用手册
├── architecture.md          # 架构文档
└── README.md                # 项目说明
```

---

## 📖 文档

- **[架构文档](./architecture.md)** - 系统架构设计和技术细节
- **[部署文档](./DEPLOYMENT.md)** - 详细的部署指南和配置说明
- **[使用手册](./USER_GUIDE.md)** - 用户使用教程和 API 参考
- **[开发任务](./DEVELOPMENT_TASK.md)** - 开发任务和进度跟踪

---

## 🤝 贡献指南

我们欢迎任何形式的贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

请确保您的代码：
- 遵循项目的代码风格
- 通过所有测试
- 更新相关文档

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🙏 致谢

感谢所有为本项目做出贡献的开发者！

---

## 📞 支持

如果您有任何问题或建议，请：
- 提交 [Issue](../../issues)
- 发送邮件至 support@example.com

---

**项目版本**: 2.0.0  
**最后更新**: 2026-03-07  
**团队**: AI 短剧平台开发团队
