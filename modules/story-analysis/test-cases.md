# 🧪 测试用例

## 测试概述

| 测试类型 | 用例数量 | 优先级 | 说明 |
|----------|----------|--------|------|
| 单元测试 | 15 | P0 | 核心功能测试 |
| 集成测试 | 8 | P0 | API 集成测试 |
| E2E 测试 | 5 | P1 | 端到端流程测试 |
| 性能测试 | 4 | P1 | 性能和压力测试 |
| 边界测试 | 6 | P2 | 边界条件测试 |

---

## 1. 单元测试

### 1.1 文本预处理测试

#### TC-UT-001: 正常文本输入

```javascript
// 测试文件：tests/unit/preprocessor.test.js
describe('文本预处理', () => {
  it('TC-UT-001: 正常文本输入', async () => {
    const input = '这是一个测试故事。主角小明遇到了一个挑战。';
    const result = await preprocessor.process(input);
    
    expect(result.text).toBeDefined();
    expect(result.encoding).toBe('UTF-8');
    expect(result.length).toBeGreaterThan(0);
    expect(result.segments).toHaveLength(1);
  });
});
```

**预期结果：** 文本正确编码，分段合理

---

#### TC-UT-002: 特殊字符处理

```javascript
it('TC-UT-002: 特殊字符处理', async () => {
  const input = '故事@#$%&*() 特殊字符测试\n\n\n多余空行';
  const result = await preprocessor.process(input);
  
  expect(result.text).not.toMatch(/[\u0000-\u001F]/);
  expect(result.text).not.toMatch(/\n{3,}/);
});
```

**预期结果：** 特殊字符被清理，多余空行被移除

---

#### TC-UT-003: 长文本分段

```javascript
it('TC-UT-003: 长文本分段', async () => {
  const longText = '这是一个故事。'.repeat(10000); // 约 50KB
  const result = await preprocessor.process(longText, { maxChunkSize: 10000 });
  
  expect(result.isSegmented).toBe(true);
  expect(result.segments.length).toBeGreaterThan(1);
  expect(result.segments.every(s => s.length <= 10000)).toBe(true);
});
```

**预期结果：** 长文本被正确分段，每段不超过限制

---

#### TC-UT-004: 编码检测

```javascript
it('TC-UT-004: 编码检测与转换', async () => {
  const gbkText = Buffer.from('测试文本', 'gbk');
  const result = await preprocessor.process(gbkText);
  
  expect(result.encoding).toBe('UTF-8');
  expect(result.text).toBe('测试文本');
});
```

**预期结果：** 自动检测并转换为 UTF-8

---

### 1.2 响应解析器测试

#### TC-UT-005: 标准 JSON 解析

```javascript
// 测试文件：tests/unit/parser.test.js
describe('响应解析器', () => {
  it('TC-UT-005: 标准 JSON 解析', async () => {
    const apiResponse = {
      output: {
        text: JSON.stringify({
          summary: { title: '测试' },
          characters: []
        })
      }
    };
    
    const result = await parser.parse(apiResponse);
    
    expect(result.summary.title).toBe('测试');
    expect(result.characters).toEqual([]);
  });
});
```

**预期结果：** JSON 正确解析

---

#### TC-UT-006: 非标准 JSON 修复

```javascript
it('TC-UT-006: 非标准 JSON 修复', async () => {
  const malformedResponse = {
    output: {
      text: '一些说明文字\n```json\n{"summary":{"title":"测试"}}\n```'
    }
  };
  
  const result = await parser.parse(malformedResponse);
  
  expect(result.summary.title).toBe('测试');
});
```

**预期结果：** 自动提取并修复 JSON

---

#### TC-UT-007: 字段缺失处理

```javascript
it('TC-UT-007: 字段缺失处理', async () => {
  const incompleteResponse = {
    output: {
      text: JSON.stringify({
        summary: { title: '测试' }
        // 缺少其他必填字段
      })
    }
  };
  
  const result = await parser.parse(incompleteResponse);
  
  expect(result.summary.title).toBe('测试');
  expect(result.characters).toEqual([]); // 默认值
  expect(result.warnings).toBeDefined();
});
```

**预期结果：** 缺失字段使用默认值，产生警告

---

### 1.3 数据验证器测试

#### TC-UT-008: 完整数据验证

