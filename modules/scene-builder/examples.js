/**
 * Scene Builder 使用示例
 * 
 * 展示如何使用场景构建模块的各种功能
 */

const SceneBuilder = require('./index');

// ============================================
// 示例 1: 基础场景分析
// ============================================
async function example1_basicAnalysis() {
  console.log('=== 示例 1: 基础场景分析 ===\n');
  
  const sceneBuilder = new SceneBuilder({
    apiKey: process.env.DASHSCOPE_API_KEY
  });
  
  const script = `
    清晨，李明坐在办公室里，阳光透过百叶窗洒在桌面上。
    他拿起咖啡杯，轻轻喝了一口，开始查看电脑上的文件。
  `;
  
  const scene = await sceneBuilder.analyze(script);
  
  console.log('场景 ID:', scene.sceneId);
  console.log('地点:', scene.location);
  console.log('时间:', scene.time);
  console.log('氛围:', scene.atmosphere);
  console.log('道具:', scene.props.join(', '));
  console.log('图像提示词:', scene.imagePrompt);
  
  return scene;
}

// ============================================
// 示例 2: 带一致性的场景分析
// ============================================
async function example2_consistentAnalysis() {
  console.log('\n=== 示例 2: 带一致性的场景分析 ===\n');
  
  const sceneBuilder = new SceneBuilder({
    apiKey: process.env.DASHSCOPE_API_KEY
  });
  
  // 第一个镜头
  const scene1 = await sceneBuilder.analyze(
    '清晨，李明坐在办公室里，阳光透过百叶窗洒在桌面上。',
    { sceneId: 'office_001', episodeId: 'ep_001' }
  );
  await sceneBuilder.saveScene(scene1);
  
  // 第二个镜头（同一场景，保持一致性）
  const scene2 = await sceneBuilder.analyze(
    '李明站起身，走到窗边，拉开百叶窗，看向外面的城市。',
    { sceneId: 'office_001', episodeId: 'ep_001' }
  );
  
  console.log('场景 1 种子值:', scene1.consistency.baseSeed);
  console.log('场景 2 种子值:', scene2.consistency.baseSeed);
  console.log('种子值一致:', scene1.consistency.baseSeed === scene2.consistency.baseSeed);
  
  return { scene1, scene2 };
}

// ============================================
// 示例 3: 生成场景图像
// ============================================
async function example3_generateImage() {
  console.log('\n=== 示例 3: 生成场景图像 ===\n');
  
  const sceneBuilder = new SceneBuilder({
    apiKey: process.env.DASHSCOPE_API_KEY
  });
  
  const script = `
    夜晚的咖啡厅，温暖的灯光，小雨敲打着窗户。
    林雪坐在角落的位置，面前放着一杯热咖啡和一本打开的书。
  `;
  
  const scene = await sceneBuilder.analyze(script);
  
  const image = await sceneBuilder.generateImage(scene, {
    width: 1920,
    height: 1080
  });
  
  console.log('图像 URL:', image.imageUrl);
  console.log('种子值:', image.seed);
  console.log '生成耗时:', image.generationTime, '秒');
  
  return { scene, image };
}

// ============================================
// 示例 4: 场景查询
// ============================================
async function example4_queryScenes() {
  console.log('\n=== 示例 4: 场景查询 ===\n');
  
  const sceneBuilder = new SceneBuilder();
  
  // 查询某集的所有场景
  const result = await sceneBuilder.queryScenes({
    episodeId: 'ep_001',
    page: 1,
    pageSize: 10
  });
  
  console.log('场景总数:', result.pagination.total);
  console.log('页码:', result.pagination.page);
  console.log('总页数:', result.pagination.totalPages);
  
  result.scenes.forEach((scene, index) => {
    console.log(`${index + 1}. ${scene.sceneId} - ${scene.location} (${scene.time})`);
  });
  
  return result;
}

// ============================================
// 示例 5: 场景详情
// ============================================
async function example5_getScene() {
  console.log('\n=== 示例 5: 获取场景详情 ===\n');
  
  const sceneBuilder = new SceneBuilder();
  
  const scene = await sceneBuilder.getScene('office_001');
  
  if (scene) {
    console.log('场景 ID:', scene.sceneId);
    console.log('地点:', scene.location);
    console.log('时间:', scene.time);
    console.log('氛围:', scene.atmosphere);
    console.log('道具:', scene.props.join(', '));
    console.log('人物位置:');
    scene.characterPositions.forEach(pos => {
      console.log(`  - ${pos.character}: ${pos.position}`);
    });
    console.log('光影:', scene.lighting);
    console.log('色彩方案:', scene.colorPalette.join(', '));
    console.log('图像提示词:', scene.imagePrompt);
  } else {
    console.log('场景未找到');
  }
  
  return scene;
}

