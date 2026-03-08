export interface Video {
  id: bigint;
  episodeId: bigint;
  videoUrl: string;
  resolution?: string;
  format?: string;
  duration?: number;
  fileSize?: bigint;
  status: string;
  compositionParams?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
