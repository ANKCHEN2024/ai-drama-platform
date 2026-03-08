import Queue from 'bull';
import { StoryJobData } from '../queues/storyQueue';
import { updateTaskProgress, markTaskComplete, markTaskFailed } from '../services/taskService';
import { StoryAnalyzer, StoryAnalysisResult } from '../services/storyAnalysis';
import prisma from '../config/database';

const storyAnalyzer = new StoryAnalyzer();

export const startStoryWorker = (queue: Queue.Queue<StoryJobData>) => {
  queue.process(async (job) => {
    const { projectId, userId, novelText, options } = job.data;
    const projectIdBigInt = BigInt(projectId);
    
    try {
      await updateTaskProgress(job.id?.toString() || '', {
        progress: 10,
        message: '开始分析小说内容...',
        status: 'processing',
      });
      await job.progress(10);

      const analysisResult = await storyAnalyzer.analyze(novelText, {
        episodeCount: options?.episodeCount,
      });

      if (!analysisResult.success || !analysisResult.data) {
        throw new Error(analysisResult.error?.message || '故事分析失败');
      }

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 40,
        message: '提取主要角色...',
        status: 'processing',
      });
      await job.progress(40);

      await saveCharacters(projectIdBigInt, analysisResult.data);

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 60,
        message: '提取场景信息...',
        status: 'processing',
      });
      await job.progress(60);

      await saveScenes(projectIdBigInt, analysisResult.data);

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 80,
        message: '生成分集剧本...',
        status: 'processing',
      });
      await job.progress(80);

      await saveEpisodes(projectIdBigInt, analysisResult.data);

      await prisma.project.update({
        where: { id: projectIdBigInt },
        data: {
          status: 'character_building',
          updatedAt: new Date(),
        },
      });

      await updateTaskProgress(job.id?.toString() || '', {
        progress: 100,
        message: '故事分析完成',
        status: 'completed',
      });
      await job.progress(100);

      await markTaskComplete(job.id?.toString() || '', {
        episodes: analysisResult.data.chapterSuggestions.length,
        characters: analysisResult.data.characters.length,
        scenes: analysisResult.data.scenes.length,
      });

      return {
        success: true,
        projectId,
        episodes: analysisResult.data.chapterSuggestions.length,
        characters: analysisResult.data.characters.length,
        scenes: analysisResult.data.scenes.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await prisma.project.update({
        where: { id: projectIdBigInt },
        data: {
          status: 'failed',
          updatedAt: new Date(),
        },
      }).catch(() => {});
      
      await updateTaskProgress(job.id?.toString() || '', {
        progress: 0,
        message: `故事分析失败: ${errorMessage}`,
        status: 'failed',
      });
      
      await markTaskFailed(job.id?.toString() || '', errorMessage);
      
      throw error;
    }
  });
};

async function saveCharacters(projectId: bigint, analysisData: StoryAnalysisResult): Promise<void> {
  const characters = analysisData.characters.slice(0, 10);
  
  for (const char of characters) {
    await prisma.character.create({
      data: {
        projectId,
        name: char.name,
        description: char.description,
        appearance: char.appearance || '',
        gender: char.gender || '',
        ageRange: char.ageRange || '',
        personality: {
          traits: char.traits,
          role: char.role,
          arc: char.arc,
        },
        status: 'active',
      },
    });
  }
}

async function saveScenes(projectId: bigint, analysisData: StoryAnalysisResult): Promise<void> {
  const scenes = analysisData.scenes.length > 0 
    ? analysisData.scenes 
    : [
        { name: '主场景', description: '主要故事发生场景', locationType: '室内', timeOfDay: '白天', atmosphere: '普通', visualStyle: '写实' }
      ];
  
  for (const scene of scenes.slice(0, 20)) {
    await prisma.scene.create({
      data: {
        projectId,
        name: scene.name,
        description: scene.description,
        locationType: scene.locationType || '',
        timeOfDay: scene.timeOfDay || '',
        atmosphere: scene.atmosphere || '',
        visualStyle: scene.visualStyle || '',
        status: 'active',
      },
    });
  }
}

async function saveEpisodes(projectId: bigint, analysisData: StoryAnalysisResult): Promise<void> {
  const episodes = analysisData.chapterSuggestions.length > 0 
    ? analysisData.chapterSuggestions 
    : Array.from({ length: 10 }, (_, i) => ({
        chapter: i + 1,
        title: `第${i + 1}集`,
        summary: '分集内容',
        keyPlot: '核心情节',
        emotionPeak: '情感高点',
        cliffhanger: '悬念',
      }));
  
  for (const ep of episodes) {
    await prisma.episode.create({
      data: {
        projectId,
        episodeNumber: ep.chapter,
        title: ep.title,
        summary: ep.summary,
        script: `${ep.keyPlot}\n\n${ep.emotionPeak}\n\n${ep.cliffhanger}`,
        status: 'draft',
      },
    });
  }
}

