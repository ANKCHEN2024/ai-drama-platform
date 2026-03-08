# 快速启动指南

## 第一步：安装依赖

```bash
cd /Users/chenggl/workspace/ai-drama-platform/frontend
npm install
```

预计耗时：1-2 分钟（取决于网络）

## 第二步：配置环境（可选）

如果是开发环境，可以跳过此步。

如果需要连接实际后端服务：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入实际的 API 地址和 Key。

## 第三步：启动开发服务器

```bash
npm run dev
```

启动成功后会显示：

```
  VITE v5.0.10  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

## 第四步：访问应用

在浏览器中打开：**http://localhost:3000**

## 页面导航

- **首页**: http://localhost:3000/
- **创作**: http://localhost:3000/create
- **项目**: http://localhost:3000/projects
- **预览**: http://localhost:3000/preview/1

## 开发服务器命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint
```

## 常见问题

### 端口被占用

如果 3000 端口被占用，Vite 会自动使用 3001 或其他端口。

或者手动指定：

```bash
npm run dev -- --port 8080
```

### 依赖安装失败

尝试清理缓存后重新安装：

```bash
rm -rf node_modules package-lock.json
npm install
```

### 热更新不工作

检查 Vite 配置，确保没有禁用 HMR。

## 后端服务

前端默认代理到 `http://localhost:8080/api`

确保后端服务在 8080 端口运行，或者修改 `vite.config.js` 中的代理配置。

## 浏览器推荐

- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

---

**提示**: 首次启动可能需要安装 Node.js 18+ 版本。
