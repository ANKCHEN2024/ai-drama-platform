export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
  timestamp: string;
}

export function successResponse<T>(data: T, message: string = '操作成功'): ApiResponse<T> {
  return {
    code: 200,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(code: number = 500, message: string = '操作失败'): ApiResponse<null> {
  return {
    code,
    message,
    data: null,
    timestamp: new Date().toISOString(),
  };
}

export function createdResponse<T>(data: T, message: string = '创建成功'): ApiResponse<T> {
  return {
    code: 201,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}
