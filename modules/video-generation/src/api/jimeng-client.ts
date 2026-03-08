/**
 * 火山引擎即梦 AI API 客户端
 * 
 * 文档：https://www.volcengine.com/docs
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  JimengVideoRequest,
  JimengVideoResponse,
  VideoGeneratorError,
  ErrorType,
} from '../types';
import { Logger } from '../utils/logger';

export interface JimengClientConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  timeout?: number;
}

export class JimengClient {
  private client: AxiosInstance;
  private logger: Logger;
  private apiKey: string;
  private apiSecret: string;

  constructor(config: JimengClientConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.logger = new Logger('JimengClient');

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 300000, // 5 分钟
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器 - 添加认证
    this.client.interceptors.request.use((config) => {
      // 火山引擎通常使用签名认证，这里简化处理
      // 实际使用时需要实现 HMAC-SHA256 签名
      config.headers['X-Api-Key'] = this.apiKey;
      this.logger.debug('Request:', config.method?.toUpperCase(), config.url);
      return config;
    });

    // 响应拦截器 - 错误处理
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.logger.error('API Error:', error.message);
        throw this.handleApiError(error);
      }
    );
  }

  /**
   * 生成视频
   */
  async generateVideo(request: JimengVideoRequest): Promise<JimengVideoResponse> {
    this.logger.info('Generating video:', {
      prompt: request.prompt.substring(0, 50) + '...',
      duration: request.duration,
      aspect_ratio: request.aspect_ratio,
    });

    try {
      const response = await this.client.post<JimengVideoResponse>(
        '/v1/video/generate',
        request
      );

      const result = response.data;
      
      if (result.code !== 0 && result.code !== 200) {
        throw new VideoGeneratorError(
          result.message || 'Video generation failed',
          ErrorType.API_SERVER_ERROR,
          true
        );
      }

      this.logger.info('Video generation started:', {
        task_id: result.data.task_id,
        status: result.data.status,
      });

      return result;
    } catch (error) {
      if (error instanceof VideoGeneratorError) {
        throw error;
      }
      throw new VideoGeneratorError(
        'Failed to generate video',
        ErrorType.NETWORK_ERROR,
        true,
        error as Error
      );
    }
  }

  /**
   * 查询任务状态
   */
  async queryTask(taskId: string): Promise<JimengVideoResponse> {
    this.logger.debug('Querying task:', taskId);

    try {
      const response = await this.client.get<JimengVideoResponse>(
        `/v1/video/query/${taskId}`
      );

      return response.data;
    } catch (error) {
      if (error instanceof VideoGeneratorError) {
        throw error;
      }
      throw new VideoGeneratorError(
        'Failed to query task',
        ErrorType.NETWORK_ERROR,
        true,
        error as Error
      );
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    this.logger.info('Cancelling task:', taskId);

    try {
      await this.client.post(`/v1/video/cancel/${taskId}`);
      this.logger.info('Task cancelled:', taskId);
    } catch (error) {
      this.logger.error('Failed to cancel task:', taskId, error);
      throw new VideoGeneratorError(
        'Failed to cancel task',
        ErrorType.NETWORK_ERROR,
        false,
        error as Error
      );
    }
  }

  /**
   * 处理 API 错误
   */
  private handleApiError(error: AxiosError): VideoGeneratorError {
    if (!error.response) {
      return new VideoGeneratorError(
        'Network error or timeout',
        ErrorType.NETWORK_ERROR,
        true,
        error
      );
    }

    const status = error.response.status;
    const data = error.response.data as any;

    // 根据状态码分类错误
    switch (status) {
      case 400:
        return new VideoGeneratorError(
          data?.message || 'Invalid request',
          ErrorType.INVALID_INPUT,
          false
        );
      case 401:
      case 403:
        return new VideoGeneratorError(
          'Authentication failed',
          ErrorType.AUTHENTICATION_FAILED,
          false
        );
      case 402:
        return new VideoGeneratorError(
          'Insufficient credits',
          ErrorType.INSUFFICIENT_CREDITS,
          false
        );
      case 429:
        return new VideoGeneratorError(
          'Rate limit exceeded',
          ErrorType.API_RATE_LIMIT,
          true
        );
      case 451:
        return new VideoGeneratorError(
          'Content violation detected',
          ErrorType.CONTENT_VIOLATION,
          false
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return new VideoGeneratorError(
          'Server error',
          ErrorType.API_SERVER_ERROR,
          true
        );
      default:
        return new VideoGeneratorError(
          data?.message || `HTTP ${status} error`,
          ErrorType.API_SERVER_ERROR,
          true
        );
    }
  }

  /**
   * 构建视频提示词
   */
  static buildPrompt(input: {
    scene_description: string;
    character_description: string;
    action_description: string;
  }): string {
    const { scene_description, character_description, action_description } = input;
    
    // 即梦 AI 的提示词格式
    const prompt = [
      scene_description,
      character_description,
      action_description,
    ].filter(Boolean).join(', ');

    return prompt;
  }

  /**
   * 构建图片提示参数
   */
  static buildImagePrompt(referenceImages: {
    character?: string;
    scene?: string;
  }): { image_prompt?: string } {
    const { character, scene } = referenceImages;

    // 即梦支持图片提示，优先使用人物参考图
    if (character) {
      return { image_prompt: character };
    } else if (scene) {
      return { image_prompt: scene };
    }

    return {};
  }
}
