# AI 短剧平台 2.0 - 开发任务计划

## [ ] Task 1: 项目基础设施搭建
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 搭建完整的后端项目结构（Express + TypeScript）
  - 配置数据库（PostgreSQL + ORM）
  - 配置 Redis 连接
  - 配置 MinIO 对象存储
  - 初始化项目配置文件（.env, configs等）
- **Acceptance Criteria Addressed**: [AC-1, AC-9]
- **Test Requirements**:
  - `programmatic` TR-1.1: 后端服务可以成功启动
  - `programmatic` TR-1.2: 数据库连接测试通过
  - `programmatic` TR-1.3: Redis 连接测试通过
  - `programmatic` TR-1.4: MinIO 连接测试通过
- **Notes**: 使用 Prisma 作为 ORM，保持与现有架构文档一致

## [ ] Task 2: 用户认证与权限系统
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 实现用户注册、登录、登出
  - JWT Token 认证中间件
  - 用户资料管理 API
  - 密码加密与安全处理
- **Acceptance Criteria Addressed**: [AC-1, AC-9]
- **Test Requirements**:
  - `programmatic` TR-2.1: 用户注册 API 返回 200 并创建用户
  - `programmatic` TR-2.2: 用户登录 API 返回 valid JWT token
  - `programmatic` TR-2.3: 受保护路由需要 valid token
  - `programmatic` TR-2.4: 密码使用 bcrypt 加密存储
- **Notes**: 使用 bcrypt 进行密码加密

## [ ] Task 3: 数据库 Schema 实现与迁移
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 根据 architecture.md 实现完整的数据库表
  - 创建 Prisma Schema 文件
  - 编写数据库迁移脚本
  - 实现基础数据模型
- **Acceptance Criteria Addressed**: [AC-2, AC-3]
- **Test Requirements**:
  - `programmatic` TR-3.1: 所有 13 个表正确创建
  - `programmatic` TR-3.2: 外键关系正确建立
  - `programmatic` TR-3.3: 索引正确创建
  - `programmatic` TR-3.4: 可以执行 CRUD 操作
- **Notes**: 严格按照 architecture.md 中的设计实现

## [ ] Task 4: 核心 API 框架搭建
- **Priority**: P0
- **Depends On**: Task 1, Task 2, Task 3
- **Description**: 
  - 实现 RESTful API 基础结构
  - 统一响应格式
  - 错误处理中间件
  - 请求验证中间件
  - 日志系统
- **Acceptance Criteria Addressed**: [AC-9]
- **Test Requirements**:
  - `programmatic` TR-4.1: API 统一返回 {code, message, data, timestamp}
  - `programmatic` TR-4.2: 错误返回正确的 HTTP 状态码和错误信息
  - `programmatic` TR-4.3: 请求参数验证生效
  - `programmatic` TR-4.4: 日志正确记录到文件
- **Notes**: 使用 Zod 进行请求验证，Winston 作为日志库

## [ ] Task 5: 项目管理模块 API
- **Priority**: P0
- **Depends On**: Task 4
- **Description**: 
  - 实现项目 CRUD API
  - 项目列表、详情、创建、更新、删除
  - 小说文本导入与保存
  - 项目状态管理
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `programmatic` TR-5.1: POST /projects 创建项目成功
  - `programmatic` TR-5.2: GET /projects 返回用户项目列表
  - `programmatic` TR-5.3: PUT /projects/:id 更新项目成功
  - `programmatic` TR-5.4: DELETE /projects/:id 删除项目成功
  - `programmatic` TR-5.5: 小说文本可以正确保存和读取
- **Notes**: 确保正确的用户权限检查

## [ ] Task 6: 故事分析模块整合
- **Priority**: P0
- **Depends On**: Task 5
- **Description**: 
  - 整合现有 story-analysis 模块
  - 实现故事分析 API
  - 实现自动分集功能
  - 人物与场景提取
  - 分析进度推送（WebSocket）
- **Acceptance Criteria Addressed**: [AC-3, AC-6]
- **Test Requirements**:
  - `programmatic` TR-6.1: POST /scripts/analyze 触发分析任务
  - `programmatic` TR-6.2: 分析结果保存到数据库
  - `programmatic` TR-6.3: 分集列表正确生成
  - `programmatic` TR-6.4: WebSocket 实时推送分析进度
- **Notes**: 使用 Bull Queue 进行异步任务处理

## [ ] Task 7: 人物构建模块整合
- **Priority**: P1
- **Depends On**: Task 6
- **Description**: 
  - 整合现有 character-builder 模块
  - 实现人物 CRUD API
  - 人物图像生成 API
  - 人物一致性管理
  - 人物图像列表管理
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `programmatic` TR-7.1: GET /projects/:id/characters 返回人物列表
  - `programmatic` TR-7.2: POST /characters/:id/generate 触发图像生成
  - `programmatic` TR-7.3: 人物数据正确保存到数据库
  - `human-judgement` TR-7.4: 人物图像生成质量可接受
