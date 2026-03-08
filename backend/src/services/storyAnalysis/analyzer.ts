import crypto from 'crypto';
import { PromptManager } from './prompts';
import { ResponseParser, StoryAnalysisResult } from './parser';
import { DataValidator } from './validator';
import { tongyiConfig } from '../../config/ai-providers';

interface StoryAnalyzerConfig {
  apiKey: string;
  model: string;
  timeout: number;
  maxTextLength: number;
  cacheEnabled: boolean;
  retryAttempts: number;
  retryDelay: number;
}

interface AnalysisOptions {
  template?: string;
  episodeCount?: number;
}

interface AnalysisResponse {
  success: boolean;
  data?: StoryAnalysisResult;
  warnings?: string[];
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    fromCache: boolean;
    model: string;
    tokens?: any;
    processingTime: number;
  };
}

export class StoryAnalyzer {
  private promptManager: PromptManager;
  private parser: ResponseParser;
  private validator: DataValidator;
  private config: StoryAnalyzerConfig;
  private cache: Map<string, any> = new Map();
  private history: Map<string, any> = new Map();

  constructor() {
    this.promptManager = new PromptManager();
    this.parser = new ResponseParser();
    this.validator = new DataValidator();
    
    this.config = {
      apiKey: tongyiConfig.apiKey,
      model: 'qwen-plus',
      timeout: tongyiConfig.timeout || 60000,
      maxTextLength: 51200,
      cacheEnabled: process.env.CACHE_ENABLED !== 'false',
      retryAttempts: 3,
      retryDelay: 1000
    };
  }

  async analyze(text: string, options: AnalysisOptions = {}): Promise<AnalysisResponse> {
    const startTime = Date.now();
    const analysisId = this.generateId();

    try {
      if (!text || typeof text !== 'string') {
        throw new Error('INVALID_INPUT: 文本不能为空');
      }

      if (text.length > this.config.maxTextLength) {
        throw new Error(`TEXT_TOO_LONG: 文本超过 ${this.config.maxTextLength} 字符限制`);
      }

      const cacheKey = this.getCacheKey(text, options);
      if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        return {
          success: true,
          data: cached,
          meta: {
            fromCache: true,
            model: this.config.model,
            processingTime: Date.now() - startTime
          }
        };
      }

      const template = this.promptManager.getTemplate(options.template || 'main-analysis');
      const userPrompt = this.promptManager.render(template.user, {
        STORY_TEXT: text
      });

      let response;
      let lastError;
      
      for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
        try {
          response = await this.callTongyiApi(template.system, userPrompt);
          break;
        } catch (error) {
          lastError = error;
          if (attempt < this.config.retryAttempts) {
            await this.sleep(this.config.retryDelay * attempt);
          }
        }
      }

      if (!response) {
        throw new Error(`API_ERROR: 调用失败 - ${lastError instanceof Error ? lastError.message : String(lastError)}`);
      }

      const parsedData = this.parser.parse(response);
      const validation = this.validator.validate(parsedData);
      
      if (!validation.valid) {
        console.warn('数据验证警告:', validation.errors);
      }

      const result: StoryAnalysisResult = {
        ...parsedData,
      };

      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, result);
      }

      this.history.set(analysisId, {
        ...result,
        text: text.substring(0, 500)
      });

      return {
        success: true,
        data: result,
        warnings: validation.errors.map(e => `${e.field}: ${e.message}`),
        meta: {
          fromCache: false,
          model: this.config.model,
          tokens: response.usage || {},
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: this.getErrorCode(error instanceof Error ? error.message : 'Unknown error'),
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        data: undefined
      };
    }
  }

  private async callTongyiApi(systemPrompt: string, userPrompt: string): Promise<any> {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  private generateId(): string {
    return `sa_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private getCacheKey(text: string, options: AnalysisOptions): string {
    const keyData = JSON.stringify({ text: text.substring(0, 1000), options });
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  private getErrorCode(message: string): string {
    if (message.includes('INVALID_INPUT')) return 'INVALID_INPUT';
    if (message.includes('TEXT_TOO_LONG')) return 'TEXT_TOO_LONG';
    if (message.includes('API_ERROR')) return 'API_ERROR';
    return 'INTERNAL_ERROR';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
