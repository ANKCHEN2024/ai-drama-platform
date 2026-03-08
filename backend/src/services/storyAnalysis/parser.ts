export interface Character {
  name: string;
  role: string;
  description: string;
  traits: string[];
  arc: string;
  appearance?: string;
  gender?: string;
  ageRange?: string;
}

export interface Scene {
  name: string;
  description: string;
  locationType?: string;
  timeOfDay?: string;
  atmosphere?: string;
  visualStyle?: string;
}

export interface Conflict {
  type: string;
  description: string;
  parties: string[];
  intensity: number;
  resolution: string;
}

export interface Act {
  name: string;
  description: string;
  chapters: string[];
  keyEvents: string[];
}

export interface Structure {
  actStructure: string;
  acts: Act[];
}

export interface Rhythm {
  pace: string;
  climaxPoints: string[];
  tensionCurve: number[];
}

export interface EmotionPoint {
  chapter: number;
  emotion: string;
  intensity: number;
  description: string;
}

export interface ChapterSuggestion {
  chapter: number;
  title: string;
  summary: string;
  keyPlot: string;
  emotionPeak: string;
  cliffhanger: string;
}

export interface StyleAnalysis {
  detectedStyle: string;
  confidence: number;
  characteristics: string[];
  writingStyle: string;
}

export interface StoryAnalysisResult {
  summary: {
    title: string;
    oneLinePitch: string;
    themes: string[];
    genres: string[];
    tone: string;
    targetAudience: string;
  };
  characters: Character[];
  scenes: Scene[];
  conflicts: Conflict[];
  structure: Structure;
  rhythm: Rhythm;
  emotionCurve: EmotionPoint[];
  chapterSuggestions: ChapterSuggestion[];
  styleAnalysis: StyleAnalysis;
}

export class ResponseParser {
  parse(apiResponse: any): StoryAnalysisResult {
    try {
      let jsonText = apiResponse.output?.text || 
        apiResponse.output?.choices?.[0]?.message?.content ||
        apiResponse.message?.content;

      if (!jsonText) {
        throw new Error('API 响应格式异常');
      }

      jsonText = this.extractJson(jsonText);
      const data = JSON.parse(jsonText);
      return this.normalize(data);
    } catch (error) {
      console.error('解析失败:', error);
      throw new Error(`PARSE_ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractJson(text: string): string {
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    return text.trim();
  }

  private normalize(data: any): StoryAnalysisResult {
    const normalized: StoryAnalysisResult = {
      summary: data.summary || {
        title: '未命名故事',
        oneLinePitch: '',
        themes: [],
        genres: [],
        tone: '未知',
        targetAudience: '通用'
      },
      characters: Array.isArray(data.characters) ? data.characters : [],
      scenes: Array.isArray(data.scenes) ? data.scenes : [],
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

  private clamp(value: any, min: number, max: number): number {
    const num = parseFloat(value);
    if (isNaN(num)) return min;
    return Math.min(Math.max(num, min), max);
  }
}
