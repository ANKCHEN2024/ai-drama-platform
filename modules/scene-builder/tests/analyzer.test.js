/**
 * Scene Analyzer 单元测试
 */

const SceneAnalyzer = require('../analyzer');
const promptTemplates = require('../prompt-templates');

// Mock 测试数据
const mockScript = `
清晨，李明坐在办公室里，阳光透过百叶窗洒在桌面上。
他拿起咖啡杯，轻轻喝了一口，开始查看电脑上的文件。
办公室装修现代简约，墙上挂着一幅抽象画。
`;

const mockAnalysisResult = {
  location: "现代办公室",
  time: "清晨",
  atmosphere: "宁静、专注、充满希望",
  props: ["办公桌", "百叶窗", "白色咖啡杯", "电脑显示器", "抽象画"],
  characterPositions: [
    {
      character: "李明",
      position: "坐在办公桌前",
      action: "拿起咖啡杯喝咖啡，查看电脑文件",
      facing: "面向电脑屏幕",
      expression: "专注",
      clothing: "白色衬衫，深色西装外套"
    }
  ],
  lighting: "自然光，从左侧窗户透过百叶窗射入，形成条纹光影，柔和温暖",
  colorPalette: ["#F5E6D3", "#8B7355", "#2C3E50"],
  imagePrompt: "现代办公室，清晨阳光，百叶窗光影条纹，办公桌上有白色咖啡杯、电脑显示器和文件，墙上挂着抽象画，一人坐在桌前，专注表情，温暖色调，电影感",
  negativePrompt: "模糊、低质量、变形、多余的手指、文字、水印"
};

