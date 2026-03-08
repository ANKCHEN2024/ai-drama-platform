/**
 * 日志记录器
 */

import winston from 'winston';

export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string, level: string = 'info') {
    this.context = context;
    
    this.logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: { service: 'video-generator', context },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, context, message, ...meta }) => {
              const ctx = context || this.context;
              return `${timestamp} [${level}] [${ctx}]: ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta) : ''
              }`;
            })
          ),
        }),
      ],
    });
  }

  debug(message: string, ...meta: any[]) {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  info(message: string, ...meta: any[]) {
    this.logger.info(message, { context: this.context, ...meta });
  }

  warn(message: string, ...meta: any[]) {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  error(message: string, ...meta: any[]) {
    this.logger.error(message, { context: this.context, ...meta });
  }

  /**
   * 创建子日志记录器（添加额外上下文）
   */
  child(childContext: string): Logger {
    const newLogger = new Logger(`${this.context}:${childContext}`);
    return newLogger;
  }
}
