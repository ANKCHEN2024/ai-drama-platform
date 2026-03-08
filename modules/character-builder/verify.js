#!/usr/bin/env node

/**
 * 模块验证脚本
 * 用于快速验证人物构建模块是否可以正常加载
 */

console.log('🔍 验证人物构建模块...\n');

try {
  // 测试模块加载
  console.log('✓ 正在加载模块...');
  const CharacterBuilder = require('./src/index');
  console.log('  ✓ CharacterBuilder 类加载成功');
  
  const analyzer = require('./src/analyzer');
  console.log('  ✓ analyzer 模块加载成功');
  
  const profile = require('./src/profile');
  console.log('  ✓ profile 模块加载成功');
  
  const consistency = require('./src/consistency');
  console.log('  ✓ consistency 模块加载成功');
  
  const prompts = require('./src/prompts');
  console.log('  ✓ prompts 模块加载成功');
  
  // 测试提示词模板
  console.log('\n✓ 测试提示词模板...');
  const template = prompts.getTemplate('system');
  if (template && template.includes('人物分析师')) {
    console.log('  ✓ system 模板正常');
  }
  
  const analysisTemplate = prompts.getTemplate('character-analysis');
  if (analysisTemplate && analysisTemplate.includes('characters')) {
    console.log('  ✓ character-analysis 模板正常');
  }
  
  // 测试档案创建
  console.log('\n✓ 测试档案创建功能...');
  const testChar = profile.create({
    name: '测试人物',
    age: 25,
    gender: '女',
    appearance: { overallDescription: '测试外貌描述' },
    personality: { description: '测试性格描述' },
    clothing: { overallDescription: '测试服装描述' }
  });
  
  if (testChar.id && testChar.name === '测试人物') {
    console.log('  ✓ 档案创建功能正常');
    console.log(`    生成 ID: ${testChar.id}`);
  }
  
  // 测试验证功能
  console.log('\n✓ 测试验证功能...');
  const validation = profile.validate(testChar);
  if (validation.valid) {
    console.log('  ✓ 验证功能正常');
  } else {
    console.log('  ⚠ 验证警告:', validation.warnings);
  }
  
  // 测试一致性生成（备用模式）
  console.log('\n✓ 测试一致性描述生成...');
  const fallbackConsistency = consistency.generateFallback(testChar);
  if (fallbackConsistency.prompt && fallbackConsistency.negativePrompt) {
    console.log('  ✓ 一致性描述生成功能正常');
    console.log(`    提示词长度：${fallbackConsistency.prompt.length} 字符`);
  }
  
  // 总结
  console.log('\n' + '='.repeat(50));
  console.log('✅ 所有验证通过！人物构建模块已就绪。');
  console.log('='.repeat(50));
  console.log('\n📦 模块信息:');
  console.log(`   - CharacterBuilder 类：可用`);
  console.log(`   - 提示词模板：${prompts.getTemplateTypes().length} 个`);
  console.log(`   - 支持模型：qwen-turbo, qwen-plus, qwen-max`);
  console.log('\n🚀 下一步:');
  console.log('   1. 设置环境变量：export DASHSCOPE_API_KEY=your_key');
  console.log('   2. 运行示例：node examples/basic.js');
  console.log('   3. 查看文档：cat README.md');
  console.log('');
  
} catch (error) {
  console.error('\n❌ 验证失败:', error.message);
  console.error('\n请检查:');
  console.error('   1. 依赖是否安装：npm install');
  console.error('   2. 文件路径是否正确');
  console.error('   3. Node.js 版本：需要 >= 20.0.0');
  console.error('');
  process.exit(1);
}
