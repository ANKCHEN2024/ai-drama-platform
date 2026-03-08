# Phase 3 P2 - 快速测试指南

## 🚀 快速开始

### 1. 数据库迁移

```bash
cd backend

# 确保数据库正在运行
# 如果使用 Docker:
docker-compose up -d postgres

# 生成并应用迁移
npx prisma migrate dev --name add_episode_scene_v2

# 生成 Prisma 客户端
npx prisma generate
```

### 2. 启动后端

```bash
cd backend
npm run dev
```

后端将在 http://localhost:3000 启动

### 3. 启动前端

```bash
cd frontend
npm run dev
```

前端将在 http://localhost:5173 启动

## 🧪 手动测试流程

### 测试分集管理

1. **登录系统**
   - 访问 http://localhost:5173/login
   - 使用已有账号或注册新账号

2. **创建/进入项目**
   - 访问项目列表或创建新项目
   - 进入项目详情页

3. **测试分集列表**
   - 点击"分集管理"或访问 `/projects/:id/episodes`
   - 验证分集列表显示正常

4. **创建分集**
   - 点击"新建分集"按钮
   - 填写表单：
     - 集号：1
     - 标题：第一集
     - 描述：测试描述
     - 状态：草稿
   - 点击"创建"
   - 验证分集出现在列表中

5. **编辑分集**
   - 点击分集卡片上的"编辑"按钮
   - 修改标题或状态
   - 点击"保存"
   - 验证修改生效

6. **查看分集详情**
   - 点击"查看详情"按钮
   - 验证分集信息和分镜列表显示正常

7. **创建分镜**
   - 在分集详情页点击"新建分镜"
   - 填写表单：
     - 场号：1
     - 场景：内
     - 时间：日
     - 内容：主角走进房间
     - 对话：你好
     - 时长：30
     - 状态：草稿
   - 点击"创建"
   - 验证分镜出现在列表中

8. **编辑分镜**
   - 点击分镜卡片上的"编辑分镜"按钮
   - 修改内容或状态
   - 点击"保存"
   - 验证修改生效

9. **测试拖拽排序**
   - 创建多个分集/分镜
   - 拖拽卡片改变顺序
   - 验证排序生效

10. **测试删除**
    - 点击分集或分镜的"删除"按钮
    - 确认删除
    - 验证数据被删除
    - 验证删除分集时关联分镜也被删除

## 📋 API 测试（使用 Postman 或 curl）

### 创建分集

```bash
curl -X POST http://localhost:3000/api/projects/1/episodes \
  -H "Content-Type: application/json" \
  -d '{
    "number": 1,
    "title": "第一集",
    "description": "测试分集",
    "status": "draft"
  }'
```

### 获取分集列表

```bash
curl http://localhost:3000/api/projects/1/episodes
```

### 获取分集详情

```bash
curl http://localhost:3000/api/episodes/1
```

### 更新分集

```bash
curl -X PUT http://localhost:3000/api/episodes/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题",
    "status": "recording"
  }'
```

### 创建分镜

```bash
curl -X POST http://localhost:3000/api/episodes/1/scenes \
  -H "Content-Type: application/json" \
  -d '{
    "number": 1,
    "location": "内",
    "timeOfDay": "日",
    "content": "主角走进房间",
    "dialogue": "你好",
    "duration": 30,
    "status": "draft"
  }'
```

### 获取分镜列表

```bash
curl http://localhost:3000/api/episodes/1/scenes
```

### 更新分镜

```bash
curl -X PUT http://localhost:3000/api/scenes/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "filming"
  }'
```

### 删除分镜

```bash
curl -X DELETE http://localhost:3000/api/scenes/1
```

### 删除分集

```bash
curl -X DELETE http://localhost:3000/api/episodes/1
```

## ✅ 验收标准

- [ ] TypeScript 编译通过
- [ ] 前端构建通过
- [ ] 后端构建通过
- [ ] ESLint 通过
- [ ] 所有 API 端点正常工作
- [ ] 前端页面正常渲染
- [ ] 分集/分镜可以正常 CRUD
- [ ] 删除分集时关联分镜被级联删除
- [ ] 拖拽排序功能正常
- [ ] 状态管理正常
- [ ] 错误处理正常（404、400 等）

## 🐛 已知问题

暂无

## 📝 备注

- 分集和分镜的 reorder 端点已实现基础逻辑，完整的多项拖拽排序可进一步优化
- 前端使用 vuedraggable 实现拖拽功能，需要确保已安装依赖：`npm install vuedraggable`
