export interface Scene {
  id: bigint;
  projectId: bigint;
  name: string;
  description?: string;
  locationType?: string;
  timeOfDay?: string;
  atmosphere?: string;
  visualStyle?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
