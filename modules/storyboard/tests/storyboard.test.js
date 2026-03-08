/**
 * 分镜生成服务测试
 */

const StoryboardService = require('../src/storyboard-service');
const WanXClient = require('../src/wanx-client');
const ConsistencyController = require('../src/consistency-controller');
const { CameraAngle, QualityLevel, AspectRatio } = require('../src/types');

describe('WanXClient', () => {
  let client;

  beforeEach(() => {
    // Mock 环境变量
    process.env.ALIYUN_ACCESS_KEY_ID = 'test_key_id';
    process.env.ALIYUN_ACCESS_KEY_SECRET = 'test_key_secret';
    client = new WanXClient();
  });

  describe('buildPrompt', () => {
    it('应该正确构建基础提示词', () => {
      const prompt = client.buildPrompt({
        sceneDescription: '现代化办公室',
        characters: [{
          name: '李明',
          appearance: { age: 28, gender: 'male' },
          hairstyle: { color: '黑色', style: '短发', length: 'short' },
          outfit: { top: '白色衬衫', bottom: '西裤' },
          expression: '专注',
          pose: '站立'
        }],
        action: '走向办公桌',
        cameraAngle: CameraAngle.MEDIUM_SHOT,
        style: '电影感写实',
        quality: QualityLevel.HIGH
      });

      expect(prompt).toContain('电影感写实风格');
      expect(prompt).toContain('中景镜头');
      expect(prompt).toContain('现代化办公室');
      expect(prompt).toContain('李明');
      expect(prompt).toContain('走向办公桌');
    });

    it('应该为不同镜头角度生成正确的描述', () => {
      const longShot = client.buildCameraAnglePrompt(CameraAngle.EXTREME_LONG_SHOT);
      expect(longShot).toContain('大远景');

      const closeUp = client.buildCameraAnglePrompt(CameraAngle.CLOSE_UP);
      expect(closeUp).toContain('近景');
    });
  });

  describe('generateConsistentSeed', () => {
    it('应该为相同输入生成相同的种子', () => {
      const seed1 = client.generateConsistentSeed('char_001', 'proj_001');
      const seed2 = client.generateConsistentSeed('char_001', 'proj_001');
      expect(seed1).toBe(seed2);
    });

    it('应该为不同输入生成不同的种子', () => {
      const seed1 = client.generateConsistentSeed('char_001', 'proj_001');
      const seed2 = client.generateConsistentSeed('char_002', 'proj_001');
      expect(seed1).not.toBe(seed2);
    });
  });

  describe('getDefaultNegativePrompt', () => {
    it('应该返回包含常见负面词的提示词', () => {
      const negative = client.getDefaultNegativePrompt();
      expect(negative).toContain('模糊');
      expect(negative).toContain('低质量');
      expect(negative).toContain('变形');
    });
  });
});

describe('ConsistencyController', () => {
  let controller;

  beforeEach(() => {
    controller = new ConsistencyController({ threshold: 85 });
  });

  describe('generateCharacterSeed', () => {
    it('应该生成一致的人物种子', () => {
      const seed1 = controller.generateCharacterSeed('char_001', 'proj_001');
      const seed2 = controller.generateCharacterSeed('char_001', 'proj_001');
      expect(seed1).toBe(seed2);
    });
  });

  describe('buildConsistencyPrompts', () => {
    it('应该提取人物和场景的固定特征', () => {
      const character = {
        appearance: { age: 25, gender: 'female' },
        hairstyle: { color: '黑色', style: '长发' },
        outfit: { top: '白色衬衫', bottom: '牛仔裤' }
      };
      const scene = {
        environment: '办公室',
        lighting: '自然光',
        colorTone: '暖色调',
        timeOfDay: '下午'
      };

      const prompts = controller.buildConsistencyPrompts(character, scene);

      expect(prompts.characterPrompt).toContain('25 岁');
      expect(prompts.scenePrompt).toContain('办公室');
      expect(prompts.combinedPrompt).toContain('白色衬衫');
    });
  });

  describe('isConsistent', () => {
    it('应该正确判断一致性是否达标', () => {
      expect(controller.isConsistent(90)).toBe(true);
      expect(controller.isConsistent(85)).toBe(true);
      expect(controller.isConsistent(84)).toBe(false);
      expect(controller.isConsistent(70)).toBe(false);
    });
  });

  describe('generateConsistencyReport', () => {
    it('应该生成一致性报告', () => {
      const scores = {
        medium_shot: { average: 92, min: 88, max: 95 },
        close_up: { average: 87, min: 82, max: 90 }
      };

      const report = controller.generateConsistencyReport(scores);

      expect(report.overall.passed).toBe(true);
      expect(report.byAngle.medium_shot.passed).toBe(true);
      expect(report.byAngle.close_up.passed).toBe(true);
      expect(report.overall.average).toBeGreaterThan(85);
    });
  });
});

describe('StoryboardService', () => {
  let service;

  beforeEach(() => {
    service = new StoryboardService({
      aliyun: {
        accessKeyId: 'test_key',
        accessKeySecret: 'test_secret'
      }
    });
  });

  describe('generateStoryboard', () => {
    it('应该拒绝缺少必要参数的请求', async () => {
      const invalidRequest = {
        projectId: 'proj_001',
        // 缺少 sceneId, sceneDescription, characters, action
        cameraAngles: ['medium_shot']
      };

      await expect(service.generateStoryboard(invalidRequest))
        .rejects.toThrow();
    });

    it('应该接受完整的生成请求', async () => {
      const validRequest = {
        projectId: 'proj_001',
        sceneId: 'scene_001',
        sceneDescription: '现代化办公室',
        characters: [{
          characterId: 'char_001',
          name: '李明',
          role: 'protagonist',
          appearance: { age: 28, gender: 'male', height: '180cm', bodyType: '健壮', faceShape: '方形', skinTone: '小麦色' },
          hairstyle: { style: '短发', color: '黑色', length: 'short' },
          outfit: { top: '白色衬衫', bottom: '西裤', shoes: '皮鞋', accessories: [] },
          expression: '专注',
          pose: '站立'
        }],
        action: '走向办公桌',
        cameraAngles: [CameraAngle.MEDIUM_SHOT]
      };

      // 注意：这个测试会实际调用 API，需要 mock
      // 实际测试中应该 mock WanXClient
    });
  });
});

// 工具函数测试
describe('Utility Functions', () => {
  describe('Aspect Ratio Conversion', () => {
    const service = new StoryboardService({});

    it('应该正确转换宽高比到尺寸', () => {
      // 私有方法需要通过特殊方式测试，这里仅做示例
      expect(service._aspectRatioToSize('16:9')).toBe('1280*720');
      expect(service._aspectRatioToSize('9:16')).toBe('720*1280');
      expect(service._aspectRatioToSize('1:1')).toBe('1024*1024');
    });
  });
});
