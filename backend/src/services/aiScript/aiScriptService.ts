import axios from 'axios';
import logger from '../../utils/logger';
import { prisma } from '../../config/database';

export interface ScriptGenerationRequest {
  projectId: number;
  episodeNumber: number;
  seasonNumber?: number;
  genre?: string;
  tone?: string;
  keywords?: string[];
  previousEpisodeSummary?: string;
  customRequirements?: string;
}

export interface ScriptGenerationResult {
  success: boolean;
  episodeId?: number;
  title?: string;
  summary?: string;
  script?: string;
  characterAssignments?: CharacterAssignment[];
  errorMessage?: string;
}

export interface CharacterAssignment {
  characterId: number;
  characterName: string;
  role: string;
  dialogues: number;
}

export class AIScriptService {
  private apiKey: string;
  private apiEndpoint: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.DASHSCOPE_API_KEY || '';
    this.apiEndpoint = process.env.DASHSCOPE_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1';
    this.model = process.env.DASHSCOPE_MODEL || 'qwen-max';
  }

  /**
   * 生成剧本
   */
  async generateScript(request: ScriptGenerationRequest): Promise<ScriptGenerationResult> {
    try {
      logger.info('Starting AI script generation', {
        projectId: request.projectId,
        episodeNumber: request.episodeNumber,
      });

      // 获取项目信息
      const project = await prisma.project.findUnique({
        where: { id: request.projectId },
        include: {
          characters: {
            where: { status: 'active' },
            include: {
              characterImages: {
                take: 1,
              },
            },
          },
          seasons: request.seasonNumber ? {
            where: { number: request.seasonNumber },
            include: {
              episodes: {
                orderBy: { number: 'asc' },
                take: request.episodeNumber - 1,
              },
            },
          } : undefined,
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 构建提示词
      const prompt = this.buildScriptPrompt(project, request);

      // 调用大模型 API
      const llmResponse = await this.callLLMAPI(prompt);

      // 解析响应
      const parsedResult = this.parseLLMResponse(llmResponse);

      // 创建或更新分集记录
      const episode = await this.createOrUpdateEpisode(
        request.projectId,
        request.episodeNumber,
        request.seasonNumber,
        parsedResult
      );

      logger.info('Script generation completed', {
        episodeId: episode.id,
        title: parsedResult.title,
      });

      return {
        success: true,
        episodeId: Number(episode.id),
        title: parsedResult.title,
        summary: parsedResult.summary,
        script: parsedResult.script,
        characterAssignments: parsedResult.characterAssignments,
      };
    } catch (error) {
      logger.error('Script generation failed', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 构建剧本生成提示词
   */
  private buildScriptPrompt(project: any, request: ScriptGenerationRequest): string {
    const characterList = project.characters.map((c: any) => 
      `- ${c.name} (${c.gender || '未知'}, ${c.ageRange || '未知'}): ${c.description || ''}`
    ).join('\n');

    const previousEpisodes = project.seasons?.[0]?.episodes || [];
    const previousSummary = previousEpisodes.length > 0
      ? previousEpisodes.map((e: any) => `第${e.number}集：${e.summary || e.title || '无标题'}`).join('\n')
      : '这是第一集';

    const genre = request.genre || '都市情感';
    const tone = request.tone || '轻松幽默';
    const keywords = request.keywords?.join(', ') || '爱情，成长，友情';

    return `你是一位专业的短剧编剧，擅长创作${genre}类型的剧本。

## 项目信息
- 项目名称：${project.name}
- 总集数：${project.episodeCount}集
- 每集时长：${project.episodeDuration}秒
- 视频比例：${project.videoRatio}

## 角色列表
${characterList}

## 前情提要
${previousSummary}

## 本集要求
- 集数：第${request.episodeNumber}集
- 类型：${genre}
- 基调：${tone}
- 关键词：${keywords}
${request.customRequirements ? `\n- 特殊要求：${request.customRequirements}` : ''}
${request.previousEpisodeSummary ? `\n- 上集总结：${request.previousEpisodeSummary}` : ''}

## 输出格式
请严格按照以下 JSON 格式输出：
{
  "title": "本集标题（不超过 20 字）",
  "summary": "本集剧情概要（100-200 字）",
  "script": "完整剧本内容，包含场景描述、角色对话、动作指示",
  "characterAssignments": [
    {
      "characterName": "角色名",
      "role": "主角/配角/客串",
      "dialogues": 对话次数（数字）
    }
  ]
}

## 创作要求
1. 剧本要符合短视频节奏，每集要有明确的冲突和高潮
2. 对话要简洁有力，符合角色性格
3. 场景转换要清晰，便于后续分镜制作
4. 结尾要留有悬念，吸引观众继续观看
5. 总字数控制在${project.episodeDuration * 3}字以内（按正常语速计算）

请开始创作：`;
  }

  /**
   * 调用大模型 API
   */
  private async callLLMAPI(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiEndpoint}/services/aigc/text-generation/generation`,
        {
          model: this.model,
          input: {
            messages: [
              {
                role: 'system',
                content: '你是一位专业的短剧编剧，擅长创作各种类型的短视频剧本。请严格按照用户要求的格式输出 JSON 内容。',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
          },
          parameters: {
            result_format: 'message',
            temperature: 0.8,
            max_tokens: 4000,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      return response.data.output?.choices?.[0]?.message?.content || '';
    } catch (error) {
      logger.error('LLM API call failed', error);
      throw new Error('大模型调用失败，请稍后重试');
    }
  }

  /**
   * 解析 LLM 响应
   */
  private parseLLMResponse(response: string): {
    title: string;
    summary: string;
    script: string;
    characterAssignments: CharacterAssignment[];
  } {
    try {
      // 尝试提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法解析响应内容');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // 关联角色 ID
      const characterAssignments: CharacterAssignment[] = [];
      
      return {
        title: parsed.title || '未命名剧集',
        summary: parsed.summary || '',
        script: parsed.script || '',
        characterAssignments,
      };
    } catch (error) {
      logger.error('Failed to parse LLM response', error);
      // 如果解析失败，返回基础结构
      return {
        title: 'AI 生成剧集',
        summary: response.substring(0, 200),
        script: response,
        characterAssignments: [],
      };
    }
  }

  /**
   * 创建或更新分集记录
   */
  private async createOrUpdateEpisode(
    projectId: number,
    episodeNumber: number,
    seasonNumber: number | undefined,
    parsedResult: any
  ): Promise<any> {
    // 查找是否存在现有记录
    const existingEpisode = await prisma.episodeV2.findUnique({
      where: {
        projectId_number: {
          projectId,
          number: episodeNumber,
        },
      },
    });

    if (existingEpisode) {
      // 更新现有记录
      return await prisma.episodeV2.update({
        where: { id: existingEpisode.id },
        data: {
          title: parsedResult.title,
          description: parsedResult.summary,
          status: 'draft',
        },
      });
    }

    // 创建新记录
    return await prisma.episodeV2.create({
      data: {
        projectId,
        seasonId: seasonNumber ? undefined : undefined, // TODO: 关联季度
        number: episodeNumber,
        title: parsedResult.title,
        description: parsedResult.summary,
        status: 'draft',
      },
    });
  }

  /**
   * 根据剧本生成分镜
   */
  async generateStoryboardsFromScript(episodeId: number): Promise<{
    success: boolean;
    storyboardCount?: number;
    errorMessage?: string;
  }> {
    try {
      logger.info('Generating storyboards from script', { episodeId });

      // 获取剧集信息
      const episode = await prisma.episodeV2.findUnique({
        where: { id: episodeId },
        include: {
          project: {
            include: {
              characters: {
                where: { status: 'active' },
              },
            },
          },
        },
      });

      if (!episode) {
        throw new Error('Episode not found');
      }

      // 构建分镜生成提示词
      const prompt = this.buildStoryboardPrompt(episode);

      // 调用 LLM 生成分镜
      const llmResponse = await this.callLLMAPI(prompt);

      // 解析分镜数据
      const storyboards = this.parseStoryboardResponse(llmResponse);

      // 批量创建分镜记录
      const createdStoryboards = await prisma.sceneV2.createMany({
        data: storyboards.map((sb, index) => ({
          episodeId,
          number: index + 1,
          location: sb.location,
          timeOfDay: sb.timeOfDay,
          content: sb.content,
          dialogue: sb.dialogue || '',
          duration: sb.duration || 10,
          status: 'draft',
        })),
      });

      logger.info('Storyboards generated', {
        episodeId,
        count: createdStoryboards.count,
      });

      return {
        success: true,
        storyboardCount: createdStoryboards.count,
      };
    } catch (error) {
      logger.error('Storyboard generation failed', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 构建分镜生成提示词
   */
  private buildStoryboardPrompt(episode: any): string {
    return `你是一位专业的分镜师，请将以下剧集内容转换为分镜脚本。

## 剧集信息
- 标题：${episode.title}
- 描述：${episode.description}
- 时长：约${episode.project.episodeDuration}秒

## 角色列表
${episode.project.characters.map((c: any) => `- ${c.name}: ${c.description || ''}`).join('\n')}

## 输出格式
请严格按照以下 JSON 格式输出分镜数组：
[
  {
    "number": 1,
    "location": "场景（如：室内 - 客厅/室外 - 街道）",
    "timeOfDay": "时间（日/夜/黄昏/黎明）",
    "content": "画面描述（包括角色动作、表情、镜头运动）",
    "dialogue": "角色对话（如有）",
    "duration": 预计时长（秒，5-15 秒之间）
  }
]

## 分镜要求
1. 每个分镜时长控制在 5-15 秒
2. 总时长接近${episode.project.episodeDuration}秒
3. 场景转换要清晰
4. 对话要分配到具体分镜中
5. 包含镜头运动指示（推/拉/摇/移等）
6. 描述要具体，便于 AI 视频生成

请开始分镜设计：`;
  }

  /**
   * 解析分镜响应
   */
  private parseStoryboardResponse(response: string): Array<{
    number: number;
    location: string;
    timeOfDay: string;
    content: string;
    dialogue?: string;
    duration?: number;
  }> {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('无法解析分镜响应');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse storyboard response', error);
      // 返回默认分镜
      return [
        {
          number: 1,
          location: '室内',
          timeOfDay: '日',
          content: response.substring(0, 200),
          duration: 10,
        },
      ];
    }
  }
}

export const aiScriptService = new AIScriptService();
