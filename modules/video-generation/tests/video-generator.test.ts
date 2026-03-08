/**
 * 视频生成器测试
 */

import { VideoGenerator } from '../src/video-generator';
import { VideoInput, VideoGeneratorConfig } from '../types';

// Mock 配置
const mockConfig: VideoGeneratorConfig = {
  redis: {
    host: 'localhost',
    port: 6379,
  },
  minio: {
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'test',
    secretKey: 'test',
    bucket: 'test',
  },
  keling: {
    apiKey: 'test_key',
    apiSecret: 'test_secret',
    baseUrl: 'https://api.test.com',
  },
  jimeng: {
    apiKey: 'test_key',
    apiSecret: 'test_secret',
    baseUrl: 'https://api.test.com',
  },
  queue: {
    maxConcurrentTasks: 2,
    defaultPriority: 5,
  },
  retry: {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 2,
    getDelay: (count: number) => 100 * Math.pow(2, count),
  },
  logging: {
    level: 'debug',
  },
};

describe('VideoGenerator', () => {
  let generator: VideoGenerator;

  beforeEach(() => {
    generator = new VideoGenerator(mockConfig);
  });

  afterEach(async () => {
    await generator.shutdown();
  });

  describe('generateVideo', () => {
    it('should accept valid input and return task id', async () => {
      const input: VideoInput = {
        scene_description: 'Modern office with large windows',
        character_description: 'Young woman with long black hair',
        action_description: 'Typing on laptop and smiling',
        parameters: {
          duration: 5,
          resolution: '720p',
        },
      };

      const response = await generator.generateVideo(input);

      expect(response.task_id).toBeDefined();
      expect(response.status).toBe('pending');
    });

    it('should reject empty scene description', async () => {
      const input: VideoInput = {
        scene_description: '',
        character_description: 'Young woman',
        action_description: 'Smiling',
      };

      await expect(generator.generateVideo(input)).rejects.toThrow();
    });

    it('should reject empty character description', async () => {
      const input: VideoInput = {
        scene_description: 'Office',
        character_description: '',
        action_description: 'Smiling',
      };

      await expect(generator.generateVideo(input)).rejects.toThrow();
    });

    it('should reject empty action description', async () => {
      const input: VideoInput = {
        scene_description: 'Office',
        character_description: 'Woman',
        action_description: '',
      };

      await expect(generator.generateVideo(input)).rejects.toThrow();
    });

    it('should accept reference images', async () => {
      const input: VideoInput = {
        scene_description: 'Office',
        character_description: 'Woman',
        action_description: 'Working',
        reference_images: {
          character: 'https://example.com/character.jpg',
          scene: 'https://example.com/scene.jpg',
        },
      };

      const response = await generator.generateVideo(input);
      expect(response.task_id).toBeDefined();
    });

    it('should accept custom parameters', async () => {
      const input: VideoInput = {
        scene_description: 'Office',
        character_description: 'Woman',
        action_description: 'Working',
        parameters: {
          duration: 10,
          resolution: '1080p',
          motion_strength: 8,
          aspect_ratio: '16:9',
        },
      };

      const response = await generator.generateVideo(input);
      expect(response.task_id).toBeDefined();
    });
  });

  describe('generateBatch', () => {
    it('should accept multiple inputs and return task ids', async () => {
      const inputs: VideoInput[] = [
        {
          scene_description: 'Office',
          character_description: 'Woman',
          action_description: 'Working',
        },
        {
          scene_description: 'Park',
          character_description: 'Man',
          action_description: 'Running',
        },
      ];

      const response = await generator.generateBatch(inputs);

      expect(response.task_ids).toHaveLength(2);
      expect(response.status).toBe('pending');
    });

    it('should reject batch with invalid input', async () => {
      const inputs: VideoInput[] = [
        {
          scene_description: 'Office',
          character_description: 'Woman',
          action_description: 'Working',
        },
        {
          scene_description: '', // Invalid
          character_description: 'Man',
          action_description: 'Running',
        },
      ];

      await expect(generator.generateBatch(inputs)).rejects.toThrow();
    });
  });

  describe('getTaskProgress', () => {
    it('should return null for non-existent task', async () => {
      const progress = await generator.getTaskProgress('non-existent-id');
      expect(progress).toBeNull();
    });
  });

  describe('cancelTask', () => {
    it('should cancel pending task', async () => {
      const input: VideoInput = {
        scene_description: 'Office',
        character_description: 'Woman',
        action_description: 'Working',
      };

      const response = await generator.generateVideo(input);
      await generator.cancelTask(response.task_id);

      const progress = await generator.getTaskProgress(response.task_id);
      expect(progress?.status).toBe('cancelled');
    });

    it('should handle cancelling non-existent task', async () => {
      await expect(generator.cancelTask('non-existent-id')).rejects.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const health = await generator.healthCheck();

      expect(health.status).toBeDefined();
      expect(health.providers).toBeDefined();
      expect(health.queue).toBeDefined();
      expect(health.timestamp).toBeDefined();
    });
  });
});
