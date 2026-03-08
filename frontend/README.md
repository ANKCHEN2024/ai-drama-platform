# AI 短剧生成平台 - 前端

基于 Vue3 + Element Plus 的现代化 Web 前端界面。

## 技术栈

- **框架**: Vue 3.4+
- **构建工具**: Vite 5+
- **UI 组件**: Element Plus 2.5+
- **状态管理**: Pinia 2.1+
- **路由**: Vue Router 4.2+
- **HTTP 客户端**: Axios 1.6+
- **CSS 预处理器**: Sass

## 功能模块

### 页面结构

1. **首页 (Home)**
   - 数据统计卡片
   - 快捷操作入口
   - 最近项目列表

2. **创作页面 (Create)**
   - 5 步创作流程
   - 小说上传/粘贴
   - AI 故事分析
   - 人物设定管理
   - 分镜生成
   - 项目创建确认

3. **项目管理 (Projects)**
   - 项目列表展示
   - 搜索和筛选
   - 项目状态管理
   - 删除/编辑功能

4. **预览页面 (Preview)**
   - 视频播放器
   - 剧集列表
   - 项目信息展示
   - 人物和分镜预览

### API 对接

已封装的 API 模块：

- `src/api/index.js` - HTTP 请求基础配置
- `src/api/project.js` - 项目管理接口
- `src/api/story.js` - 故事分析接口
- `src/api/video.js` - 视频生成接口

### 状态管理

- `src/stores/project.js` - 项目状态
- `src/stores/story.js` - 故事分析状态

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入实际的 API Key
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
frontend/
├── public/              # 静态资源
├── src/
│   ├── api/            # API 接口
│   │   ├── index.js
│   │   ├── project.js
│   │   ├── story.js
│   │   └── video.js
│   ├── components/     # 公共组件
│   │   └── Layout.vue
│   ├── router/         # 路由配置
│   │   └── index.js
│   ├── stores/         # Pinia 状态管理
│   │   ├── project.js
│   │   └── story.js
│   ├── styles/         # 全局样式
│   │   ├── variables.scss
│   │   └── global.scss
│   ├── views/          # 页面组件
│   │   ├── Home.vue
│   │   ├── Create.vue
│   │   ├── Projects.vue
│   │   └── Preview.vue
│   ├── App.vue         # 根组件
│   └── main.js         # 入口文件
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 响应式设计

- **桌面端**: ≥1440px
- **平板端**: 1024px - 1439px
- **移动端**: ≤1023px

使用 Element Plus 的栅格系统和自定义媒体查询实现响应式布局。

## API 对接说明

### 后端接口地址

开发环境：`http://localhost:8080/api`

### 接口规范

所有接口遵循 RESTful 风格，返回格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

### 主要接口

#### 项目相关
- `GET /projects` - 获取项目列表
- `POST /projects` - 创建项目
- `GET /projects/:id` - 获取项目详情
- `PUT /projects/:id` - 更新项目
- `DELETE /projects/:id` - 删除项目
- `POST /projects/:id/generate` - 开始生成

#### 故事相关
- `POST /story/analyze` - 分析小说
- `GET /story/:id/episodes` - 获取分集
- `POST /story/:id/characters` - 提取人物
- `POST /story/:id/episodes/:eid/storyboard` - 生成分镜

#### 视频相关
- `POST /video/generate` - 生成视频
- `GET /videos` - 获取视频列表
- `POST /video/compose` - 合成视频
- `GET /videos/:id/download` - 下载视频

## 开发规范

1. 使用 Composition API (`<script setup>`)
2. 组件采用 PascalCase 命名
3. 文件命名与组件名一致
4. 使用 SCSS 编写样式
5. 遵循 Element Plus 设计规范

## 浏览器支持

- Chrome ≥ 90
- Firefox ≥ 88
- Safari ≥ 14
- Edge ≥ 90

## License

MIT
