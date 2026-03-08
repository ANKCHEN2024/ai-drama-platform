import { KelingClient } from './kelingClient';
import { JimengClient } from './jimengClient';
import {
  VideoInput,
  VideoOutput,
  APIProvider,
  TaskStatus,
} from './types';
import { minioClient, bucketName } from '../../config/minio';
import axios from 'axios';
import logger from '../../utils/logger';

export class VideoGenerator {
  private kelingClient: KelingClient;
  private jimengClient: JimengClient;

  constructor() {
    this.kelingClient = new KelingClient();
    this.jimengClient = new JimengClient();
  }

  async generateVideo(
    input: VideoInput,
    provider: APIProvider = 'keling'
  ): Promise<string> {
    logger.info(`Starting video generation with ${provider}`, {
      scene: input.scene_description.substring(0, 50) + '...',
    });

    let externalTaskId: string;

    if (provider === 'keling') {
      externalTaskId = await this.generateWithKeling(input);
    } else {
      externalTaskId = await this.generateWithJimeng(input);
    }

    return externalTaskId;
  }

  private async generateWithKeling(input: VideoInput): Promise<string> {
    const prompt = KelingClient.buildPrompt(input);
    const referenceParams = input.reference_images
      ? KelingClient.buildReferenceParams(input.reference_images)
      : {};

    const response = await this.kelingClient.generateVideo({
      prompt,
      duration: input.parameters?.duration || 5,
      resolution: input.parameters?.resolution || '720p',
      motion_strength: input.parameters?.motion_strength || 5,
      seed: input.parameters?.seed,
      negative_prompt: input.parameters?.negative_prompt,
      ...referenceParams,
    });

    return response.data.task_id;
  }

  private async generateWithJimeng(input: VideoInput): Promise<string> {
    const prompt = JimengClient.buildPrompt(input);
    const imagePromptParams = input.reference_images
      ? JimengClient.buildImagePrompt(input.reference_images)
      : {};

    const response = await this.jimengClient.generateVideo({
      prompt,
      duration: input.parameters?.duration || 5,
      aspect_ratio: input.parameters?.aspect_ratio || '16:9',
      video_style: input.parameters?.style,
      ...imagePromptParams,
    });

    return response.data.task_id;
  }

  async pollTaskStatus(
    taskId: string,
    provider: APIProvider
  ): Promise<{
    status: TaskStatus;
    progress: number;
    videoUrl?: string;
    coverUrl?: string;
    errorMessage?: string;
  }> {
    if (provider === 'keling') {
      const response = await this.kelingClient.queryTask(taskId);
      return {
        status: response.data.status,
        progress: response.data.progress,
        videoUrl: response.data.video_url,
        coverUrl: response.data.cover_url,
        errorMessage: response.data.error_message,
      };
    } else {
      const response = await this.jimengClient.queryTask(taskId);
      return {
        status: response.data.status,
        progress: response.data.progress,
        videoUrl: response.data.video_url,
        coverUrl: response.data.cover_url,
        errorMessage: response.data.error_message,
      };
    }
  }

  async downloadAndSaveToMinIO(
    url: string,
    objectName: string
  ): Promise<string> {
    logger.info(`Downloading video from ${url} and saving to MinIO`);

    const response = await axios.get(url, { responseType: 'stream' });
    
    await minioClient.putObject(
      bucketName,
      objectName,
      response.data,
      {
        'Content-Type': 'video/mp4',
      }
    );

    const presignedUrl = await minioClient.presignedGetObject(
      bucketName,
      objectName,
      7 * 24 * 60 * 60
    );

    logger.info(`Video saved to MinIO: ${objectName}`);
    return presignedUrl;
  }
}
