# 使用示例

## 快速开始

### 1. 安装依赖

```bash
cd modules/character-builder
npm install
```

### 2. 配置环境变量

```bash
export DASHSCOPE_API_KEY=your_api_key_here
```

### 3. 基本使用

```javascript
const CharacterBuilder = require('./src/index');

// 创建实例
const builder = new CharacterBuilder({
  apiKey: process.env.DASHSCOPE_API_KEY,
  model: 'qwen-plus'
});

// 分析故事文本
const story = `
  林小雅，25 岁，是一家广告公司的创意总监。
  她有一头乌黑的长发，总是穿着得体的职业装。
  性格独立坚强，但内心柔软。
  与同事张伟是多年的好友...
`;

async function main() {
  const result = await builder.analyze(story);
  
  if (result.success) {
    console.log('分析成功！');
    console.log(`发现 ${result.data.metadata.characterCount} 个人物`);
    console.log(JSON.stringify(result.data.characters[0], null, 2));
  } else {
    console.error('分析失败:', result.error);
  }
}

main();
```

---

## 进阶用法

### 批量分析

```javascript
const texts = [
  '第一集：林小雅初次登场...',
  '第二集：林小雅与张伟的对话...',
  '第三集：林小雅面临挑战...'
];

const result = await builder.batchAnalyze(texts, {
  mergeCharacters: true,  // 自动合并相同人物
  model: 'qwen-plus'
});

console.log(`合并后有 ${result.data.characters.length} 个独立人物`);
```

### 生成一致性描述

```javascript
const character = result.data.characters[0];

const consistency = await builder.generateConsistency(character, {
  scene: '办公室',
  emotion: '专注'
});

console.log('AI 生成提示词:', consistency.data.prompt);
```

### 更新人物档案

```javascript
const updates = {
  clothing: {
    style: '休闲风',
    overallDescription: '周末休闲装扮，T 恤配牛仔裤'
  }
};

const updateResult = await builder.updateCharacter('char_001', updates);
console.log('更新成功:', updateResult.data.changes);
```

### 使用自定义提示词

```javascript
const template = builder.getPromptTemplate('character-analysis');
console.log('提示词模板:', template);

// 或者使用增强版
const enhancedTemplate = builder.getPromptTemplate('system-enhanced');
```

---

## 完整示例：从故事到视频生成

```javascript
const CharacterBuilder = require('./src/index');
const fs = require('fs');

async function fullWorkflow() {
  // 1. 初始化
  const builder = new CharacterBuilder({
    apiKey: process.env.DASHSCOPE_API_KEY,
    model: 'qwen-plus'
  });

  // 2. 读取故事文本
  const story = fs.readFileSync('story.txt', 'utf-8');

  // 3. 分析人物
  console.log('正在分析人物...');
  const analysisResult = await builder.analyze(story);
  
  if (!analysisResult.success) {
    throw new Error(analysisResult.error.message);
  }

  const characters = analysisResult.data.characters;
  console.log(`发现 ${characters.length} 个人物`);

  // 4. 为每个人物生成一致性描述
  for (const character of characters) {
    console.log(`\n处理人物：${character.name}`);
    
    const consistencyResult = await builder.generateConsistency(character);
    character.consistency = consistencyResult.data;
    
    // 5. 导出人物档案
    const exportData = {
      ...character,
      exportTime: new Date().toISOString()
    };
    
    fs.writeFileSync(
      `output/${character.id}.json`,
      JSON.stringify(exportData, null, 2)
    );
    
    console.log(`✓ 已导出：${character.id}.json`);
  }

  // 6. 导出汇总报告
  const report = {
    project: 'AI 短剧项目',
    analysisTime: analysisResult.data.metadata.processingTime,
    characterCount: characters.length,
    characters: characters.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
      prompt: c.consistency.prompt
    }))
  };
  
  fs.writeFileSync('output/character-report.json', JSON.stringify(report, null, 2));
  console.log('\n✓ 完成！报告已导出到 output/character-report.json');
}

fullWorkflow().catch(console.error);
```

---

## 错误处理

