/**
 * Phase 3 P4 - 完整工作流程示例
 * 
 * 这个脚本演示了从剧本生成到视频合成的完整流程
 */

const API_BASE_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = 'your_jwt_token_here';

// 辅助函数：发起 API 请求
async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'API request failed');
  }

  return data.data;
}

// 辅助函数：轮询任务状态
async function pollTaskStatus(jobId, interval = 5000, timeout = 3600000) {
  const startTime = Date.now();

  console.log(`⏳ 等待任务完成: ${jobId}`);

  while (Date.now() - startTime < timeout) {
    const status = await apiRequest(`/ai/task/${jobId}/status`);
    
    console.log(`📊 进度：${status.progress}% - ${status.status}`);

    if (status.status === 'completed') {
      console.log('✅ 任务完成!');
      return status;
    }

    if (status.status === 'failed') {
      throw new Error(`任务失败：${status.errorMessage}`);
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('任务超时');
}

// 主流程：完整视频生成
async function completeWorkflow() {
  try {
    console.log('🎬 开始 AI 视频生成流程...\n');

    // ========== 步骤 1: 生成剧本 ==========
    console.log('📝 步骤 1: 生成剧本');
    const scriptResult = await apiRequest('/ai/generate/script', 'POST', {
      projectId: 1,
      episodeNumber: 1,
      seasonNumber: 1,
      genre: '都市情感',
      tone: '轻松幽默',
      keywords: ['爱情', '职场', '成长'],
      customRequirements: '希望有更多反转剧情',
    });

    console.log(`✓ 剧本生成完成`);
    console.log(`  标题：${scriptResult.title}`);
    console.log(`  分集 ID: ${scriptResult.episodeId}\n`);

    const episodeId = scriptResult.episodeId;

    // ========== 步骤 2: 生成分镜 ==========
    console.log('🎨 步骤 2: 生成分镜');
    const storyboardResult = await apiRequest('/ai/generate/storyboard', 'POST', {
      episodeId,
    });

    console.log(`✓ 分镜生成完成`);
    console.log(`  分镜数量：${storyboardResult.storyboardCount}\n`);

    // ========== 步骤 3: 批量生成视频 ==========
    console.log('🎥 步骤 3: 批量生成视频');
    const videoBatchResult = await apiRequest('/ai/generate/video/batch', 'POST', {
      episodeId,
      style: '写实风格',
      resolution: '720p',
    });

    console.log(`✓ 已创建 ${videoBatchResult.sceneCount} 个视频生成任务`);
    console.log(`  任务 IDs: ${videoBatchResult.jobIds.join(', ')}\n`);

    // 等待所有视频生成任务完成
    console.log('⏳ 等待所有视频生成完成...');
    const allTasks = await Promise.allSettled(
      videoBatchResult.jobIds.map(jobId => pollTaskStatus(jobId))
    );

    const completedTasks = allTasks.filter(t => t.status === 'fulfilled');
    const failedTasks = allTasks.filter(t => t.status === 'rejected');

    console.log(`✓ 视频生成完成`);
    console.log(`  成功：${completedTasks.length}`);
    console.log(`  失败：${failedTasks.length}\n`);

    if (failedTasks.length > 0) {
      console.warn('⚠️  部分任务失败，但继续合成流程...');
    }

    // ========== 步骤 4: 合成视频 ==========
    console.log('🔗 步骤 4: 合成视频');
    const composeResult = await apiRequest('/ai/generate/compose', 'POST', {
      projectId: 1,
      episodeId,
      bgmPath: '/path/to/background-music.mp3',
      transitionDuration: 0.5,
    });

    console.log(`✓ 视频合成任务已创建`);
    console.log(`  任务 ID: ${composeResult.jobId}\n`);

    // 等待合成完成
    console.log('⏳ 等待视频合成完成...');
    const finalResult = await pollTaskStatus(composeResult.jobId);

    console.log('\n🎉 完整流程完成!');
    console.log(`📹 最终视频：${finalResult.videoUrl}`);
    console.log(`🖼️  缩略图：${finalResult.thumbnailUrl}`);

    return {
      episodeId,
      scriptResult,
      storyboardResult,
      videoBatchResult,
      composeResult,
      finalVideo: finalResult,
    };

  } catch (error) {
    console.error('❌ 流程失败:', error.message);
    throw error;
  }
}

// ========== 使用示例 ==========

// 示例 1: 运行完整流程
async function example1() {
  try {
    const result = await completeWorkflow();
    console.log('\n✅ 所有步骤完成!');
  } catch (error) {
    console.error('\n❌ 流程中断:', error.message);
  }
}

// 示例 2: 仅生成剧本
async function example2() {
  const script = await apiRequest('/ai/generate/script', 'POST', {
    projectId: 1,
    episodeNumber: 2,
    genre: '悬疑',
    tone: '紧张刺激',
  });

  console.log('剧本生成完成:', script.title);
}

// 示例 3: 监控任务进度
async function example3(jobId) {
  const status = await apiRequest(`/ai/task/${jobId}/status`);
  console.log('任务状态:', status);
}

// 示例 4: 查看队列统计
async function example4() {
  const stats = await apiRequest('/ai/queue/stats');
  console.log('队列统计:', stats);
}

// 示例 5: 查看生成历史
async function example5() {
  const history = await apiRequest('/ai/video/history?page=1&limit=10');
  console.log('生成历史:', history);
}

// 运行示例
if (require.main === module) {
  // 修改这里来选择不同的示例
  example1();
  // example2();
  // example3('job_id_here');
  // example4();
  // example5();
}

module.exports = {
  completeWorkflow,
  apiRequest,
  pollTaskStatus,
  example1,
  example2,
  example3,
  example4,
  example5,
};
