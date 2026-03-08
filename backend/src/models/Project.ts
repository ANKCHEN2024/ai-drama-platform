export interface Project {
  id: bigint;
  userId: bigint;
  name: string;
  description?: string;
  novelText?: string;
  episodeCount: number;
  episodeDuration: number;
  videoRatio: string;
  videoQuality: string;
  status: string;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
