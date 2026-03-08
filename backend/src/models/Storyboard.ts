export interface Storyboard {
  id: bigint;
  episodeId: bigint;
  shotNumber: number;
  description?: string;
  visualDescription?: string;
  shotType?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  duration?: number;
  dialogue?: string;
  action?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
