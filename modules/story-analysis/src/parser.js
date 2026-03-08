/**
 * 响应解析器
 * Response Parser
 */

class ResponseParser {
  parse(apiResponse) {
    try {
      // 尝试直接从 output.text 获取 JSON
      let jsonText = apiResponse.output?.text || apiResponse.output?.choices?.[0]?.message?.content;

      if (!jsonText) {
        throw new Error('API 响应格式异常');
      }

      // 尝试提取 JSON（处理可能的 markdown 包裹）
      jsonText = this.extractJson(jsonText);

      // 解析 JSON
      const data = JSON.parse(jsonText);

      // 标准化数据结构
      return this.normalize(data);

    } catch (error) {
      console.error('解析失败:', error.message);
      throw new Error(`PARSE_ERROR: ${error.message}`);
    }
  }

  extractJson(text) {
    // 去除 markdown 代码块标记
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // 尝试提取第一个完整的 JSON 对象
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    
    return text.trim();
  }

  normalize(data) {
    // 确保所有必填字段存在
    const normalized = {
      summary: data.summary || {
        title: '未命名故事',
        oneLinePitch: '',
        themes: [],
        genres: [],
        tone: '未知',
        targetAudience: '通用'
      },
      characters: Array.isArray(data.characters) ? data.characters : [],
      conflicts: Array.isArray(data.conflicts) ? data.conflicts : [],
      structure: data.structure || {
        actStructure: '3-act',
        acts: []
      },
      rhythm: data.rhythm || {
        pace: 'medium',
        climaxPoints: [],
        tensionCurve: []
      },
      emotionCurve: Array.isArray(data.emotionCurve) ? data.emotionCurve : [],
      chapterSuggestions: Array.isArray(data.chapterSuggestions) ? data.chapterSuggestions : [],
      styleAnalysis: data.styleAnalysis || {
        detectedStyle: '未知',
        confidence: 0.5,
        characteristics: [],
        writingStyle: '未知'
      }
    };

    // 验证并修复数值范围
    normalized.conflicts = normalized.conflicts.map(c => ({
      ...c,
      intensity: this.clamp(c.intensity, 1, 10)
    }));

    normalized.emotionCurve = normalized.emotionCurve.map(e => ({
      ...e,
      intensity: this.clamp(e.intensity, 1, 10)
    }));

    normalized.styleAnalysis.confidence = this.clamp(normalized.styleAnalysis.confidence, 0, 1);

    return normalized;
  }

  clamp(value, min, max) {
    const num = parseFloat(value);
    if (isNaN(num)) return min;
    return Math.min(Math.max(num, min), max);
  }
}

module.exports = { ResponseParser };
