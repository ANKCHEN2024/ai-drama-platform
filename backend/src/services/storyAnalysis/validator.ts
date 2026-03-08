import { StoryAnalysisResult } from './parser';

interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export class DataValidator {
  validate(data: StoryAnalysisResult): ValidationResult {
    const errors: ValidationError[] = [];

    if (data.summary) {
      const summarySchema = {
        required: ['title', 'oneLinePitch', 'themes', 'genres', 'tone', 'targetAudience'],
        types: {
          title: 'string',
          oneLinePitch: 'string',
          themes: 'array',
          genres: 'array',
          tone: 'string',
          targetAudience: 'string'
        }
      };
      errors.push(...this.validateObject(data.summary, summarySchema, 'summary'));
    } else {
      errors.push({ field: 'summary', message: '缺失必填字段' });
    }

    if (data.characters) {
      const charactersSchema = {
        type: 'array',
        itemSchema: {
          required: ['name', 'role', 'description'],
          types: {
            name: 'string',
            role: 'string',
            description: 'string',
            traits: 'array',
            arc: 'string'
          },
          enums: {
            role: ['protagonist', 'antagonist', 'supporting', 'minor']
          }
        }
      };
      errors.push(...this.validateArray(data.characters, charactersSchema, 'characters'));
    }

    if (data.scenes) {
      const scenesSchema = {
        type: 'array',
        itemSchema: {
          required: ['name', 'description'],
          types: {
            name: 'string',
            description: 'string',
            locationType: 'string',
            timeOfDay: 'string',
            atmosphere: 'string',
            visualStyle: 'string'
          }
        }
      };
      errors.push(...this.validateArray(data.scenes, scenesSchema, 'scenes'));
    }

    if (data.conflicts) {
      const conflictsSchema = {
        type: 'array',
        itemSchema: {
          required: ['type', 'description', 'parties', 'intensity'],
          types: {
            type: 'string',
            description: 'string',
            parties: 'array',
            intensity: 'number',
            resolution: 'string'
          },
          ranges: {
            intensity: { min: 1, max: 10 }
          },
          enums: {
            type: ['internal', 'external', 'interpersonal', 'societal']
          }
        }
      };
      errors.push(...this.validateArray(data.conflicts, conflictsSchema, 'conflicts'));
    }

    if (data.structure) {
      const structureSchema = {
        required: ['actStructure', 'acts'],
        types: {
          actStructure: 'string',
          acts: 'array'
        },
        enums: {
          actStructure: ['3-act', '5-act', 'hero-journey']
        }
      };
      errors.push(...this.validateObject(data.structure, structureSchema, 'structure'));
    }

    if (data.rhythm) {
      const rhythmSchema = {
        required: ['pace', 'climaxPoints', 'tensionCurve'],
        types: {
          pace: 'string',
          climaxPoints: 'array',
          tensionCurve: 'array'
        },
        enums: {
          pace: ['slow', 'medium', 'fast', 'variable']
        }
      };
      errors.push(...this.validateObject(data.rhythm, rhythmSchema, 'rhythm'));
    }

    if (data.emotionCurve) {
      const emotionCurveSchema = {
        type: 'array',
        itemSchema: {
          required: ['chapter', 'emotion', 'intensity'],
          types: {
            chapter: 'number',
            emotion: 'string',
            intensity: 'number',
            description: 'string'
          },
          ranges: {
            intensity: { min: 1, max: 10 }
          }
        }
      };
      errors.push(...this.validateArray(data.emotionCurve, emotionCurveSchema, 'emotionCurve'));
    }

    if (data.chapterSuggestions) {
      const chapterSuggestionsSchema = {
        type: 'array',
        itemSchema: {
          required: ['chapter', 'title', 'summary'],
          types: {
            chapter: 'number',
            title: 'string',
            summary: 'string',
            keyPlot: 'string',
            emotionPeak: 'string',
            cliffhanger: 'string'
          }
        }
      };
      errors.push(...this.validateArray(data.chapterSuggestions, chapterSuggestionsSchema, 'chapterSuggestions'));
    }

    if (data.styleAnalysis) {
      const styleAnalysisSchema = {
        required: ['detectedStyle', 'confidence', 'characteristics', 'writingStyle'],
        types: {
          detectedStyle: 'string',
          confidence: 'number',
          characteristics: 'array',
          writingStyle: 'string'
        },
        ranges: {
          confidence: { min: 0, max: 1 }
        }
      };
      errors.push(...this.validateObject(data.styleAnalysis, styleAnalysisSchema, 'styleAnalysis'));
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateObject(obj: any, schema: any, prefix: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (schema.required) {
      for (const field of schema.required) {
        if (obj[field] === undefined || obj[field] === null) {
          errors.push({ field: `${prefix}.${field}`, message: '缺失必填字段' });
        }
      }
    }

    if (schema.types) {
      for (const [field, expectedType] of Object.entries(schema.types)) {
        if (obj[field] !== undefined && !this.checkType(obj[field], expectedType as string)) {
          errors.push({ field: `${prefix}.${field}`, message: `类型错误，期望 ${expectedType}` });
        }
      }
    }

    if (schema.enums) {
      for (const [field, allowedValues] of Object.entries(schema.enums)) {
        if (obj[field] !== undefined && !(allowedValues as string[]).includes(obj[field])) {
          errors.push({ field: `${prefix}.${field}`, message: `值不在允许范围内：${(allowedValues as string[]).join(', ')}` });
        }
      }
    }

    if (schema.ranges) {
      for (const [field, range] of Object.entries(schema.ranges)) {
        if (obj[field] !== undefined) {
          const value = parseFloat(obj[field]);
          const r = range as { min: number; max: number };
          if (value < r.min || value > r.max) {
            errors.push({ field: `${prefix}.${field}`, message: `值超出范围：${r.min}-${r.max}` });
          }
        }
      }
    }

    return errors;
  }

  private validateArray(arr: any, schema: any, prefix: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!Array.isArray(arr)) {
      errors.push({ field: prefix, message: '必须是数组' });
      return errors;
    }

    if (schema.itemSchema) {
      arr.forEach((item, index) => {
        const itemErrors = this.validateObject(item, schema.itemSchema, `${prefix}[${index}]`);
        errors.push(...itemErrors);
      });
    }

    return errors;
  }

  private checkType(value: any, expectedType: string): boolean {
    if (expectedType === 'string') return typeof value === 'string';
    if (expectedType === 'number') return typeof value === 'number';
    if (expectedType === 'boolean') return typeof value === 'boolean';
    if (expectedType === 'array') return Array.isArray(value);
    if (expectedType === 'object') return typeof value === 'object' && value !== null;
    return true;
  }
}