```javascript
try {
  const result = await builder.analyze(story);
  
  if (!result.success) {
    switch (result.error.code) {
      case 'RATE_LIMIT':
        console.log('频率限制，等待后重试...');
        await sleep(1000);
        return builder.analyze(story);
        
      case 'INVALID_INPUT':
        console.log('输入格式错误，请检查故事文本');
        break;
        
      case 'ANALYSIS_ERROR':
        console.log('分析失败:', result.error.message);
        break;
        
      default:
        console.log('未知错误:', result.error);
    }
    return;
  }
  
  // 处理成功结果
  console.log(result.data);
  
} catch (error) {
  console.error('未处理的错误:', error);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 性能优化

### 并发分析

```javascript
const stories = [story1, story2, story3, story4, story5];

// 限制并发数为 3
async function analyzeWithConcurrency(items, concurrency = 3) {
  const results = [];
  const executing = [];
  
  for (const item of items) {
    const promise = builder.analyze(item).then(result => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

const allResults = await analyzeWithConcurrency(stories, 3);
```

### 缓存结果

```javascript
const cache = new Map();

async function analyzeWithCache(text) {
  const cacheKey = `analysis_${Buffer.from(text).toString('base64')}`;
  
  if (cache.has(cacheKey)) {
    console.log('使用缓存结果');
    return cache.get(cacheKey);
  }
  
  const result = await builder.analyze(text);
  cache.set(cacheKey, result);
  
  // 限制缓存大小
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  
  return result;
}
```

---

## 集成到现有项目

### Express API

```javascript
const express = require('express');
const CharacterBuilder = require('./src/index');

const app = express();
const builder = new CharacterBuilder({
  apiKey: process.env.DASHSCOPE_API_KEY
});

app.use(express.json());

app.post('/api/characters/analyze', async (req, res) => {
  try {
    const { text, options } = req.body;
    const result = await builder.analyze(text, options);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 数据库集成

```javascript
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function saveCharacter(character) {
  const query = `
    INSERT INTO characters (id, name, age, gender, appearance, personality, clothing, consistency, project_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      appearance = EXCLUDED.appearance,
      personality = EXCLUDED.personality,
      clothing = EXCLUDED.clothing,
      consistency = EXCLUDED.consistency,
      updated_at = NOW()
  `;
  
  const values = [
    character.id,
    character.name,
    character.age,
    character.gender,
    JSON.stringify(character.appearance),
    JSON.stringify(character.personality),
    JSON.stringify(character.clothing),
    JSON.stringify(character.consistency),
    character.projectId
  ];
  
  await pool.query(query, values);
}

// 使用
const result = await builder.analyze(story);
for (const character of result.data.characters) {
  await saveCharacter({ ...character, projectId: 'proj_001' });
}
```

---

## 调试技巧

### 启用详细日志

```javascript
const builder = new CharacterBuilder({
  apiKey: process.env.DASHSCOPE_API_KEY,
  debug: true  // 启用调试模式
});

// 或者设置环境变量
// export DEBUG=character-builder:*
```

### 查看原始响应

```javascript
const analyzer = require('./src/analyzer');

// 临时修改分析函数以查看原始响应
const originalAnalyze = analyzer.analyzeText;
analyzer.analyzeText = async function(client, text, options) {
  const result = await originalAnalyze(client, text, options);
  console.log('原始响应:', result);
  return result;
};
```

---

## 最佳实践

1. **合理设置温度参数**: 创造性任务用 0.7-0.9，事实性任务用 0.3-0.5
2. **分批处理长文本**: 超过 10000 字符的故事分批次分析
3. **缓存分析结果**: 避免重复分析相同内容
4. **错误重试**: 对网络错误和频率限制实现重试机制
5. **定期备份**: 定期导出人物档案到文件

---

## 常见问题

**Q: API 调用失败怎么办？**
A: 检查 API Key 是否正确，确认账户余额充足，查看错误码并参考 API 文档。

**Q: 分析结果不准确？**
A: 尝试使用 `qwen-max` 模型，或在故事文本中添加更多人物细节描述。

**Q: 如何保持多个人物的一致性？**
A: 使用 `batchAnalyze` 并启用 `mergeCharacters` 选项，系统会自动识别和合并相同人物。

**Q: 提示词生成效果不好？**
A: 检查人物档案的完整性，确保外貌和服装描述具体可视觉化。
