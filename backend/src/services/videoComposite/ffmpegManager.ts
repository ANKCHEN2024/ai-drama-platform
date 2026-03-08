import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';
import { minioClient, bucketName } from '../../config/minio';
import logger from '../../utils/logger';

const execAsync = promisify(exec);

export class FFmpegManager {
  private readonly ffmpegPath: string;
  private readonly tempDir: string;

  constructor(ffmpegPath: string = 'ffmpeg') {
    this.ffmpegPath = ffmpegPath;
    this.tempDir = path.join(process.cwd(), 'temp');
    fs.ensureDirSync(this.tempDir);
  }

  async downloadFile(url: string, filename: string): Promise<string> {
    const tempPath = path.join(this.tempDir, filename);
    
    if (url.startsWith('http')) {
      const axios = (await import('axios')).default;
      const response = await axios.get(url, { responseType: 'stream' });
      const writer = fs.createWriteStream(tempPath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } else {
      await fs.copy(url, tempPath);
    }
    
    return tempPath;
  }

  async getVideoDuration(videoPath: string): Promise<number> {
    const command = `${this.ffmpegPath} -i "${videoPath}" 2>&1 | grep "Duration" | cut -d ' ' -f 4 | sed s/,//`;
    const { stdout } = await execAsync(command);
    const timeParts = stdout.trim().split(':');
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = parseFloat(timeParts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }

  async executeCommand(command: string): Promise<void> {
    logger.info(`Executing FFmpeg command: ${command.substring(0, 200)}...`);
    await execAsync(command);
  }

  async uploadToMinIO(localPath: string, objectName: string): Promise<string> {
    if (!minioClient) {
      logger.warn('MinIO not available, returning local path');
      return `file://${localPath}`;
    }
    
    logger.info(`Uploading file to MinIO: ${objectName}`);
    
    const fileStream = fs.createReadStream(localPath);
    const stat = await fs.stat(localPath);
    
    await minioClient.putObject(
      bucketName,
      objectName,
      fileStream,
      stat.size,
      {
        'Content-Type': objectName.endsWith('.mp4') ? 'video/mp4' : 
                      objectName.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream',
      }
    );

    const presignedUrl = await minioClient.presignedGetObject(
      bucketName,
      objectName,
      7 * 24 * 60 * 60
    );

    logger.info(`File uploaded to MinIO: ${objectName}`);
    return presignedUrl;
  }

  async cleanupTempFiles(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await fs.remove(file);
      } catch (error) {
        logger.warn(`Failed to cleanup temp file: ${file}`, error);
      }
    }
  }
}
