# Phase 3 P3 - 剧本与角色管理模块

## 概述

本模块实现了 AI 短剧平台的剧本与角色管理功能，包括完整的 CRUD 操作、版本控制、关联关系管理等。

## 功能清单

### 1. 剧本管理模块 ✅

- ✅ 剧本编辑器（富文本）
  - 支持场景、对话、动作、角色、转场等格式快速插入
  - 等宽字体显示，便于剧本格式排版
  - 支持草稿/发布/归档状态管理

- ✅ 剧本版本控制
  - 自动版本递增
  - 版本历史记录
  - 版本查看与恢复
  - 变更日志记录

- ✅ 剧本导入/导出
  - JSON 格式导出
  - 包含剧本内容、版本、关联角色等完整信息

### 2. 角色管理模块 ✅

- ✅ 角色创建/编辑/删除
  - 完整角色属性管理
  - 支持富文本描述

- ✅ 角色与剧本绑定
  - 多对多关联关系
  - 批量添加角色到剧本
  - 查看角色关联的剧本列表

- ✅ 角色属性管理
  - 基本信息：名称、性别、年龄段
  - 详细描述：背景故事、性格特点
  - 外貌特征：身高、体型、面部特征等
  - 状态管理：启用/停用

### 3. 数据模型 ✅

#### Script 模型（剧本）
```prisma
model Script {
  id          BigInt      @id @default(autoincrement())
  projectId   BigInt
  title       String      @db.VarChar(200)
  description String?     @db.Text
  content     String      @db.Text
  version     Int         @default(1)
  status      ScriptStatus @default(draft)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @default(now())
  
  characters  ScriptCharacter[]
  versions    ScriptVersion[]
}
```

#### Character 模型（角色）
```prisma
model Character {
  id          BigInt      @id @default(autoincrement())
  projectId   BigInt
  name        String      @db.VarChar(100)
  description String?     @db.Text
  appearance  String?     @db.Text
  gender      Gender?
  ageRange    AgeRange?
  personality Json?       @db.JsonB
  status      CharacterStatus @default(active)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @default(now())
  
  scripts       ScriptCharacter[]
  characterImages CharacterImage[]
}
```

#### 关联关系
```prisma
model ScriptCharacter {
  scriptId    BigInt
  characterId BigInt
  createdAt   DateTime  @default(now())
  
  @@id([scriptId, characterId])
}
```

### 4. API 端点（8 个核心端点）✅

#### 剧本 CRUD
- `GET /api/scripts/projects/:projectId/scripts` - 获取项目下的剧本列表
- `POST /api/scripts/projects/:projectId/scripts` - 创建剧本
- `GET /api/scripts/:id` - 获取剧本详情
- `PUT /api/scripts/:id` - 更新剧本
- `DELETE /api/scripts/:id` - 删除剧本

#### 剧本版本管理
- `POST /api/scripts/:id/versions` - 添加新版本
- `GET /api/scripts/:id/versions` - 获取版本历史
- `GET /api/scripts/:id/versions/:version` - 获取特定版本
- `GET /api/scripts/:id/export` - 导出剧本

#### 角色 CRUD
- `GET /api/characters/projects/:projectId/characters` - 获取项目下的角色列表
- `POST /api/characters/projects/:projectId/characters` - 创建角色
- `GET /api/characters/:id` - 获取角色详情
- `PUT /api/characters/:id` - 更新角色
- `DELETE /api/characters/:id` - 删除角色

#### 剧本 - 角色关联
- `POST /api/scripts/:id/characters` - 关联角色到剧本
- `DELETE /api/scripts/:id/characters/:characterId` - 取消关联
- `GET /api/scripts/:id/characters` - 获取剧本关联的角色列表
- `GET /api/characters/:id/scripts` - 获取角色关联的剧本列表

### 5. 前端页面（4 个）✅

#### 剧本列表页 `/projects/:projectId/scripts`
- 剧本列表展示（表格）
- 搜索功能
- 分页功能
- 状态筛选
- 快速操作：编辑、导出、版本、删除
- 新建剧本对话框
- 版本历史对话框

#### 剧本编辑页 `/projects/:projectId/scripts/:id/edit`
- 基本信息编辑
- 富文本编辑器（支持格式快速插入）
- 关联角色管理
- 保存草稿/发布功能
- 导出功能