describe('SceneAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new SceneAnalyzer({
      apiKey: 'test-api-key',
      model: 'qwen-plus'
    });
  });

  describe('validateScript', () => {
    test('应该接受有效的剧本输入', () => {
      expect(() => {
        analyzer.validateScript(mockScript);
      }).not.toThrow();
    });

    test('应该拒绝空输入', () => {
      expect(() => {
        analyzer.validateScript('');
      }).toThrow('剧本输入无效');
    });

    test('应该拒绝过短的输入', () => {
      expect(() => {
        analyzer.validateScript('太短了');
      }).toThrow('剧本描述太短');
    });

    test('应该拒绝过长的输入', () => {
      const longScript = 'a'.repeat(5001);
      expect(() => {
        analyzer.validateScript(longScript);
      }).toThrow('剧本描述太长');
    });
  });

  describe('buildAnalysisPrompt', () => {
    test('应该使用基础模板构建提示词', () => {
      const prompt = analyzer.buildAnalysisPrompt(mockScript);
      
      expect(prompt).toContain(mockScript);
      expect(prompt).toContain('location');
      expect(prompt).toContain('imagePrompt');
    });

    test('应该使用增强模板当提供风格时', () => {
      const prompt = analyzer.buildAnalysisPrompt(mockScript, {
        style: 'modern_office'
      });
      
      expect(prompt).toContain('风格指导');
      expect(prompt).toContain('modern_office');
    });
  });

  describe('parseResponse', () => {
    test('应该解析纯 JSON 响应', () => {
      const response = JSON.stringify(mockAnalysisResult);
      const result = analyzer.parseResponse(response);
      
      expect(result.location).toBe(mockAnalysisResult.location);
      expect(result.time).toBe(mockAnalysisResult.time);
    });

    test('应该解析带 markdown 代码块的响应', () => {
      const response = `\`\`\`json
${JSON.stringify(mockAnalysisResult)}
\`\`\``;
      const result = analyzer.parseResponse(response);
      
      expect(result.location).toBe(mockAnalysisResult.location);
    });

    test('应该拒绝无效 JSON', () => {
      const response = 'invalid json';
      expect(() => {
        analyzer.parseResponse(response);
      }).toThrow('解析失败');
    });
  });

  describe('validateAnalysis', () => {
    test('应该接受有效的分析结果', () => {
      expect(() => {
        analyzer.validateAnalysis(mockAnalysisResult);
      }).not.toThrow();
    });

    test('应该拒绝缺少必要字段的结果', () => {
      const invalid = { time: "清晨" }; // 缺少 location 和 imagePrompt
      expect(() => {
        analyzer.validateAnalysis(invalid);
      }).toThrow('缺少必要字段');
    });

    test('应该自动修复非数组字段', () => {
      const result = {
        location: "办公室",
        time: "清晨",
        imagePrompt: "测试",
        props: "不是数组"
      };
      
      analyzer.validateAnalysis(result);
      expect(Array.isArray(result.props)).toBe(true);
    });

    test('应该过滤无效的色彩值', () => {
      const result = {
        location: "办公室",
        time: "清晨",
        imagePrompt: "测试",
        colorPalette: ["#F5E6D3", "invalid", "#8B7355"]
      };
      
      analyzer.validateAnalysis(result);
      expect(result.colorPalette).toEqual(["#F5E6D3", "#8B7355"]);
    });
  });

  describe('detectStyle', () => {
    test('应该识别办公室风格', () => {
      const analysis = {
        location: "现代办公室",
        atmosphere: "专业"
      };
      
      const style = analyzer.detectStyle(analysis);
      expect(style).toBe('modern_office');
    });

    test('应该识别家居风格', () => {
      const analysis = {
        location: "温馨的家",
        atmosphere: "舒适"
      };
      
      const style = analyzer.detectStyle(analysis);
      expect(style).toBe('home_warm');
    });

    test('应该识别神秘风格', () => {
      const analysis = {
        location: "夜晚的街道",
        atmosphere: "神秘黑暗"
      };
      
      const style = analyzer.detectStyle(analysis);
      expect(style).toBe('mystery_dark');
    });

    test('应该返回通用风格当无法识别时', () => {
      const analysis = {
        location: "某个地方",
        atmosphere: "普通"
      };
      
      const style = analyzer.detectStyle(analysis);
      expect(style).toBe('general');
    });
  });

  describe('generateSceneId', () => {
    test('应该生成唯一的场景 ID', () => {
      const id1 = analyzer.generateSceneId();
      const id2 = analyzer.generateSceneId();
      
      expect(id1).toMatch(/^scene_\d+_[a-z0-9]{5}$/);
      expect(id2).toMatch(/^scene_\d+_[a-z0-9]{5}$/);
      expect(id1).not.toBe(id2);
    });
  });
});

// 集成测试示例
describe('SceneAnalyzer Integration', () => {
  let analyzer;

  beforeAll(() => {
    // 只在有 API Key 时运行集成测试
    if (!process.env.DASHSCOPE_API_KEY) {
      console.warn('跳过集成测试：缺少 DASHSCOPE_API_KEY');
    }
    
    analyzer = new SceneAnalyzer({
      apiKey: process.env.DASHSCOPE_API_KEY
    });
  });

  test.skip('应该分析真实剧本', async () => {
    const result = await analyzer.analyze(mockScript);
    
    expect(result).toHaveProperty('location');
    expect(result).toHaveProperty('time');
    expect(result).toHaveProperty('imagePrompt');
    expect(result.location).toBeTruthy();
    expect(result.time).toBeTruthy();
  }, 30000);
});

// 性能测试
describe('SceneAnalyzer Performance', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new SceneAnalyzer({
      apiKey: 'test-api-key'
    });
  });

  test('应该在 100ms 内完成提示词构建', () => {
    const start = Date.now();
    
    for (let i = 0; i < 100; i++) {
      analyzer.buildAnalysisPrompt(mockScript);
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // 100 次循环 < 100ms
  });

  test('应该在 50ms 内完成响应解析', () => {
    const response = JSON.stringify(mockAnalysisResult);
    const start = Date.now();
    
    for (let i = 0; i < 100; i++) {
      analyzer.parseResponse(response);
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50);
  });
});
