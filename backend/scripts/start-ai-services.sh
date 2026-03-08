#!/bin/bash

# Phase 3 P4 - AI 生成与视频合成 快速启动脚本

echo "🚀 启动 AI 生成服务..."

# 检查环境变量
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，正在从 .env.example 创建..."
    cp .env.example .env
    echo "❗ 请编辑 .env 文件并配置必要的环境变量"
    exit 1
fi

# 检查 Redis
echo "📊 检查 Redis 连接..."
if ! command -v redis-cli &> /dev/null; then
    echo "❌ Redis 未安装，请先安装 Redis"
    exit 1
fi

if ! redis-cli ping &> /dev/null; then
    echo "❌ Redis 未运行，请启动 Redis 服务"
    exit 1
fi
echo "✅ Redis 连接正常"

# 检查 FFmpeg
echo "🎬 检查 FFmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg 未安装，请先安装 FFmpeg"
    echo "   macOS: brew install ffmpeg"
    echo "   Ubuntu: sudo apt-get install ffmpeg"
    exit 1
fi
echo "✅ FFmpeg 版本：$(ffmpeg -version | head -1)"

# 安装依赖
echo "📦 安装依赖..."
npm install

# 数据库迁移
echo "🗄️  运行数据库迁移..."
npx prisma migrate deploy
npx prisma generate

# 创建存储目录
echo "📁 创建存储目录..."
mkdir -p storage/videos
mkdir -p storage/thumbnails

# 启动服务
echo "🚀 启动服务..."

# 方式 1: 开发模式（支持热重载）
if [ "$1" == "dev" ]; then
    echo "🔧 开发模式启动..."
    npm run dev
else
    # 方式 2: 生产模式
    echo "📦 构建并启动生产环境..."
    npm run build
    npm start
fi
