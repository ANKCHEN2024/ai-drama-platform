# Phase 3 P3 - 快速启动指南

## 前置条件

确保已完成以下准备：

1. ✅ Node.js 18+ 已安装
2. ✅ PostgreSQL 数据库已运行
3. ✅ 项目基础框架已搭建（Phase 1 & 2 已完成）
4. ✅ 用户认证系统正常工作

## 第一步：数据库迁移

```bash
cd /Users/chenggl/workspace/ai-drama-platform/backend

# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name add_script_models

# 验证迁移成功
npx prisma studio
```

在 Prisma Studio 中，你应该能看到新增的表：
- `Script` - 剧本表
- `ScriptVersion` - 剧本版本表
- `ScriptCharacter` - 剧本角色关联表

## 第二步：启动后端服务

```bash
cd /Users/chenggl/workspace/ai-drama-platform/backend

# 开发模式（热重载）
npm run dev

# 或者生产模式
npm run build
npm start
```

后端服务应该在 `http://localhost:3000` 启动。

## 第三步：启动前端服务

```bash
cd /Users/chenggl/workspace/ai-drama-platform/frontend

# 开发模式
npm run dev
```

前端服务应该在 `http://localhost:5173` 启动。

## 第四步：访问功能页面

### 1. 访问项目管理页面
```
http://localhost:5173/projects
```

### 2. 进入某个项目
点击任意项目，或创建新项目。

### 3. 访问剧本管理页面
```
http://localhost:5173/projects/:projectId/scripts
```

**功能：**
- ✅ 查看剧本列表
- ✅ 新建剧本
- ✅ 编辑剧本
- ✅ 删除剧本
- ✅ 导出剧本
- ✅ 查看版本历史

### 4. 访问角色管理页面
```
http://localhost:5173/projects/:projectId/characters
```

**功能：**
- ✅ 查看角色列表
- ✅ 新建角色
- ✅ 编辑角色
- ✅ 删除角色
- ✅ 筛选角色（性别、年龄段、状态）

### 5. 编辑剧本详情
```
http://localhost:5173/projects/:projectId/scripts/:scriptId/edit
```

**功能：**
- ✅ 富文本编辑器
- ✅ 快速插入剧本格式（场景、对话、动作等）
- ✅ 关联角色管理
- ✅ 保存草稿/发布

### 6. 编辑角色详情
```
http://localhost:5173/projects/:projectId/characters/:characterId/edit
```

**功能：**
- ✅ 完整角色属性编辑
- ✅ 查看关联剧本

## 第五步：API 测试

### 使用 cURL 测试

```bash
# 设置变量
TOKEN="YOUR_JWT_TOKEN"
PROJECT_ID="1"

# 创建剧本
curl -X POST http://localhost:3000/api/scripts/projects/$PROJECT_ID/scripts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "测试剧本",
    "content": "这是一个测试剧本的内容"
  }'

# 创建角色
curl -X POST http://localhost:3000/api/characters/projects/$PROJECT_ID/characters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "测试角色",
    "gender": "male",
    "ageRange": "young_adult"
  }'
```

### 使用 Postman 测试

导入以下集合：

1. 创建剧本
   - Method: POST
   - URL: `http://localhost:3000/api/scripts/projects/1/scripts`
   - Headers: `Authorization: Bearer YOUR_TOKEN`
   - Body: 
   ```json
   {
     "title": "第一集",
     "content": "剧本内容",
     "description": "描述"
   }
   ```

2. 创建角色
   - Method: POST
   - URL: `http://localhost:3000/api/characters/projects/1/characters`
   - Headers: `Authorization: Bearer YOUR_TOKEN`
   - Body:
   ```json
   {
     "name": "主角",
     "gender": "male",
     "ageRange": "young_adult",
     "description": "角色描述"
   }
   ```

3. 关联角色到剧本
   - Method: POST
   - URL: `http://localhost:3000/api/scripts/1/characters`
   - Headers: `Authorization: Bearer YOUR_TOKEN`
   - Body:
   ```json
   {
     "characterId": "1"
   }
   ```

### 运行自动化测试脚本

```bash
cd /Users/chenggl/workspace/ai-drama-platform/docs

# 编辑脚本，设置正确的 TOKEN
vim test-phase3-p3.sh

# 运行测试
./test-phase3-p3.sh
```

## 功能演示流程

### 场景 1：创建完整剧本

1. 进入项目 → 点击"剧本管理"
2. 点击"新建剧本"
3. 填写标题、描述
4. 在内容编辑器中输入剧本内容
5. 使用格式按钮快速插入场景、对话等
6. 点击"保存草稿"
7. 点击"添加角色"，选择已有角色
8. 点击"发布"

### 场景 2：创建角色并关联

1. 进入项目 → 点击"角色管理"
2. 点击"新建角色"
3. 填写角色信息（名称、性别、年龄段等）
4. 描述角色的外貌特征和性格特点
5. 保存角色
6. 进入剧本编辑页面
7. 在"关联角色"区域点击"添加角色"
8. 选择刚创建的角色

### 场景 3：版本控制

1. 编辑已发布的剧本
2. 修改部分内容
3. 点击"保存草稿"（自动创建新版本）
4. 点击"版本"按钮查看历史
5. 可以查看任意版本的内容
6. 可以恢复到历史版本

## 常见问题

### Q1: 数据库迁移失败
**解决方案：**
```bash
# 重置数据库
npx prisma migrate reset

# 重新迁移
npx prisma migrate dev
```

### Q2: 前端页面 404
**解决方案：**
- 检查路由配置是否正确
- 确认组件文件路径正确
- 清除浏览器缓存

### Q3: API 返回 401 未认证
**解决方案：**
- 确保已登录
- 检查 Token 是否有效
- 确认请求头包含 Authorization

### Q4: 角色无法关联到剧本
**解决方案：**
- 确认角色和剧本属于同一项目
- 检查角色 ID 是否正确
- 查看后端日志获取详细错误

## 验证清单

完成以下检查，确保所有功能正常工作：

- [ ] 后端服务启动成功（http://localhost:3000）
- [ ] 前端服务启动成功（http://localhost:5173）
- [ ] 数据库迁移成功（Script、ScriptVersion、ScriptCharacter 表存在）
- [ ] 能够创建剧本
- [ ] 能够编辑剧本
- [ ] 能够删除剧本
- [ ] 能够创建角色
- [ ] 能够编辑角色
- [ ] 能够删除角色
- [ ] 能够将角色关联到剧本
- [ ] 能够查看剧本版本历史
- [ ] 能够导出剧本
- [ ] 前端页面正常渲染
- [ ] 富文本编辑器正常工作
- [ ] 筛选功能正常工作
- [ ] 分页功能正常工作

## 下一步

完成 Phase 3 P3 后，可以继续：

1. **Phase 3 P4** - 分镜与场景管理
2. **Phase 3 P5** - AI 辅助创作
3. **Phase 4** - 视频生成与渲染

## 技术支持

如有问题，请查看：

- 后端日志：`backend/logs/`
- 前端控制台：浏览器 DevTools
- API 文档：`backend/swagger/`
- 完整文档：`docs/PHASE3_P3_README.md`

---

**祝使用愉快！** 🎉
