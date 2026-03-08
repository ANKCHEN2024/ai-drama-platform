# ==============================================
# AI 短剧平台 2.0 - 前端 Dockerfile
# ==============================================

# 多阶段构建：第一阶段 - 构建
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 接收构建参数作为环境变量
ARG VITE_API_BASE_URL
ARG VITE_WS_URL

# 设置环境变量
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

# 构建应用
RUN npm run build

# ==============================================
# 第二阶段 - Nginx 服务
# ==============================================
FROM nginx:alpine AS production

# 复制 Nginx 配置（可选，如需要自定义）
# COPY nginx.conf /etc/nginx/nginx.conf

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
