import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';
import logger from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handlePrismaError = (err: any): AppError => {
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || '字段';
    return new AppError(`${field} 已存在`, 409);
  }
  if (err.code === 'P2025') {
    return new AppError('记录不存在', 404);
  }
  if (err.code === 'P2003') {
    return new AppError('关联的记录不存在', 400);
  }
  return new AppError('数据库错误', 500);
};

const handleJWTError = (err: any): AppError => {
  if (err.name === 'JsonWebTokenError') {
    return new AppError('无效的 Token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return new AppError('Token 已过期', 401);
  }
  return new AppError('认证错误', 401);
};

const handleZodError = (err: any): AppError => {
  const messages = err.issues?.map((issue: any) => 
    `${issue.path.join('.')}: ${issue.message}`
  ).join(', ');
  return new AppError(`参数验证失败: ${messages}`, 400);
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;

  if (!error.isOperational) {
    if (error.code?.startsWith('P2')) {
      error = handlePrismaError(error);
    } else if (error.name?.includes('JsonWebToken')) {
      error = handleJWTError(error);
    } else if (error.name === 'ZodError') {
      error = handleZodError(error);
    } else {
      error = new AppError(error.message || '服务器内部错误', error.statusCode || 500);
    }
  }

  const logMessage = `${error.statusCode} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`;
  
  if (error.statusCode >= 500) {
    logger.error(logMessage, { error: err.stack || err });
  } else if (error.statusCode >= 400) {
    logger.warn(logMessage);
  }

  res.status(error.statusCode).json(
    errorResponse(error.statusCode, error.message)
  );
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`找不到请求的路径: ${req.originalUrl}`, 404);
  next(error);
};

