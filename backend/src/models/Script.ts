import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ScriptCreateInput {
  projectId: bigint;
  title: string;
  content: string;
  description?: string;
  version?: number;
}

export interface ScriptUpdateInput {
  title?: string;
  content?: string;
  description?: string;
  version?: number;
  status?: 'draft' | 'published' | 'archived';
}

export class ScriptModel {
  static async create(data: ScriptCreateInput) {
    return prisma.script.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        content: data.content,
        description: data.description,
        version: data.version || 1,
      },
      include: {
        project: true,
        characters: true,
      },
    });
  }

  static async findById(id: bigint) {
    return prisma.script.findUnique({
      where: { id },
      include: {
        project: true,
        characters: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 10,
        },
      },
    });
  }

  static async findByProjectId(projectId: bigint) {
    return prisma.script.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        characters: true,
      },
    });
  }

  static async update(id: bigint, data: ScriptUpdateInput) {
    return prisma.script.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        project: true,
        characters: true,
      },
    });
  }

  static async delete(id: bigint) {
    return prisma.script.delete({
      where: { id },
    });
  }

  static async addVersion(scriptId: bigint, content: string, changeLog?: string) {
    const script = await this.findById(scriptId);
    if (!script) {
      throw new Error('剧本不存在');
    }

    const newVersion = script.version + 1;

    // 保存当前版本到版本历史
    await prisma.scriptVersion.create({
      data: {
        scriptId,
        version: newVersion,
        content: script.content,
        changeLog: changeLog || `版本 ${newVersion}`,
      },
    });

    // 更新剧本内容和版本号
    return prisma.script.update({
      where: { id: scriptId },
      data: {
        content,
        version: newVersion,
        updatedAt: new Date(),
      },
      include: {
        project: true,
        characters: true,
      },
    });
  }

  static async getVersions(scriptId: bigint) {
    return prisma.scriptVersion.findMany({
      where: { scriptId },
      orderBy: { version: 'desc' },
    });
  }

  static async getVersion(scriptId: bigint, version: number) {
    return prisma.scriptVersion.findUnique({
      where: {
        scriptId_version: {
          scriptId,
          version,
        },
      },
    });
  }

  static async linkCharacter(scriptId: bigint, characterId: bigint) {
    return prisma.scriptCharacter.create({
      data: {
        scriptId,
        characterId,
      },
    });
  }

  static async unlinkCharacter(scriptId: bigint, characterId: bigint) {
    return prisma.scriptCharacter.delete({
      where: {
        scriptId_characterId: {
          scriptId,
          characterId,
        },
      },
    });
  }

  static async getLinkedCharacters(scriptId: bigint) {
    return prisma.scriptCharacter.findMany({
      where: { scriptId },
      include: {
        character: true,
      },
    });
  }
}
