export type AudioType = 'tts' | 'bgm' | 'asr';

export interface TTSParameters {
  voice?: string;
  volume?: number;
  speechRate?: number;
  pitchRate?: number;
  format?: 'mp3' | 'wav' | 'pcm';
  sampleRate?: number;
}

export interface SubtitleSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export interface AudioSynthesisInput {
  text: string;
  type: 'tts';
  parameters?: TTSParameters;
  metadata?: {
    project_id?: number;
    episode_id?: number;
    character_id?: number;
  };
}

export interface AudioOutput {
  audio_url: string;
  duration: number;
  format: string;
  file_size?: number;
}

export interface SubtitleInput {
  segments: SubtitleSegment[];
  format?: 'srt' | 'vtt' | 'ass';
  metadata?: {
    project_id?: number;
    episode_id?: number;
  };
}

export interface SubtitleOutput {
  subtitle_url: string;
  format: string;
  segment_count: number;
}
