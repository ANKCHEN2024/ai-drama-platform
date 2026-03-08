export interface Audio {
  id: bigint;
  episodeId: bigint;
  characterId?: bigint;
  audioUrl: string;
  audioType?: string;
  textContent?: string;
  voiceId?: string;
  synthesisParams?: Record<string, any>;
  duration?: number;
  status: string;
  createdAt: Date;
}