// ============================================
// 示例 6: 一致性检查
// ============================================
async function example6_checkConsistency() {
  console.log('\n=== 示例 6: 一致性检查 ===\n');
  
  const sceneBuilder = new SceneBuilder({
    apiKey: process.env.DASHSCOPE_API_KEY
  });
  
  const referenceScene = {
    location: "现代办公室",
    time: "清晨",
    props: ["办公桌", "百叶窗", "咖啡杯"],
    colorPalette: ["#F5E6D3", "#8B7355"]
  };
  
  const newScene = {
    location: "办公室",
    time: "早上",
    props: ["桌子", "电脑"],
    colorPalette: ["#F5E6D3", "#8B7355"]
  };
  
  const result = await sceneBuilder.checkConsistency('office_001', newScene);
  
  console.log('是否一致:', result.isConsistent);
  console.log('总体评分:', result.overallScore);
  
  if (result.differences.length > 0) {
    console.log('差异:');
    result.differences.forEach(diff => {
      console.log(`  - ${diff.dimension}: "${diff.reference}" vs "${diff.new}" (${diff.severity})`);
    });
  }
  
  if (result.suggestions.length > 0) {
    console.log('建议:');
    result.suggestions.forEach(sug => {
      console.log(`  - ${sug}`);
    });
  }
  
  return result;
}

// ============================================
// 示例 7: 使用自定义提示词模板
// ============================================
async function example7_customPrompt() {
  console.log('\n=== 示例 7: 使用自定义提示词模板 ===\n');
  
  const sceneBuilder = new SceneBuilder();
  
  // 获取内置模板
  const template = sceneBuilder.getPromptTemplate('SCENE_ANALYSIS_PROMPT');
  console.log('基础分析模板:');
  console.log(template.substring(0, 200) + '...\n');
  
  // 获取情绪修饰词
  const emotionModifiers = sceneBuilder.prompts.EMOTION_MODIFIERS;
  console.log('情绪修饰词 - 紧张:', emotionModifiers.tense);
  console.log('情绪修饰词 - 温馨:', emotionModifiers.warm);
  
  // 获取色彩方案
  const colorSchemes = sceneBuilder.prompts.COLOR_SCHEMES;
  console.log('暖色调方案:', colorSchemes.warm.join(', '));
  console.log('冷色调方案:', colorSchemes.cool.join(', '));
}

// ============================================
// 示例 8: 完整工作流
// ============================================
async function example8_fullWorkflow() {
  console.log('\n=== 示例 8: 完整工作流 ===\n');
  
  const sceneBuilder = new SceneBuilder({
    apiKey: process.env.DASHSCOPE_API_KEY
  });
  
  // 1. 分析剧本
  console.log('步骤 1: 分析剧本...');
  const script = `
    场景：咖啡厅 - 夜晚
    林雪推开门，风铃叮当作响。咖啡厅里放着轻柔的爵士乐，
    温暖的灯光洒在木质桌椅上。她走向角落的位置，那里已经
    坐着一个男人，正在搅拌着面前的咖啡。
  `;
  
  const scene = await sceneBuilder.analyze(script, {
    episodeId: 'ep_001',
    style: 'romantic_soft'
  });
  console.log('✓ 场景分析完成');
  
  // 2. 保存场景
  console.log('步骤 2: 保存场景...');
  await sceneBuilder.saveScene(scene);
  console.log('✓ 场景已保存');
  
  // 3. 生成图像
  console.log('步骤 3: 生成场景图像...');
  const image = await sceneBuilder.generateImage(scene);
  console.log('✓ 图像已生成:', image.imageUrl);
  
  // 4. 查询场景
  console.log('步骤 4: 查询场景库...');
  const scenes = await sceneBuilder.queryScenes({
    episodeId: 'ep_001'
  });
  console.log('✓ 找到', scenes.scenes.length, '个场景');
  
  return { scene, image, scenes };
}

// ============================================
// 运行所有示例
// ============================================
async function runAllExamples() {
  try {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Scene Builder 使用示例               ║');
    console.log('╚════════════════════════════════════════╝');
    
    // 注意：实际运行时需要设置环境变量
    // export DASHSCOPE_API_KEY=your_api_key
    
    await example1_basicAnalysis();
    await example7_customPrompt();
    // 以下示例需要 API Key 和数据库
    // await example2_consistentAnalysis();
    // await example3_generateImage();
    // await example4_queryScenes();
    // await example5_getScene();
    // await example6_checkConsistency();
    // await example8_fullWorkflow();
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   示例运行完成                         ║');
    console.log('╚════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('运行示例时出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

module.exports = {
  example1_basicAnalysis,
  example2_consistentAnalysis,
  example3_generateImage,
  example4_queryScenes,
  example5_getScene,
  example6_checkConsistency,
  example7_customPrompt,
  example8_fullWorkflow,
  runAllExamples
};
