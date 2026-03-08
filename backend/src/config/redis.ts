import Redis from 'ioredis';

let redis: Redis | null = null;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  redis.on('connect', () => {
    console.log('Redis connected successfully');
  });

  redis.on('error', (err) => {
    console.warn('Redis connection error:', err);
    console.warn('Running in local development mode without Redis');
  });
} catch (error) {
  console.warn('Redis initialization failed:', error);
  console.warn('Running in local development mode without Redis');
  // 创建一个 mock Redis 实例
  redis = {
    ping: async () => Promise.reject(new Error('Redis not available')),
    quit: async () => Promise.resolve(),
    on: () => {},
  } as any;
}

export default redis;
