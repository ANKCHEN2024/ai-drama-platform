import axios from 'axios';
import { JimengVideoRequest, JimengVideoResponse, VideoInput } from './types';
import { jimengConfig } from '../../config/ai-providers';

export class JimengClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor() {
    this.apiKey = jimengConfig.apiKey;
    this.baseUrl = jimengConfig.baseUrl || 'https://api.jimeng.com/v1';
    this.timeout = jimengConfig.timeout || 120000;
  }

  static buildPrompt(input: VideoInput): string {
    const parts = [];
    if (input.scene_description) parts.push(`场景: ${input.scene_description}`);
    if (input.character_description) parts.push(`人物: ${input.character_description}`);
    if (input.action_description) parts.push(`动作: ${input.action_description}`);
    return parts.join('; ');
  }

  static buildImagePrompt(referenceImages: any): any {
    const params: any = {};
    if (referenceImages.character) {
      params.image_prompt = referenceImages.character;
    } else if (referenceImages.scene) {
      params.image_prompt = referenceImages.scene;
    }
    return params;
  }

  async generateVideo(request: JimengVideoRequest): Promise<JimengVideoResponse> {
    const response = await axios.post(
      `${this.baseUrl}/video/generate`,
      request,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: this.timeout,
      }
    );
    return response.data;
  }

  async queryTask(taskId: string): Promise<JimengVideoResponse> {
    const response = await axios.get(
      `${this.baseUrl}/video/task/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: this.timeout,
      }
    );
    return response.data;
  }
}
