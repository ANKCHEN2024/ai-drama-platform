export interface User {
  id: bigint;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}
