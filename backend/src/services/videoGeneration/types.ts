export type TaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type APIProvider = 'keling' | 'jimeng';

export interface ReferenceImages {
  character?: string;
  scene?: string;
}

export interface VideoParameters {
  duration?: 5 | 10;
  resolution?: '720p' | '1080p';
  motion_strength?: number;
  style?: string;
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  seed?: number;
  negative_prompt?: string;
}

export interface VideoInput {
  scene_description: string;
  character_description: string;
  action_description: string;
  reference_images?: ReferenceImages;
  parameters?: VideoParameters;
  metadata?: {
    project_id?: number;
    episode_id?: number;
    storyboard_id?: number;
  };
}

export interface VideoOutput {
  video_url: string;
  cover_url: string;
  duration: number;
  resolution: string;
  file_size?: number;
  format?: string;
}

export interface KelingVideoRequest {
  prompt: string;
  negative_prompt?: string;
  reference_image?: string;
  reference_type?: 'character' | 'scene' | 'both';
  duration?: 5 | 10;
  resolution?: '720p' | '1080p';
  motion_strength?: number;
  seed?: number;
}

export interface KelingVideoResponse {
  code: number;
  message: string;
  data: {
    task_id: string;
    status: TaskStatus;
    progress: number;
    video_url?: string;
    cover_url?: string;
    error_message?: string;
  };
}

export interface JimengVideoRequest {
  prompt: string;
  image_prompt?: string;
  video_style?: string;
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  duration?: number;
}

export interface JimengVideoResponse {
  code: number;
  message: string;
  data: {
    task_id: string;
    status: TaskStatus;
    progress: number;
    video_url?: string;
    cover_url?: string;
    error_message?: string;
  };
}
