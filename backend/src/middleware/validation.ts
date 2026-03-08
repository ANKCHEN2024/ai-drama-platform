import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { errorResponse } from '../utils/response';

type ValidationTarget = 'body' | 'params' | 'query';

export const validateRequest = <T extends z.ZodTypeAny>(
  schema: T,
  target: ValidationTarget = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const validatedData = schema.parse(data);
      
      (req as any)[`validated${target.charAt(0).toUpperCase() + target.slice(1)}`] = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // @ts-ignore - Zod v4 API change
        const errors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json(errorResponse(400, '请求参数验证失败'));
      }
      next(error);
    }
  };
};

export const validateBody = <T extends z.ZodTypeAny>(schema: T) => 
  validateRequest(schema, 'body');

export const validateParams = <T extends z.ZodTypeAny>(schema: T) => 
  validateRequest(schema, 'params');

export const validateQuery = <T extends z.ZodTypeAny>(schema: T) => 
  validateRequest(schema, 'query');
