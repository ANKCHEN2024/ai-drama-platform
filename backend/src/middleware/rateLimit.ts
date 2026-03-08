import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../config/redis';

export const createRateLimiter = (
  windowMs: number = 15 * 60 * 1000,
  max: number = 100,
  message: string = '请求过于频繁，请稍后再试',
  keyPrefix: string = 'rate-limit:'
) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // 在开发模式下跳过限流，或健康检查跳过
      return process.env.NODE_ENV === 'test' || req.path.includes('/health');
    },
  });
};

export const globalLimiter = createRateLimiter(
  15 * 60 * 1000,
  100,
  '请求过于频繁，请稍后再试'
);

export const strictLimiter = createRateLimiter(
  15 * 60 * 1000,
  10,
  '操作过于频繁，请稍后再试',
  'rate-limit:strict:'
);

export const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  '登录尝试过于频繁，请稍后再试',
  'rate-limit:auth:'
);