- **Notes**: 使用任务队列处理图像生成

## [ ] Task 8: 场景构建模块整合
- **Priority**: P1
- **Depends On**: Task 6
- **Description**: 
  - 整合现有 scene-builder 模块
  - 实现场景 CRUD API
  - 场景图像生成 API
  - 场景一致性管理
  - 场景图像列表管理
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `programmatic` TR-8.1: GET /projects/:id/scenes 返回场景列表
  - `programmatic` TR-8.2: POST /scenes/:id/generate 触发图像生成
  - `programmatic` TR-8.3: 场景数据正确保存到数据库
  - `human-judgement` TR-8.4: 场景图像生成质量可接受
- **Notes**: 与人物模块保持一致的架构

## [ ] Task 9: 分镜生成模块整合
- **Priority**: P1
- **Depends On**: Task 6, Task 7, Task 8
- **Description**: 
  - 整合现有 storyboard 模块
  - 实现分镜 CRUD API
  - 自动分镜生成
  - 分镜编辑与预览
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `programmatic` TR-9.1: GET /episodes/:id/storyboards 返回分镜列表
  - `programmatic` TR-9.2: POST /episodes/:id/storyboards 生成分镜
  - `programmatic` TR-9.3: 分镜数据正确保存到数据库
  - `human-judgement` TR-9.4: 分镜内容合理且符合剧情
- **Notes**: 分镜生成需要依赖已分析的人物和场景

## [ ] Task 10: 任务队列系统
- **Priority**: P0
- **Depends On**: Task 4
- **Description**: 
  - 实现 Bull Queue 任务队列
  - 任务状态管理
  - 任务进度跟踪
  - 失败重试机制
  - WebSocket 实时推送
- **Acceptance Criteria Addressed**: [AC-6, AC-9]
- **Test Requirements**:
  - `programmatic` TR-10.1: 任务可以成功加入队列
  - `programmatic` TR-10.2: Worker 可以正确处理任务
  - `programmatic` TR-10.3: 任务状态变化正确记录
  - `programmatic` TR-10.4: 失败任务可以自动重试
  - `programmatic` TR-10.5: WebSocket 正确推送进度更新
- **Notes**: 实现所有 architecture.md 中定义的任务类型

## [ ] Task 11: 视频生成模块整合
- **Priority**: P0
- **Depends On**: Task 9, Task 10
- **Description**: 
  - 整合现有 video-generation 模块
  - 实现视频生成 API
  - 支持可灵 AI 和即梦 AI
  - 视频片段生成与管理
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `programmatic` TR-11.1: POST /videos/generate 触发视频生成任务
  - `programmatic` TR-11.2: 视频生成任务状态可查询
  - `programmatic` TR-11.3: 生成的视频片段保存到 MinIO
  - `human-judgement` TR-11.4: 生成的视频质量可接受
- **Notes**: 单个分镜生成单个视频片段

## [ ] Task 12: 音频处理模块整合
- **Priority**: P1
- **Depends On**: Task 10
- **Description**: 
  - 整合音频处理功能
  - 实现配音合成 API（阿里云语音）
  - 实现字幕自动生成
  - 音频文件管理
- **Acceptance Criteria Addressed**: [AC-7]
- **Test Requirements**:
  - `programmatic` TR-12.1: POST /audios/synthesize 触发配音合成
  - `programmatic` TR-12.2: 生成的音频保存到 MinIO
  - `programmatic` TR-12.3: 字幕文件正确生成
  - `human-judgement` TR-12.4: 配音自然度可接受
- **Notes**: 支持为每个角色选择不同的声音

## [ ] Task 13: 视频合成模块整合
- **Priority**: P0
- **Depends On**: Task 11, Task 12
- **Description**: 
  - 整合现有 video-composite 模块
  - 实现视频合成 API（FFmpeg）
  - 多轨道合成（视频 + 音频 + 字幕 + BGM）
  - 转场效果
  - 视频导出
- **Acceptance Criteria Addressed**: [AC-6, AC-7]
- **Test Requirements**:
  - `programmatic` TR-13.1: POST /compose 触发视频合成任务
  - `programmatic` TR-13.2: 合成后的视频正确保存
  - `programmatic` TR-13.3: 视频包含配音、字幕、BGM
  - `human-judgement` TR-13.4: 合成视频质量良好，音画同步
- **Notes**: 这是最终输出环节，质量至关重要

## [ ] Task 14: 素材库管理 API
- **Priority**: P2
- **Depends On**: Task 4
- **Description**: 
  - 实现素材上传 API
  - 素材分类与标签
  - 素材搜索 API
  - 素材管理（CRUD）
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `programmatic` TR-14.1: POST /materials/upload 成功上传素材
  - `programmatic` TR-14.2: GET /materials 返回素材列表
  - `programmatic` TR-14.3: 素材搜索功能正常
  - `programmatic` TR-14.4: 素材文件保存到 MinIO
- **Notes**: 支持图片、视频、音频等多种素材类型

