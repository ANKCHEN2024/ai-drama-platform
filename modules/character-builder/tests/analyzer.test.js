/**
 * 人物分析器测试
 */

const analyzer = require('../src/analyzer');
const prompts = require('../src/prompts');

describe('Character Analyzer', () => {
  describe('buildAnalysisPrompt', () => {
    test('should build prompt with all sections', () => {
      const text = '林小雅，25 岁，是一家广告公司的创意总监。';
      const options = {
        extractRelationships: true,
        generateConsistency: true
      };
      
      const prompt = analyzer.buildAnalysisPrompt(text, options);
      
      expect(prompt).toContain('故事文本');
      expect(prompt).toContain('林小雅');
      expect(prompt).toContain('relationships');
      expect(prompt).toContain('consistency');
    });

    test('should build prompt without relationships', () => {
      const text = '林小雅，25 岁。';
      const options = {
        extractRelationships: false,
        generateConsistency: true
      };
      
      const prompt = analyzer.buildAnalysisPrompt(text, options);
      
      expect(prompt).not.toContain('"relationships"');
    });

    test('should build prompt without consistency', () => {
      const text = '林小雅，25 岁。';
      const options = {
        extractRelationships: true,
        generateConsistency: false
      };
      
      const prompt = analyzer.buildAnalysisPrompt(text, options);
      
      expect(prompt).not.toContain('"consistency"');
    });
  });

  describe('validateAnalysisResult', () => {
    test('should pass valid result', () => {
      const result = {
        characters: [
          {
            name: '林小雅',
            age: 25,
            gender: '女',
            appearance: { overallDescription: '描述' },
            personality: { description: '描述' },
            clothing: { overallDescription: '描述' }
          }
        ]
      };
      
      expect(() => analyzer.validateAnalysisResult(result)).not.toThrow();
    });

    test('should fail with empty characters', () => {
      const result = { characters: 'not an array' };
      
      expect(() => analyzer.validateAnalysisResult(result)).toThrow('characters must be an array');
    });

    test('should fail with missing name', () => {
      const result = {
        characters: [
          { age: 25 }
        ]
      };
      
      expect(() => analyzer.validateAnalysisResult(result)).toThrow('name is required');
    });

    test('should fail with missing appearance', () => {
      const result = {
        characters: [
          {
            name: '林小雅',
            age: 25,
            gender: '女'
          }
        ]
      };
      
      expect(() => analyzer.validateAnalysisResult(result)).toThrow('appearance is required');
    });
  });

  describe('estimateTokens', () => {
    test('should estimate Chinese text tokens', () => {
      const input = '这是一个测试文本';
      const output = '这是输出文本';
      
      const tokens = analyzer.estimateTokens(input, output);
      
      expect(tokens).toBeGreaterThan(0);
    });

    test('should estimate mixed text tokens', () => {
      const input = '这是一个 test 文本';
      const output = 'This is 输出';
      
      const tokens = analyzer.estimateTokens(input, output);
      
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('extractCharacterNames', () => {
    test('should extract Chinese names', () => {
      const text = '林小雅走进了房间，看到张伟正在等她。';
      
      const names = analyzer.extractCharacterNames(text);
      
      expect(names.length).toBeGreaterThan(0);
    });

    test('should extract unique names', () => {
      const text = '林小雅对林小雅说，林小雅你来了。';
      
      const names = analyzer.extractCharacterNames(text);
      
      // Should be deduplicated
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);
    });
  });
});

describe('Prompts', () => {
  describe('getTemplate', () => {
    test('should return system prompt', () => {
      const template = prompts.getTemplate('system');
      expect(template).toContain('人物分析师');
    });

    test('should return enhanced system prompt', () => {
      const template = prompts.getTemplate('system-enhanced');
      expect(template).toContain('人物设计师');
    });

    test('should return character analysis prompt', () => {
      const template = prompts.getTemplate('character-analysis');
      expect(template).toContain('characters');
    });

    test('should return default for unknown type', () => {
      const template = prompts.getTemplate('unknown');
      expect(template).toContain('人物分析师');
    });
  });

  describe('render', () => {
    test('should render template with variables', () => {
      const template = 'Hello {{name}}, you are {{age}} years old.';
      const variables = { name: '林小雅', age: 25 };
      
      const result = prompts.render(template, variables);
      
      expect(result).toContain('Hello 林小雅');
      expect(result).toContain('you are 25 years old');
    });

    test('should render template with JSON variables', () => {
      const template = 'Data: {{data}}';
      const variables = { data: { key: 'value' } };
      
      const result = prompts.render(template, variables);
      
      expect(result).toContain('{"key":"value"}');
    });
  });

  describe('getTemplateTypes', () => {
    test('should return all template types', () => {
      const types = prompts.getTemplateTypes();
      
      expect(types).toContain('system');
      expect(types).toContain('character-analysis');
      expect(types).toContain('consistency');
    });
  });
});
