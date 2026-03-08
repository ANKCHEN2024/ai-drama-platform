# 部署指南

## 开发环境部署

### 1. 安装 Node.js

确保安装 Node.js 18+ 版本：

```bash
node -v  # 应显示 v18.x.x 或更高
```

### 2. 安装依赖

```bash
cd /Users/chenggl/workspace/ai-drama-platform/frontend
npm install
```

### 3. 配置环境

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入实际的 API Key。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 生产环境部署

### 方案一：Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

构建并运行：

```bash
docker build -t ai-drama-frontend .
docker run -p 80:80 ai-drama-frontend
```

### 方案二：Nginx 部署

1. 构建生产版本：

```bash
npm run build
```

2. 配置 Nginx：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

3. 重启 Nginx：

```bash
sudo nginx -s reload
```

### 方案三：Vercel 部署

1. 安装 Vercel CLI：

```bash
npm i -g vercel
```

2. 部署：

```bash
vercel
```

按照提示完成部署。

## 性能优化建议

1. **代码分割**: 路由级别按需加载
2. **图片优化**: 使用 WebP 格式，添加懒加载
3. **CDN 加速**: 将静态资源托管到 CDN
4. **Gzip 压缩**: 启用 Nginx Gzip 压缩
5. **缓存策略**: 配置合理的缓存头

## 监控与日志

建议集成：

- Sentry - 错误监控
- Google Analytics - 访问统计
- 自定义日志 - 关键操作记录

## 安全建议

1. 启用 HTTPS
2. 配置 CSP (Content Security Policy)
3. 定期更新依赖
4. 使用环境变量存储敏感信息
5. 实施 API 限流
