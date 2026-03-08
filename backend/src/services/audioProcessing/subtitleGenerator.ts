import { SubtitleSegment, SubtitleInput, SubtitleOutput } from './types';
import { minioClient, bucketName } from '../../config/minio';
import logger from '../../utils/logger';

export class SubtitleGenerator {
  generateSRT(segments: SubtitleSegment[]): string {
    let srt = '';
    
    segments.forEach((segment, index) => {
      const startTime = this.formatSRTTime(segment.startTime);
      const endTime = this.formatSRTTime(segment.endTime);
      
      srt += `${index + 1}\n`;
      srt += `${startTime} --> ${endTime}\n`;
      srt += `${segment.text}\n\n`;
    });
    
    return srt;
  }

  generateVTT(segments: SubtitleSegment[]): string {
    let vtt = 'WEBVTT\n\n';
    
    segments.forEach((segment, index) => {
      const startTime = this.formatVTTTime(segment.startTime);
      const endTime = this.formatVTTTime(segment.endTime);
      
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `${segment.text}\n\n`;
    });
    
    return vtt;
  }

  generateASS(segments: SubtitleSegment[]): string {
    let ass = '[Script Info]\n';
    ass += 'ScriptType: v4.00+\n';
    ass += 'PlayResX: 1920\n';
    ass += 'PlayResY: 1080\n\n';
    ass += '[V4+ Styles]\n';
    ass += 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n';
    ass += 'Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,50,1\n\n';
    ass += '[Events]\n';
    ass += 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';
    
    segments.forEach((segment) => {
      const startTime = this.formatASSTime(segment.startTime);
      const endTime = this.formatASSTime(segment.endTime);
      
      ass += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${segment.text}\n`;
    });
    
    return ass;
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  private formatASSTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);
    
    return `${String(hours).padStart(1, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }

  async generateAndSaveSubtitle(
    input: SubtitleInput
  ): Promise<SubtitleOutput> {
    logger.info('Generating subtitle', {
      segmentCount: input.segments.length,
      format: input.format || 'srt',
    });

    const format = input.format || 'srt';
    let content: string;

    switch (format) {
      case 'srt':
        content = this.generateSRT(input.segments);
        break;
      case 'vtt':
        content = this.generateVTT(input.segments);
        break;
      case 'ass':
        content = this.generateASS(input.segments);
        break;
      default:
        content = this.generateSRT(input.segments);
    }

    const objectName = `subtitles/${input.metadata?.project_id || 'unknown'}/${input.metadata?.episode_id || 'unknown'}/${Date.now()}.${format}`;

    if (minioClient) {
      await minioClient.putObject(
        bucketName,
        objectName,
        Buffer.from(content, 'utf-8'),
        {
          'Content-Type': format === 'srt' ? 'text/plain' : format === 'vtt' ? 'text/vtt' : 'text/x-ssa',
        }
      );

      const presignedUrl = await minioClient.presignedGetObject(
        bucketName,
        objectName,
        7 * 24 * 60 * 60
      );

      logger.info('Subtitle generated and saved', { objectName });

      return {
        subtitle_url: presignedUrl,
        format,
        segment_count: input.segments.length,
      };
    } else {
      logger.warn('MinIO not available');
      return {
        subtitle_url: `file:///tmp/${objectName}`,
        format,
        segment_count: input.segments.length,
      };
    }
  }
}
