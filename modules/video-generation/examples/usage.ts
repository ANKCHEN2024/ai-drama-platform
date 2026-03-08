/**
 * 视频生成模块使用示例
 */

import { VideoGenerator } from '../src';
import { config } from '../config/config';

async function main() {
  // 初始化视频生成器
  const generator = new VideoGenerator(config);

  try {
    // 示例 1: 生成单个视频
    console.log('=== 示例 1: 生成单个视频 ===');
    const taskResponse = await generator.generateVideo({
      scene_description: '现代办公室，落地窗，阳光明媚，桌面上有笔记本电脑和咖啡',
      character_description: '年轻女性，黑色长发，穿着白色衬衫，职业装扮',
      action_description: '坐在办公桌前 typing，偶尔抬头微笑看向镜头',
      reference_images: {
        character: 'https://example.com/character.jpg',
      },
      parameters: {
        duration: 5,
        resolution: '720p',
        motion_strength: 5,
      },
      callbacks: {
        on_progress: 'https://your-server.com/webhook/progress',
        on_complete: 'https://your-server.com/webhook/complete',
      },
    });

    console.log('任务已提交:', taskResponse);
    const taskId = taskResponse.task_id;

    // 轮询查询进度
    console.log('\n=== 查询进度 ===');
    while (true) {
      const progress = await generator.getTaskProgress(taskId);
      if (!progress) {
        console.log('任务不存在');
        break;
      }

      console.log(`进度：${progress.progress.percentage}% - ${progress.progress.current_step}`);

      if (progress.status === 'completed') {
        console.log('视频生成完成!');
        console.log('视频 URL:', progress.output?.video_url);
        break;
      }

      if (progress.status === 'failed') {
        console.log('视频生成失败:', progress.error);
        break;
      }

      // 等待 5 秒后再次查询
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // 示例 2: 批量生成视频
    console.log('\n=== 示例 2: 批量生成视频 ===');
    const batchResponse = await generator.generateBatch([
      {
        scene_description: '古代宫殿，金碧辉煌',
        character_description: '皇帝，穿着龙袍，威严',
        action_description: '坐在龙椅上，俯视群臣',
        parameters: { duration: 5 },
      },
      {
        scene_description: '古代宫殿，金碧辉煌',
        character_description: '大臣，穿着官服，恭敬',
        action_description: '跪拜行礼',
        parameters: { duration: 5 },
      },
    ]);

    console.log('批量任务已提交:', batchResponse);

    // 示例 3: 健康检查
    console.log('\n=== 示例 3: 健康检查 ===');
    const health = await generator.healthCheck();
    console.log('系统健康状态:', health);

  } catch (error) {
    console.error('错误:', error);
  } finally {
    // 关闭服务
    await generator.shutdown();
  }
}

// 运行示例
main().catch(console.error);
