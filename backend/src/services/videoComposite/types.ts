export interface Transition {
  type: 'fade' | 'slide' | 'wipe' | 'dissolve';
  duration: number;
}

export interface VideoCompositeInput {
  videoClips: string[];
  voiceOver?: string;
  bgm?: string;
  sfx?: string[];
  subtitles?: string;
  transitions?: Transition[];
  metadata?: {
    project_id?: number;
    episode_id?: number;
  };
  outputOptions?: {
    resolution?: string;
    fps?: number;
    videoCodec?: string;
    videoBitrate?: string;
    audioCodec?: string;
    audioBitrate?: string;
  };
}

export interface VideoCompositeOutput {
  video_url: string;
  preview_url?: string;
  thumbnail_url?: string;
  duration: number;
  resolution: string;
  file_size?: number;
}