```javascript
// 测试文件：tests/unit/validator.test.js
describe('数据验证器', () => {
  it('TC-UT-008: 完整数据验证', async () => {
    const data = {
      summary: {
        title: '测试故事',
        oneLinePitch: '一句话梗概',
        themes: ['主题 1'],
        genres: ['类型 1'],
        tone: '基调',
        targetAudience: '受众'
      },
      characters: [{ name: '角色', role: 'protagonist', description: '描述', traits: [], arc: '' }],
      conflicts: [],
      structure: { actStructure: '3-act', acts: [] },
      rhythm: { pace: 'medium', climaxPoints: [], tensionCurve: [] },
      emotionCurve: [],
      chapterSuggestions: [],
      styleAnalysis: { detectedStyle: '风格', confidence: 0.9, characteristics: [], writingStyle: '' }
    };
    
    const result = validator.validate(data);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

**预期结果：** 验证通过

---

#### TC-UT-009: 必填字段验证

```javascript
it('TC-UT-009: 必填字段验证', async () => {
  const incompleteData = {
    summary: {
      // 缺少 title
      oneLinePitch: '一句话梗概'
    }
  };
  
  const result = validator.validate(incompleteData);
  
  expect(result.valid).toBe(false);
  expect(result.errors.some(e => e.field === 'summary.title')).toBe(true);
});
```

**预期结果：** 验证失败，报告缺失字段

---

#### TC-UT-010: 数值范围验证

```javascript
it('TC-UT-010: 数值范围验证', async () => {
  const data = {
    summary: { title: '测试', oneLinePitch: '', themes: [], genres: [], tone: '', targetAudience: '' },
    characters: [],
    conflicts: [{ type: 'external', description: '', parties: [], intensity: 15, resolution: '' }], // 超出范围
    structure: { actStructure: '3-act', acts: [] },
    rhythm: { pace: 'medium', climaxPoints: [], tensionCurve: [] },
    emotionCurve: [],
    chapterSuggestions: [],
    styleAnalysis: { detectedStyle: '', confidence: 0.9, characteristics: [], writingStyle: '' }
  };
  
  const result = validator.validate(data);
  
  expect(result.valid).toBe(false);
  expect(result.errors.some(e => e.field === 'conflicts[0].intensity')).toBe(true);
});
```

**预期结果：** 强度值超出 1-10 范围，验证失败

---

### 1.4 提示词管理测试

#### TC-UT-011: 提示词加载

```javascript
// 测试文件：tests/unit/prompts.test.js
describe('提示词管理', () => {
  it('TC-UT-011: 提示词加载', async () => {
    const prompt = await prompts.getTemplate('main-analysis');
    
    expect(prompt).toBeDefined();
    expect(prompt.system).toBeDefined();
    expect(prompt.user).toBeDefined();
  });
});
```

**预期结果：** 提示词模板正确加载

---

#### TC-UT-012: 变量替换

```javascript
it('TC-UT-012: 变量替换', async () => {
  const template = '请分析：{{STORY_TEXT}}';
  const result = prompts.render(template, { STORY_TEXT: '测试故事' });
  
  expect(result).toBe('请分析：测试故事');
});
```

**预期结果：** 变量正确替换

---

### 1.5 核心分析器测试

#### TC-UT-013: 分析流程完整性

```javascript
// 测试文件：tests/unit/analyzer.test.js
describe('核心分析器', () => {
  it('TC-UT-013: 分析流程完整性', async () => {
    const input = '测试故事文本';
    const result = await analyzer.analyze(input);
    
    expect(result.analysisId).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.styleAnalysis).toBeDefined();
  });
});
```

**预期结果：** 完整分析流程执行成功

---

#### TC-UT-014: 错误处理

```javascript
it('TC-UT-014: API 错误处理', async () => {
  // Mock API 失败
  mockDashScope.mockRejectedValue(new Error('API Error'));
  
  const input = '测试故事';
  const result = await analyzer.analyze(input);
  
  expect(result.success).toBe(false);
  expect(result.error.code).toBe('API_ERROR');
});
```

**预期结果：** 优雅处理 API 错误

---

#### TC-UT-015: 重试机制

```javascript
it('TC-UT-015: 重试机制', async () => {
  // Mock 前两次失败，第三次成功
  mockDashScope
    .mockRejectedValueOnce(new Error('Timeout'))
    .mockRejectedValueOnce(new Error('Timeout'))
    .mockResolvedValueOnce({ output: { text: '{}' } });
  
  const result = await analyzer.analyze('测试');
  
  expect(mockDashScope).toHaveBeenCalledTimes(3);
  expect(result.success).toBe(true);
});
```

**预期结果：** 自动重试，最终成功

---

## 2. 集成测试

### 2.1 API 集成测试

#### TC-IT-001: 完整分析流程

```javascript
// 测试文件：tests/integration/api.test.js
describe('API 集成测试', () => {
  it('TC-IT-001: 完整分析流程', async () => {
    const response = await request(app)
      .post('/api/v1/story/analyze')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        text: '林浩是一个普通上班族，直到他捡到了一个神秘手环...',
        options: {
          includeEmotionCurve: true,
          includeConflictAnalysis: true
        }
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.summary).toBeDefined();
    expect(response.body.data.characters).toBeDefined();
    expect(response.body.data.emotionCurve).toBeDefined();
  });
});
```

**预期结果：** API 返回完整分析结果

---

#### TC-IT-002: 批量分析

```javascript
it('TC-IT-002: 批量分析', async () => {
  const response = await request(app)
    .post('/api/v1/story/analyze/batch')
    .set('Authorization', `Bearer ${testToken}`)
    .send({
      texts: [
        { id: '1', text: '故事一' },
        { id: '2', text: '故事二' },
        { id: '3', text: '故事三' }
      ],
      callbackUrl: 'http://localhost:3000/callback'
    });
    
    expect(response.status).toBe(202);
    expect(response.body.data.taskId).toBeDefined();
    
    // 轮询任务状态
    const statusResponse = await request(app)
      .get(`/api/v1/story/analyze/batch/${response.body.data.taskId}`);
    
    expect(statusResponse.body.data.status).toMatch(/completed|processing/);
  });
});
```

**预期结果：** 批量任务提交成功，可查询状态

---

#### TC-IT-003: 认证失败

```javascript
it('TC-IT-003: 认证失败', async () => {
  const response = await request(app)
    .post('/api/v1/story/analyze')
    .set('Authorization', 'Bearer invalid-token')
    .send({ text: '测试' });
    
  expect(response.status).toBe(401);
  expect(response.body.error.code).toBe('UNAUTHORIZED');
});
```

**预期结果：** 无效 token 返回 401

---

#### TC-IT-004: 输入验证

```javascript
it('TC-IT-004: 输入验证 - 空文本', async () => {
  const response = await request(app)
    .post('/api/v1/story/analyze')
    .set('Authorization', `Bearer ${testToken}`)
    .send({ text: '' });
    
  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe('INVALID_INPUT');
});
```

**预期结果：** 空文本返回验证错误

---

#### TC-IT-005: 输入验证 - 文本过长

```javascript
it('TC-IT-005: 输入验证 - 文本过长', async () => {
  const longText = '测试'.repeat(30000); // 超过 50KB
  
  const response = await request(app)
    .post('/api/v1/story/analyze')
    .set('Authorization', `Bearer ${testToken}`)
    .send({ text: longText });
    
  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe('TEXT_TOO_LONG');
});
```

**预期结果：** 超长文本返回错误

---

#### TC-IT-006: 历史记录查询

```javascript
it('TC-IT-006: 历史记录查询', async () => {
  const response = await request(app)
    .get('/api/v1/story/history')
    .set('Authorization', `Bearer ${testToken}`)
    .query({ page: 1, pageSize: 10 });
    
  expect(response.status).toBe(200);
  expect(response.body.data.items).toBeDefined();
  expect(response.body.data.pagination).toBeDefined();
});
```

**预期结果：** 返回历史分析记录

---

#### TC-IT-007: 分析详情查询

```javascript
it('TC-IT-007: 分析详情查询', async () => {
  // 先创建一个分析
  const createResponse = await request(app)
    .post('/api/v1/story/analyze')
    .set('Authorization', `Bearer ${testToken}`)
    .send({ text: '测试故事' });
  
  const analysisId = createResponse.body.data.analysisId;
  
  // 查询详情
  const response = await request(app)
    .get(`/api/v1/story/history/${analysisId}`)
    .set('Authorization', `Bearer ${testToken}`);
    
  expect(response.status).toBe(200);
  expect(response.body.data.analysisId).toBe(analysisId);
  expect(response.body.data.result).toBeDefined();
});
```

**预期结果：** 返回完整分析详情

---

#### TC-IT-008: 并发请求处理

```javascript
it('TC-IT-008: 并发请求处理', async () => {
  const requests = Array(10).fill(null).map(() =>
    request(app)
      .post('/api/v1/story/analyze')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ text: '并发测试故事' })
  );
  
  const results = await Promise.all(requests);
  
  const successCount = results.filter(r => r.status === 200).length;
  expect(successCount).toBeGreaterThanOrEqual(8); // 允许少量失败
});
```

**预期结果：** 支持并发请求，大部分成功

---

## 3. E2E 测试

### 3.1 端到端流程测试

#### TC-E2E-001: 完整短剧生成流程

```javascript
// 测试文件：tests/e2e/flow.test.js
describe('E2E 流程测试', () => {
  it('TC-E2E-001: 完整短剧生成流程', async () => {
    // 1. 提交小说文本
    const analyzeResponse = await request(app)
      .post('/api/v1/story/analyze')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ text: e2eTestData.novelText });
    
    expect(analyzeResponse.status).toBe(200);
    const analysisId = analyzeResponse.body.data.analysisId;
    
    // 2. 验证分析结果完整性
    const analysis = analyzeResponse.body.data;
    expect(analysis.summary).toBeDefined();
    expect(analysis.characters.length).toBeGreaterThan(0);
    expect(analysis.chapterSuggestions.length).toBeGreaterThan(0);
    
    // 3. 验证可传递给下游模块
    expect(analysis.characters[0].name).toBeDefined();
    expect(analysis.structure).toBeDefined();
    
    console.log(`✓ E2E 流程完成，analysisId: ${analysisId}`);
  });
});
```

**预期结果：** 从输入到输出的完整流程成功

---

#### TC-E2E-002: 不同文学风格测试

```javascript
it('TC-E2E-002: 不同文学风格测试', async () => {
  const styles = [
    { name: '玄幻', text: e2eTestData.xuanhuanText },
    { name: '都市', text: e2eTestData.dushiText },
    { name: '悬疑', text: e2eTestData.xuanyiText },
    { name: '言情', text: e2eTestData.yanqingText }
  ];
  
  for (const style of styles) {
    const response = await request(app)
      .post('/api/v1/story/analyze')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ text: style.text, options: { style: style.name } });
    
    expect(response.status).toBe(200);
    expect(response.body.data.styleAnalysis.detectedStyle).toBeDefined();
    console.log(`✓ ${style.name} 风格分析完成`);
  }
});
```

**预期结果：** 各种文学风格都能正确分析

---

#### TC-E2E-003: 长篇小说分析

```javascript
it('TC-E2E-003: 长篇小说分析', async () => {
  const response = await request(app)
    .post('/api/v1/story/analyze')
    .set('Authorization', `Bearer ${testToken}`)
    .send({ 
      text: e2eTestData.longNovelText, // 约 40KB
      options: { maxChapters: 80 }
    });
    
  expect(response.status).toBe(200);
  expect(response.body.data.chapterSuggestions.length).toBeLessThanOrEqual(80);
  expect(response.meta.processingTime).toBeLessThan(30000); // 30 秒内完成
});
```

**预期结果：** 长文本分析成功，时间合理

---

#### TC-E2E-004: 错误恢复流程

```javascript
it('TC-E2E-004: 错误恢复流程', async () => {
  // 模拟 API 临时故障
  mockDashScope.setAvailable(false);
  
  const response = await request(app)
    .post('/api/v1/story/analyze')
    .set('Authorization', `Bearer ${testToken}`)
    .send({ text: '测试' });
    
  // 应该触发降级策略
  expect(response.status).toBe(200);
  expect(response.body.data).toBeDefined();
  expect(response.body.warnings).toBeDefined();
  
  // 恢复 API
  mockDashScope.setAvailable(true);
});
```

**预期结果：** API 故障时优雅降级

---

#### TC-E2E-005: 缓存命中测试

```javascript
it('TC-E2E-005: 缓存命中测试', async () => {
  const text = '这是一个用于缓存测试的故事文本';
  
  // 第一次请求
  const response1 = await request(app)
    .post('/api/v1/story/analyze')
    .set('Authorization', `Bearer ${testToken}`)
    .send({ text });
  
  // 第二次相同请求
  const response2 = await request(app)
    .post('/api/v1/story/analyze')
    .set('Authorization', `Bearer ${testToken}`)
    .send({ text });
  
  expect(response1.body.data.analysisId).toBe(response2.body.data.analysisId);
  expect(response2.meta.fromCache).toBe(true);
});
```

**预期结果：** 相同输入命中缓存

---

## 4. 性能测试

### 4.1 性能基准测试

#### TC-PT-001: 单次分析响应时间

```javascript
// 测试文件：tests/performance/benchmark.test.js
describe('性能测试', () => {
  it('TC-PT-001: 单次分析响应时间', async () => {
    const iterations = 10;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await request(app)
        .post('/api/v1/story/analyze')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ text: perfTestData.standardText });
      times.push(Date.now() - start);
    }
    
    const avg = times.reduce((a, b) => a + b) / iterations;
    const max = Math.max(...times);
    
    console.log(`平均响应时间：${avg}ms`);
    console.log(`最大响应时间：${max}ms`);
    
    expect(avg).toBeLessThan(5000); // 平均 < 5 秒
    expect(max).toBeLessThan(10000); // 最大 < 10 秒
  });
});
```

**预期结果：** 平均响应时间 < 5 秒

---

#### TC-PT-002: 并发性能

```javascript
it('TC-PT-002: 并发性能', async () => {
  const concurrency = 10;
  const requests = Array(concurrency).fill(null).map(() =>
    request(app)
      .post('/api/v1/story/analyze')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ text: perfTestData.standardText })
  );
  
  const start = Date.now();
  const results = await Promise.all(requests);
  const duration = Date.now() - start;
  
  const successCount = results.filter(r => r.status === 200).length;
  
  console.log(`并发数：${concurrency}`);
  console.log(`总耗时：${duration}ms`);
  console.log(`成功率：${successCount / concurrency * 100}%`);
  
  expect(successCount / concurrency).toBeGreaterThanOrEqual(0.8);
});
```

**预期结果：** 10 并发成功率 > 80%

---

#### TC-PT-003: 内存使用

```javascript
it('TC-PT-003: 内存使用', async () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  for (let i = 0; i < 20; i++) {
    await request(app)
      .post('/api/v1/story/analyze')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ text: perfTestData.standardText });
  }
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
  
  console.log(`内存增加：${memoryIncrease.toFixed(2)} MB`);
  
  expect(memoryIncrease).toBeLessThan(100); // < 100MB
});
```

**预期结果：** 内存增长合理，无泄漏

---

#### TC-PT-004: 长时间运行稳定性

```javascript
it('TC-PT-004: 长时间运行稳定性', async () => {
  const duration = 5 * 60 * 1000; // 5 分钟
  const startTime = Date.now();
  let requestCount = 0;
  let errorCount = 0;
  
  while (Date.now() - startTime < duration) {
    try {
      await request(app)
        .post('/api/v1/story/analyze')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ text: perfTestData.standardText });
      requestCount++;
    } catch (e) {
      errorCount++;
    }
    await new Promise(r => setTimeout(r, 1000)); // 每秒一次
  }
  
  const errorRate = errorCount / requestCount;
  console.log(`总请求数：${requestCount}`);
  console.log(`错误数：${errorCount}`);
  console.log(`错误率：${errorRate * 100}%`);
  
  expect(errorRate).toBeLessThan(0.05); // < 5%
});
```

**预期结果：** 5 分钟运行错误率 < 5%

---

## 5. 边界测试

### 5.1 边界条件测试

#### TC-BT-001: 最小文本

```javascript
// 测试文件：tests/boundary/boundary.test.js
describe('边界测试', () => {
  it('TC-BT-001: 最小文本', async () => {
    const response = await request(app)
      .post('/api/v1/story/analyze')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ text: '小明遇到了挑战。' });
    
    expect(response.status).toBe(200);
    expect(response.body.data.summary.title).toBeDefined();
  });
});
```

**预期结果：** 极短文本也能分析

---

#### TC-BT-002: 最大文本

```javascript
it('TC-BT-002: 最大文本边界', async () => {
  const maxText = 'A'.repeat(51200); // 50KB
  const response = await request(app)
    .post('/api/v1/story/analyze')
    .set('Authorization', `Bearer ${testToken}`)
    .send({ text: maxText });
    
  expect(response.status).toBe(200);
});
```

**预期结果：** 边界值处理正确

---

#### TC-BT-003: 特殊字符

```javascript
it('TC-BT-003: 特殊字符', async () => {
  const text = '故事<>&"\'测试\n\r\t 特殊字符';
  const response = await request(app)
    .post('/api/v1/story/analyze')
    .set('Authorization', `Bearer ${testToken}`)
    .send({ text });
    
  expect(response.status).toBe(200);
});
```

**预期结果：** 特殊字符正确处理

---

#### TC-BT-004: 纯英文输入

```javascript
it('TC-BT-004: 纯英文输入', async () => {
  const text = 'John was an ordinary man until he found the mysterious ring...';
  const response = await request(app)
    .post('/api/v1/story/analyze')
    .set('Authorization', `Bearer ${testToken}`)
    .send({ text });
    
  expect(response.status).toBe(200);
  // 应该能识别并处理
});
```

**预期结果：** 英文输入也能处理

---

#### TC-BT-005: 混合语言

```javascript
it('TC-BT-005: 中英文混合', async () => {
  const text = '小明在 New York 遇到了一个神秘人，他说："Hello，我有秘密告诉你。"';
  const response = await request(app)
    .post('/api/v1/story/analyze')
    .set('Authorization', `Bearer ${testToken}`)
    .send({ text });
    
  expect(response.status).toBe(200);
});
```

**预期结果：** 混合语言正确处理

---

#### TC-BT-006: 空选项

```javascript
it('TC-BT-006: 空选项', async () => {
  const response = await request(app)
    .post('/api/v1/story/analyze')
    .set('Authorization', `Bearer ${testToken}`)
    .send({ text: '测试故事', options: {} });
    
  expect(response.status).toBe(200);
  expect(response.body.data.emotionCurve).toBeDefined(); // 默认包含
});
```

**预期结果：** 空选项使用默认值

---

## 6. 测试数据

### 6.1 测试文本样例

```javascript
// tests/test-data.js
module.exports = {
  // 玄幻风格
  xuanhuanText: `
    林天本是青云宗的外门弟子，资质平平，受尽欺凌。
    一日，他在后山偶然发现了一个古老洞穴，获得了一本神秘功法...
  `,
  
  // 都市风格
  dushiText: `
    陈明是一个普通的程序员，每天朝九晚五，生活平淡无奇。
    直到那天，他在电梯里遇到了改变他一生的女人...
  `,
  
  // 悬疑风格
  xuanyiText: `
    雨夜，警察局接到报案电话。
    当刑警队长王强赶到现场时，发现死者身上有一个奇怪的符号...
  `,
  
  // 言情风格
  yanqingText: `
    苏浅浅一直暗恋着学长顾言，却不敢表白。
    毕业后，两人意外重逢，却发现彼此都还单身...
  `,
  
  // 标准测试文本
  standardText: `
    主角李明是一个普通的大学生，某天意外获得了超能力。
    他必须在隐藏身份和保护世界之间做出选择。
    在这个过程中，他遇到了志同道合的伙伴，也遭遇了强大的敌人。
    最终，他战胜了邪恶势力，成为了真正的英雄。
  `,
  
  // 长篇小说文本（约 40KB）
  longNovelText: '...' // 实际测试中使用真实长文本
};
```

---

## 7. 测试执行

### 7.1 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行 E2E 测试
npm run test:e2e

# 运行性能测试
npm run test:perf

# 生成覆盖率报告
npm run test:coverage
```

### 7.2 CI/CD 集成

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## 8. 验收标准

| 测试类别 | 通过率要求 | 阻塞发布 |
|----------|------------|----------|
| 单元测试 | 100% | 是 |
| 集成测试 | 100% | 是 |
| E2E 测试 | 100% | 是 |
| 性能测试 | 95% | 否 |
| 边界测试 | 100% | 是 |

---

**测试完成标志：** 所有 P0 测试用例通过，代码覆盖率 > 80%
