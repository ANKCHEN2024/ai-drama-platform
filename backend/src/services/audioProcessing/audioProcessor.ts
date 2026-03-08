import { AliyunVoiceClient } from './aliyunVoiceClient';
import { SubtitleGenerator } from './subtitleGenerator';
import {
  AudioSynthesisInput,
  AudioOutput,
  SubtitleInput,
  SubtitleOutput,
} from './types';
import { minioClient, bucketName } from '../../config/minio';
import logger from '../../utils/logger';

export class AudioProcessor {
  private aliyunVoiceClient: AliyunVoiceClient;
  private subtitleGenerator: SubtitleGenerator;

  constructor() {
    this.aliyunVoiceClient = new AliyunVoiceClient();
    this.subtitleGenerator = new SubtitleGenerator();
  }

  async synthesizeSpeech(input: AudioSynthesisInput): Promise<AudioOutput> {
    logger.info('Synthesizing speech', {
      text: input.text.substring(0, 50) + '...',
    });

    const audioBuffer = await this.aliyunVoiceClient.synthesizeSpeech(
      input.text,
      input.parameters
    );

    const format = input.parameters?.format || 'mp3';
    const objectName = `audios/${input.metadata?.project_id || 'unknown'}/${input.metadata?.episode_id || 'unknown'}/${Date.now()}.${format}`;

    if (minioClient) {
      await minioClient.putObject(
        bucketName,
        objectName,
        audioBuffer,
        {
          'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
        }
      );

      const presignedUrl = await minioClient.presignedGetObject(
        bucketName,
        objectName,
        7 * 24 * 60 * 60
      );

      logger.info('Speech synthesized and saved', { objectName });
      return {
        audio_url: presignedUrl,
        duration,
        format,
        file_size: audioBuffer.length,
      };
    } else {
      logger.warn('MinIO not available, saving locally');
      return {
        audio_url: `file:///tmp/${objectName}`,
        duration,
        format,
        file_size: audioBuffer.length,
      };
    }
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    return await this.aliyunVoiceClient.transcribeAudio(audioBuffer);
  }

  async generateSubtitle(input: SubtitleInput): Promise<SubtitleOutput> {
    return await this.subtitleGenerator.generateAndSaveSubtitle(input);
  }
}
