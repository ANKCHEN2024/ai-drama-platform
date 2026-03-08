import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import expressWinston from 'express-winston';
import { errorHandler, notFound } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimit';
import prisma from './config/database';
import redis from './config/redis';
import { ensureBucketExists } from './config/minio';
import logger from './utils/logger';
// 延迟导入路由，避免启动时 Redis 连接失败
let routes: express.Router;

try {
  routes = require('./routes').default;
  console.log('Routes initialized successfully');
} catch (error) {
  console.warn('Failed to initialize routes:', error);
  console.warn('Running in local development mode with minimal routes');
  // 创建一个最小的路由，只提供健康检查
  routes = express.Router();
  routes.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Running in local development mode',
      timestamp: new Date().toISOString()
    });
  });
}
import { initWebSocketServer, closeWebSocketServer } from './websocket';

// 延迟导入队列，避免启动时 Redis 连接失败
let closeAllQueues: () => Promise<void>;
let getQueueStats: () => Promise<any>;
let queuesInitialized = false;

try {
  const queueModule = require('./queues');
  closeAllQueues = queueModule.closeAllQueues;
  getQueueStats = queueModule.getQueueStats;
  queuesInitialized = true;
  console.log('Queues initialized successfully');
} catch (error) {
  console.warn('Failed to initialize queues:', error);
  console.warn('Running in local development mode without queues');
  closeAllQueues = async () => { /* no-op */ };
  getQueueStats = async () => ({ message: 'Queues not available in local development mode' });
  queuesInitialized = false;
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: process.env.NODE_ENV !== 'production',
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use(globalLimiter);

app.use('/api', routes);

app.use(notFound);
app.use(expressWinston.errorLogger({
  winstonInstance: logger,
}));
app.use(errorHandler);

async function startServer() {
  console.log('Starting server initialization...');
  console.log(`Using port: ${PORT}`);
  try {
    // 直接启动服务器，跳过所有外部服务的连接尝试
    console.log('Skipping external service connections for local development');
    console.log('Attempting to start server...');
    console.log(`Server will listen on port: ${PORT}`);
    
    server.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
      console.log('✅ Running in local development mode');
    }).on('error', (error) => {
      console.error('❌ Server failed to start:', error);
      process.exit(1);
    });
    
    console.log('Server listen called, waiting for connection...');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  try {
    await closeWebSocketServer();
  } catch (wsError) {
    console.warn('Error closing WebSocket server:', wsError);
  }
  try {
    await closeAllQueues();
  } catch (queueError) {
    console.warn('Error closing queues:', queueError);
  }
  try {
    await prisma.$disconnect();
  } catch (dbError) {
    console.warn('Error disconnecting from database:', dbError);
  }
  try {
    if (redis) {
      await redis.quit();
    }
  } catch (redisError) {
    console.warn('Error closing Redis connection:', redisError);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  try {
    await closeWebSocketServer();
  } catch (wsError) {
    console.warn('Error closing WebSocket server:', wsError);
  }
  try {
    await closeAllQueues();
  } catch (queueError) {
    console.warn('Error closing queues:', queueError);
  }
  try {
    await prisma.$disconnect();
  } catch (dbError) {
    console.warn('Error disconnecting from database:', dbError);
  }
  try {
    if (redis) {
      await redis.quit();
    }
  } catch (redisError) {
    console.warn('Error closing Redis connection:', redisError);
  }
  process.exit(0);
});

startServer();

export default app;
