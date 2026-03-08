/**
 * 视频生成模块类型定义
 */

// ==================== 任务状态 ====================

export type TaskStatus = 
  | 'pending'      // 等待中
  | 'processing'   // 处理中
  | 'completed'    // 已完成
  | 'failed'       // 失败
  | 'cancelled';   // 已取消

export type TaskPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type APIProvider = 'keling' | 'jimeng';

// ==================== 错误类型 ====================

export enum ErrorType {
  // 可重试错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_TIMEOUT = 'API_TIMEOUT',
  API_SERVER_ERROR = 'API_SERVER_ERROR',
  
  // 不可重试错误
  INVALID_INPUT = 'INVALID_INPUT',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  CONTENT_VIOLATION = 'CONTENT_VIOLATION',
  PROVIDER_SWITCH_FAILED = 'PROVIDER_SWITCH_FAILED',
}

export class VideoGeneratorError extends Error {
  constructor(
    message: string,
    public readonly type: ErrorType,
    public readonly retryable: boolean = false,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'VideoGeneratorError';
  }
}

// ==================== 视频输入参数 ====================

export interface ReferenceImages {
  character?: string;  // 人物参考图 URL
  scene?: string;      // 场景参考图 URL
}

export interface VideoParameters {
  duration?: 5 | 10;           // 视频时长（秒）
  resolution?: '720p' | '1080p';
  motion_strength?: number;    // 运动强度 1-10
  style?: string;              // 视频风格
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  seed?: number;               // 随机种子
  negative_prompt?: string;    // 负面描述
}

export interface VideoInput {
  // 必填
  scene_description: string;       // 场景描述
  character_description: string;   // 人物描述
  action_description: string;      // 动作描述
  
  // 可选
  reference_images?: ReferenceImages;
  parameters?: VideoParameters;
  
  // 回调
  callbacks?: {
    on_progress?: string;  // Webhook URL
    on_complete?: string;
    on_error?: string;
  };
  
  // 元数据
  metadata?: {
    project_id?: string;
    episode_id?: string;
    scene_id?: string;
  };
}

// ==================== 任务定义 ====================

export interface VideoTask {
  id: string;
  type: 'single' | 'batch';
  priority: TaskPriority;
  status: TaskStatus;
  
  // 输入参数
  input: VideoInput;
  
  // 进度追踪
  progress: {
    current_step: string;
    percentage: number;
    estimated_remaining?: number;  // 预估剩余时间（秒）
  };
  
  // 结果
  output?: VideoOutput;
  
  // 元数据
  metadata: {
    created_at: number;
    started_at?: number;
    completed_at?: number;
    retry_count: number;
    api_provider: APIProvider;
    external_task_id?: string;  // 外部 API 任务 ID
  };
  
  // 回调
  callbacks?: {
    on_progress?: string;
    on_complete?: string;
    on_error?: string;
  };
}

export interface VideoOutput {
  video_url: string;
  cover_url: string;
  duration: number;
  resolution: string;
  file_size?: number;
  format?: string;
}

// ==================== API 响应 ====================

export interface KelingVideoRequest {
  prompt: string;
  negative_prompt?: string;
  reference_image?: string;
  reference_type?: 'character' | 'scene' | 'both';
  duration?: 5 | 10;
  resolution?: '720p' | '1080p';
  motion_strength?: number;
  seed?: number;
}

export interface KelingVideoResponse {
  code: number;
  message: string;
  data: {
    task_id: string;
    status: TaskStatus;
    progress: number;
    video_url?: string;
    cover_url?: string;
    error_message?: string;
  };
}

export interface JimengVideoRequest {
  prompt: string;
  image_prompt?: string;
  video_style?: string;
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  duration?: number;
}

export interface JimengVideoResponse {
  code: number;
  message: string;
  data: {
    task_id: string;
    status: TaskStatus;
    progress: number;
    video_url?: string;
    cover_url?: string;
    error_message?: string;
  };
}

// ==================== API 响应封装 ====================

export interface TaskResponse {
  task_id: string;
  status: TaskStatus;
  message: string;
}

export interface BatchTaskResponse {
  task_ids: string[];
  status: TaskStatus;
  message: string;
}

export interface ProgressResponse {
  task_id: string;
  status: TaskStatus;
  progress: {
    current_step: string;
    percentage: number;
    estimated_remaining?: number;
  };
  output?: VideoOutput;
  error?: string;
}

export interface VideoResult {
  task_id: string;
  status: TaskStatus;
  output?: VideoOutput;
  error?: string;
  metadata: {
    created_at: number;
    completed_at?: number;
    api_provider: APIProvider;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  providers: {
    keling: {
      available: boolean;
      latency_ms?: number;
      error_rate?: number;
    };
    jimeng: {
      available: boolean;
      latency_ms?: number;
      error_rate?: number;
    };
  };
  queue: {
    pending_tasks: number;
    active_tasks: number;
    failed_tasks: number;
  };
  timestamp: number;
}

// ==================== 重试策略 ====================

export interface RetryStrategy {
  maxRetries: number;
  baseDelay: number;      // 毫秒
  maxDelay: number;       // 毫秒
  backoffMultiplier: number;
  getDelay: (retryCount: number) => number;
}

// ==================== 配置 ====================

export interface VideoGeneratorConfig {
  // Redis 配置
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  
  // MinIO 配置
  minio: {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  };
  
  // API 配置
  keling: {
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
  };
  
  jimeng: {
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
  };
  
  // 队列配置
  queue: {
    maxConcurrentTasks: number;
    defaultPriority: TaskPriority;
  };
  
  // 重试配置
  retry: RetryStrategy;
  
  // 日志配置
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}
