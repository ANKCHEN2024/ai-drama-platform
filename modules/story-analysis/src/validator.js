/**
 * 数据验证器
 * Data Validator
 */

class DataValidator {
  constructor() {
    this.schema = {
      summary: {
        required: ['title', 'oneLinePitch', 'themes', 'genres', 'tone', 'targetAudience'],
        types: {
          title: 'string',
          oneLinePitch: 'string',
          themes: 'array',
          genres: 'array',
          tone: 'string',
          targetAudience: 'string'
        }
      },
      characters: {
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
      },
      conflicts: {
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
      },
      structure: {
        required: ['actStructure', 'acts'],
        types: {
          actStructure: 'string',
          acts: 'array'
        },
        enums: {
          actStructure: ['3-act', '5-act', 'hero-journey']
        }
      },
      rhythm: {
        required: ['pace', 'climaxPoints', 'tensionCurve'],
        types: {
          pace: 'string',
          climaxPoints: 'array',
          tensionCurve: 'array'
        },
        enums: {
          pace: ['slow', 'medium', 'fast', 'variable']
        }
      },
      emotionCurve: {
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
      },
      chapterSuggestions: {
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
      },
      styleAnalysis: {
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
      }
    };
  }

  validate(data) {
    const errors = [];

    // 验证 summary
    if (data.summary) {
      errors.push(...this.validateObject(data.summary, this.schema.summary, 'summary'));
    } else {
      errors.push({ field: 'summary', message: '缺失必填字段' });
    }

    // 验证 characters
    if (data.characters) {
      errors.push(...this.validateArray(data.characters, this.schema.characters, 'characters'));
    }

    // 验证 conflicts
    if (data.conflicts) {
      errors.push(...this.validateArray(data.conflicts, this.schema.conflicts, 'conflicts'));
    }

    // 验证 structure
    if (data.structure) {
      errors.push(...this.validateObject(data.structure, this.schema.structure, 'structure'));
    }

    // 验证 rhythm
    if (data.rhythm) {
      errors.push(...this.validateObject(data.rhythm, this.schema.rhythm, 'rhythm'));
    }

    // 验证 emotionCurve
    if (data.emotionCurve) {
      errors.push(...this.validateArray(data.emotionCurve, this.schema.emotionCurve, 'emotionCurve'));
    }

    // 验证 chapterSuggestions
    if (data.chapterSuggestions) {
      errors.push(...this.validateArray(data.chapterSuggestions, this.schema.chapterSuggestions, 'chapterSuggestions'));
    }

    // 验证 styleAnalysis
    if (data.styleAnalysis) {
      errors.push(...this.validateObject(data.styleAnalysis, this.schema.styleAnalysis, 'styleAnalysis'));
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateObject(obj, schema, prefix) {
    const errors = [];

    // 检查必填字段
    if (schema.required) {
      for (const field of schema.required) {
        if (obj[field] === undefined || obj[field] === null) {
          errors.push({ field: `${prefix}.${field}`, message: '缺失必填字段' });
        }
      }
    }

    // 检查类型
    if (schema.types) {
      for (const [field, expectedType] of Object.entries(schema.types)) {
        if (obj[field] !== undefined && !this.checkType(obj[field], expectedType)) {
          errors.push({ field: `${prefix}.${field}`, message: `类型错误，期望 ${expectedType}` });
        }
      }
    }

    // 检查枚举值
    if (schema.enums) {
      for (const [field, allowedValues] of Object.entries(schema.enums)) {
        if (obj[field] !== undefined && !allowedValues.includes(obj[field])) {
          errors.push({ field: `${prefix}.${field}`, message: `值不在允许范围内：${allowedValues.join(', ')}` });
        }
      }
    }

    // 检查数值范围
    if (schema.ranges) {
      for (const [field, range] of Object.entries(schema.ranges)) {
        if (obj[field] !== undefined) {
          const value = parseFloat(obj[field]);
          if (value < range.min || value > range.max) {
            errors.push({ field: `${prefix}.${field}`, message: `值超出范围：${range.min}-${range.max}` });
          }
        }
      }
    }

    return errors;
  }

  validateArray(arr, schema, prefix) {
    const errors = [];

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

  checkType(value, expectedType) {
    if (expectedType === 'string') return typeof value === 'string';
    if (expectedType === 'number') return typeof value === 'number';
    if (expectedType === 'boolean') return typeof value === 'boolean';
    if (expectedType === 'array') return Array.isArray(value);
    if (expectedType === 'object') return typeof value === 'object' && value !== null;
    return true;
  }
}

module.exports = { DataValidator };
