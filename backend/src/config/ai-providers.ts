export interface AIProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export const tongyiConfig: AIProviderConfig = {
  apiKey: process.env.TONGYI_API_KEY || '',
  baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
  timeout: 60000,
};

export const kelingConfig: AIProviderConfig = {
  apiKey: process.env.KELING_API_KEY || '',
  baseUrl: 'https://api.klingai.com/v1',
  timeout: 120000,
};

export const jimengConfig: AIProviderConfig = {
  apiKey: process.env.JIMENG_API_KEY || '',
  baseUrl: 'https://api.jimeng.com/v1',
  timeout: 120000,
};

export const aliyunVoiceConfig: AIProviderConfig = {
  apiKey: process.env.ALIYUN_VOICE_API_KEY || '',
  baseUrl: 'https://nls-meta.cn-shanghai.aliyuncs.com',
  timeout: 60000,
};

export const neteaseMusicConfig: AIProviderConfig = {
  apiKey: process.env.NETEASE_MUSIC_API_KEY || '',
  baseUrl: 'https://api.music.163.com',
  timeout: 60000,
};
