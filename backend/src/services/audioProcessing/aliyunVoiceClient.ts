import axios from 'axios';
import { aliyunVoiceConfig } from '../../config/ai-providers';
import { TTSParameters } from './types';
import logger from '../../utils/logger';

export class AliyunVoiceClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor() {
    this.apiKey = aliyunVoiceConfig.apiKey;
    this.baseUrl = aliyunVoiceConfig.baseUrl || 'https://nls-meta.cn-shanghai.aliyuncs.com';
    this.timeout = aliyunVoiceConfig.timeout || 60000;
  }

  async synthesizeSpeech(
    text: string,
    parameters?: TTSParameters
  ): Promise<Buffer> {
    logger.info('Synthesizing speech with Aliyun Voice', {
      text: text.substring(0, 50) + '...',
    });

    const voice = parameters?.voice || 'xiaoyun';
    const format = parameters?.format || 'mp3';
    const sampleRate = parameters?.sampleRate || 16000;
    const volume = parameters?.volume || 50;
    const speechRate = parameters?.speechRate || 0;
    const pitchRate = parameters?.pitchRate || 0;

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/tts`,
        {
          text,
          voice,
          format,
          sample_rate: sampleRate,
          volume,
          speech_rate: speechRate,
          pitch_rate: pitchRate,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: this.timeout,
        }
      );

      logger.info('Speech synthesis completed');
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Speech synthesis failed', error);
      throw error;
    }
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    logger.info('Transcribing audio with Aliyun Voice');

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/asr`,
        audioBuffer,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'audio/wav',
          },
          timeout: this.timeout,
        }
      );

      logger.info('Audio transcription completed');
      return response.data.text || '';
    } catch (error) {
      logger.error('Audio transcription failed', error);
      throw error;
    }
  }
}
