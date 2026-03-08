import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CharacterCreateInput {
  projectId: bigint;
  name: string;
  description?: string;
  appearance?: string;
  gender?: 'male' | 'female' | 'other';
  ageRange?: 'child' | 'teen' | 'young_adult' | 'adult' | 'middle_aged' | 'senior';
  personality?: Record<string, any>;
}

export interface CharacterUpdateInput {
  name?: string;
  description?: string | null;
  appearance?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  ageRange?: 'child' | 'teen' | 'young_adult' | 'adult' | 'middle_aged' | 'senior' | null;
  personality?: Record<string, any> | null;
  status?: 'active' | 'inactive';
}

export class CharacterModel {
  static async create(data: CharacterCreateInput) {
    return prisma.character.create({
      data,
      include: {
        project: true,
        characterImages: true,
      },
    });
  }

  static async findById(id: bigint) {
    return prisma.character.findUnique({
      where: { id },
      include: {
        project: true,
        characterImages: true,
        scripts: {
          include: {
            script: true,
          },
        },
      },
    });
  }

  static async findByProjectId(projectId: bigint) {
    return prisma.character.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        characterImages: true,
      },
    });
  }

  static async update(id: bigint, data: CharacterUpdateInput) {
    return prisma.character.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        project: true,
        characterImages: true,
      },
    });
  }

  static async delete(id: bigint) {
    return prisma.character.delete({
      where: { id },
    });
  }

  static async getLinkedScripts(characterId: bigint) {
    return prisma.scriptCharacter.findMany({
      where: { characterId },
      include: {
        script: true,
      },
    });
  }
}
