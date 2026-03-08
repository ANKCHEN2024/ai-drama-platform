import axios from 'axios';
import { KelingVideoRequest, KelingVideoResponse, VideoInput } from './types';
import { kelingConfig } from '../../config/ai-providers';

export class KelingClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor() {
    this.apiKey = kelingConfig.apiKey;
    this.baseUrl = kelingConfig.baseUrl || 'https://api.klingai.com/v1';
    this.timeout = kelingConfig.timeout || 120000;
  }

  static buildPrompt(input: VideoInput): string {
    const parts = [];
    if (input.scene_description) parts.push(`场景: ${input.scene_description}`);
    if (input.character_description) parts.push(`人物: ${input.character_description}`);
    if (input.action_description) parts.push(`动作: ${input.action_description}`);
    return parts.join('; ');
  }

  static buildReferenceParams(referenceImages: any): any {
    const params: any = {};
    if (referenceImages.character) {
      params.reference_image = referenceImages.character;
      params.reference_type = 'character';
    } else if (referenceImages.scene) {
      params.reference_image = referenceImages.scene;
      params.reference_type = 'scene';
    }
    return params;
  }

  async generateVideo(request: KelingVideoRequest): Promise<KelingVideoResponse> {
    const response = await axios.post(
      `${this.baseUrl}/video/generation`,
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

  async queryTask(taskId: string): Promise<KelingVideoResponse> {
    const response = await axios.get(
      `${this.baseUrl}/video/generation/${taskId}`,
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