## [ ] Task 15: 前端基础框架完善
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 完善现有前端项目结构
  - 配置 API 客户端与认证
  - 实现路由守卫
  - 状态管理（Pinia）完善
  - UI 组件库配置
- **Acceptance Criteria Addressed**: [AC-1, AC-9]
- **Test Requirements**:
  - `programmatic` TR-15.1: 前端可以成功启动
  - `programmatic` TR-15.2: API 请求拦截器正确添加 token
  - `programmatic` TR-15.3: 路由守卫正确拦截未登录用户
  - `human-judgement` TR-15.4: UI 样式美观一致
- **Notes**: 基于现有前端框架进行完善

## [ ] Task 16: 前端认证页面
- **Priority**: P0
- **Depends On**: Task 15
- **Description**: 
  - 实现登录页面
  - 实现注册页面
  - 实现用户设置/资料页面
  - 实现登出功能
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-16.1: 用户可以成功登录
  - `programmatic` TR-16.2: 用户可以成功注册
  - `programmatic` TR-16.3: 登录状态持久化
  - `human-judgement` TR-16.4: 页面美观且易用
- **Notes**: 使用 Element Plus 组件

## [ ] Task 17: 前端项目管理页面
- **Priority**: P0
- **Depends On**: Task 15
- **Description**: 
  - 实现项目列表页面
  - 实现项目创建/编辑页面
  - 实现项目详情页面
  - 小说导入功能
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `programmatic` TR-17.1: 项目列表正确显示
  - `programmatic` TR-17.2: 可以创建新项目
  - `programmatic` TR-17.3: 可以编辑项目信息
  - `programmatic` TR-17.4: 小说可以成功导入
- **Notes**: 支持大文本粘贴与文件上传

## [ ] Task 18: 前端故事分析与编辑页面
- **Priority**: P0
- **Depends On**: Task 17
- **Description**: 
  - 实现分析进度显示
  - 实现分集列表页面
  - 实现分集编辑页面
  - 人物列表与编辑
  - 场景列表与编辑
- **Acceptance Criteria Addressed**: [AC-3, AC-4]
- **Test Requirements**:
  - `programmatic` TR-18.1: 分析进度实时显示
  - `programmatic` TR-18.2: 分集列表正确展示
  - `programmatic` TR-18.3: 人物/场景可以编辑
  - `human-judgement` TR-18.4: 界面美观易用
- **Notes**: 使用 WebSocket 实时更新进度

## [ ] Task 19: 前端分镜编辑页面
- **Priority**: P1
- **Depends On**: Task 18
- **Description**: 
  - 实现分镜列表视图
  - 实现分镜详情/编辑页面
  - 分镜预览功能
  - 支持拖拽排序
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `programmatic` TR-19.1: 分镜列表正确展示
  - `programmatic` TR-19.2: 分镜可以编辑
  - `human-judgement` TR-19.3: 分镜预览效果良好
- **Notes**: 支持可视化编辑体验

## [ ] Task 20: 前端视频生成与预览页面
- **Priority**: P0
- **Depends On**: Task 19
- **Description**: 
  - 实现视频生成任务发起
  - 实现生成进度显示
  - 实现视频预览播放器
  - 实现视频下载功能
- **Acceptance Criteria Addressed**: [AC-6, AC-7]
- **Test Requirements**:
  - `programmatic` TR-20.1: 可以发起视频生成任务
  - `programmatic` TR-20.2: 生成进度实时显示
  - `programmatic` TR-20.3: 视频可以正常播放
  - `programmatic` TR-20.4: 视频可以下载
  - `human-judgement` TR-20.5: 播放器界面美观易用
- **Notes**: 使用原生 HTML5 Video 或 hls.js

## [ ] Task 21: 系统集成与端到端测试
- **Priority**: P0
- **Depends On**: Task 13, Task 20
- **Description**: 
  - 完整端到端流程测试
  - 集成测试
  - 性能测试
  - Bug 修复
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9]
- **Test Requirements**:
  - `programmatic` TR-21.1: 从创建项目到导出视频的完整流程可以走通
  - `programmatic` TR-21.2: 所有 API 测试通过
  - `programmatic` TR-21.3: 并发任务测试通过
  - `human-judgement` TR-21.4: 生成的短剧质量可接受
- **Notes**: 这是最后的集成验证，非常关键

## [ ] Task 22: 部署配置与文档
- **Priority**: P1
- **Depends On**: Task 21
- **Description**: 
  - Docker Compose 配置完善
  - Nginx 配置
  - 环境变量配置说明
  - 部署文档编写
  - 使用手册编写
- **Acceptance Criteria Addressed**: [AC-9]
- **Test Requirements**:
  - `programmatic` TR-22.1: Docker Compose 可以一键启动
  - `programmatic` TR-22.2: 生产环境配置正确
  - `human-judgement` TR-22.3: 文档清晰易懂
- **Notes**: 基于现有 architecture.md 中的配置完善
