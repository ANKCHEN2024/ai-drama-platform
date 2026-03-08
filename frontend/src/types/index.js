export interface User {
  id: number
  username: string
  email: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: number
  user_id: number
  name: string
  description?: string
  novel_text?: string
  episode_count: number
  episode_duration: number
  video_ratio: string
  video_quality: string
  status: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Episode {
  id: number
  project_id: number
  episode_number: number
  title?: string
  summary?: string
  script?: string
  status: string
  duration?: number
  created_at: string
  updated_at: string
}

export interface Character {
  id: number
  project_id: number
  name: string
  description?: string
  appearance?: string
  gender?: string
  age_range?: string
  personality: Record<string, any>
  status: string
  created_at: string
  updated_at: string
}

export interface Scene {
  id: number
  project_id: number
  name: string
  description?: string
  location_type?: string
  time_of_day?: string
  atmosphere?: string
  visual_style?: string
  status: string
  created_at: string
  updated_at: string
}

export interface Storyboard {
  id: number
  episode_id: number
  shot_number: number
  description?: string
  visual_description?: string
  shot_type?: string
  camera_angle?: string
  camera_movement?: string
  duration?: number
  dialogue?: string
  action?: string
  status: string
  created_at: string
  updated_at: string
}

export interface Video {
  id: number
  episode_id: number
  video_url: string
  resolution?: string
  format?: string
  duration?: number
  file_size?: number
  status: string
  composition_params: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Audio {
  id: number
  episode_id: number
  character_id?: number
  audio_url: string
  audio_type?: string
  text_content?: string
  voice_id?: string
  synthesis_params: Record<string, any>
  duration?: number
  status: string
  created_at: string
}

export interface Task {
  id: number
  user_id: number
  project_id?: number
  task_type: string
  status: string
  progress: number
  message?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface CreateProjectRequest {
  name: string
  description?: string
  novel_text?: string
  episode_count?: number
  episode_duration?: number
  video_ratio?: string
  video_quality?: string
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {}

export interface GenerateVideoRequest {
  projectId: number
  episodeId?: number
  characters?: number[]
  scenes?: number[]
  storyboards?: number[]
  voiceOptions?: {
    defaultVoice?: string
    characterVoices?: Record<number, string>
  }
  bgmStyle?: string
  outputFormat?: string
}