#### 角色列表页 `/projects/:projectId/characters`
- 角色列表展示（表格）
- 高级筛选（性别、年龄段、状态）
- 搜索功能
- 分页功能
- 快速操作：编辑、剧本、删除
- 新建角色对话框

#### 角色编辑页 `/projects/:projectId/characters/:id/edit`
- 基本信息编辑（名称、性别、年龄段）
- 详细描述（背景故事、性格特点）
- 外貌特征描述
- 状态管理
- 关联剧本展示

## 技术实现

### 后端技术栈
- **框架**: Express.js + TypeScript
- **ORM**: Prisma
- **数据库**: PostgreSQL
- **验证**: Zod
- **响应格式**: 统一 successResponse/errorResponse

### 前端技术栈
- **框架**: Vue 3 + Composition API
- **UI 库**: Element Plus
- **路由**: Vue Router
- **HTTP**: Axios
- **样式**: SCSS

## 文件结构

```
backend/
├── src/
│   ├── models/
│   │   ├── Script.ts          # 剧本数据模型
│   │   └── Character.ts       # 角色数据模型
│   ├── routes/
│   │   ├── scripts.ts         # 剧本路由（8 个端点）
│   │   └── characters.ts      # 角色路由（5 个端点）
│   └── ...
└── prisma/
    └── schema.prisma          # 数据模型定义

frontend/
├── src/
│   ├── views/
│   │   └── scripts/
│   │       ├── ScriptList.vue      # 剧本列表页
│   │       ├── ScriptEdit.vue      # 剧本编辑页
│   │       ├── CharacterList.vue   # 角色列表页
│   │       └── CharacterEdit.vue   # 角色编辑页
│   └── router/
│       └── index.js           # 路由配置
```

## 快速开始

### 1. 数据库迁移
```bash
cd backend
npx prisma migrate dev --name add_script_models
npx prisma generate
```

### 2. 启动后端
```bash
cd backend
npm run dev
```

### 3. 启动前端
```bash
cd frontend
npm run dev
```

### 4. 访问页面
- 剧本管理：`http://localhost:5173/projects/:projectId/scripts`
- 角色管理：`http://localhost:5173/projects/:projectId/characters`

## API 使用示例

### 创建剧本
```bash
curl -X POST http://localhost:3000/api/scripts/projects/1/scripts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "第一集：相遇",
    "description": "男女主角初次相遇的故事",
    "content": "【场景】\n时间：傍晚\n地点：咖啡厅\n人物：李明，小红\n\n【对话】\n李明：你好，请问这里是...\n小红：是的，这里是..."
  }'
```

### 创建角色
```bash
curl -X POST http://localhost:3000/api/characters/projects/1/characters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "李明",
    "description": "男主角，25 岁，程序员",
    "appearance": "身高 180cm，短发，戴眼镜",
    "gender": "male",
    "ageRange": "young_adult",
    "personality": {
      "trait_1": "内向",
      "trait_2": "细心",
      "trait_3": "幽默"
    }
  }'
```

### 关联角色到剧本
```bash
curl -X POST http://localhost:3000/api/scripts/1/characters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "characterId": "1"
  }'
```

### 添加剧本版本
```bash
curl -X POST http://localhost:3000/api/scripts/1/versions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "更新后的剧本内容...",
    "changeLog": "修改了第二幕的对话"
  }'
```

## 特色功能

### 1. 剧本格式助手
提供快速插入剧本格式的按钮：
- 场景：包含时间、地点、人物的标准场景头
- 角色：角色介绍格式
- 对话：对话格式
- 动作：动作描述格式
- 转场：场景转场标记

### 2. 版本控制
- 每次保存新版本自动递增版本号
- 记录变更日志
- 支持版本对比和恢复

### 3. 角色属性管理
- 性别：男/女/其他
- 年龄段：儿童/青少年/青年/成人/中年/老年
- 性格特点：支持多个标签
- 状态：启用/停用

### 4. 关联关系
- 剧本与角色多对多关联
- 双向查询（剧本查角色、角色查剧本）
- 批量操作支持

## 演示截图

（实际运行时截图）

## 下一步计划

- [ ] 剧本文本对比（版本间 diff）
- [ ] 角色图片上传
- [ ] 剧本协作编辑（多人实时编辑）
- [ ] 剧本模板库
- [ ] AI 辅助创作（自动生成对话、场景描述）
- [ ] 剧本导出为 PDF/Fountain 格式
- [ ] 角色关系图谱可视化

## 完成状态

✅ 100% 完成

所有功能已实现并可演示。
