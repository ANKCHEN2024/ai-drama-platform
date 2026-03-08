/**
 * 人物档案生成器
 * 负责人物档案的创建、更新和合并
 */

const { v4: uuidv4 } = require('uuid');

/**
 * 创建新的人物档案
 * @param {Object} characterData - 人物数据
 * @returns {Object} 完整的人物档案
 */
function create(characterData) {
  const now = new Date().toISOString();
  
  return {
    id: characterData.id || `char_${uuidv4().substring(0, 8)}`,
    name: characterData.name,
    alias: characterData.alias || [],
    age: characterData.age,
    gender: characterData.gender,
    role: characterData.role || '配角',
    appearance: characterData.appearance || {},
    personality: characterData.personality || {},
    clothing: characterData.clothing || {},
    relationships: characterData.relationships || [],
    consistency: characterData.consistency || {},
    metadata: {
      createdAt: now,
      updatedAt: now,
      source: characterData.source || 'manual',
      confidence: characterData.confidence || 1.0,
      version: 1
    }
  };
}

/**
 * 更新人物档案
 * @param {Object} character - 现有人物档案
 * @param {Object} updates - 更新内容
 * @returns {Object} 更新后的人物档案
 */
function update(character, updates) {
  const now = new Date().toISOString();
  
  // 深拷贝避免修改原对象
  const updated = JSON.parse(JSON.stringify(character));
  
  // 应用更新
  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'id' && key !== 'metadata' && key !== 'createdAt') {
      updated[key] = value;
    }
  }
  
  // 更新元数据
  updated.metadata = {
    ...updated.metadata,
    updatedAt: now,
    version: (updated.metadata?.version || 1) + 1
  };
  
  return updated;
}

/**
 * 合并多个人物档案（去重和整合）
 * @param {Array<Object>} characters - 人物数组
 * @param {Object} options - 合并选项
 * @returns {Array<Object>} 合并后的人物数组
 */
function mergeCharacters(characters, options = {}) {
  const {
    mergeThreshold = 0.7,  // 相似度阈值
    preferLonger = true    // 优先保留更详细的描述
  } = options;
  
  // 按名称分组
  const grouped = {};
  
  for (const char of characters) {
    const key = normalizeName(char.name);
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(char);
  }
  
  // 合并每组中的人物
  const merged = [];
  for (const [name, group] of Object.entries(grouped)) {
    if (group.length === 1) {
      merged.push(group[0]);
    } else {
      merged.push(mergeCharacterGroup(group, { preferLonger }));
    }
  }
  
  return merged;
}

/**
 * 合并同一人物的多个版本
 * @param {Array<Object>} group - 同一人物的多个版本
 * @param {Object} options - 合并选项
 * @returns {Object} 合并后的人物档案
 */
function mergeCharacterGroup(group, options = {}) {
  const { preferLonger = true } = options;
  
  // 选择基础版本（通常是第一个或最详细的）
  let base = group[0];
  if (preferLonger) {
    base = group.reduce((a, b) => {
      const aLen = JSON.stringify(a).length;
      const bLen = JSON.stringify(b).length;
      return aLen > bLen ? a : b;
    });
  }
  
  // 深拷贝基础版本
  const merged = JSON.parse(JSON.stringify(base));
  
  // 合并其他版本的信息
  for (const char of group) {
    if (char === base) continue;
    
    // 合并外貌描述
    if (char.appearance?.overallDescription && 
        !merged.appearance?.overallDescription) {
      merged.appearance.overallDescription = char.appearance.overallDescription;
    }
    
    // 合并性格特征
    if (char.personality?.traits?.length > 0) {
      const existingTraits = new Set(merged.personality.traits || []);
      for (const trait of char.personality.traits) {
        existingTraits.add(trait);
      }
      merged.personality.traits = Array.from(existingTraits);
    }
    
    // 合并服装描述
    if (char.clothing?.overallDescription && 
        !merged.clothing?.overallDescription) {
      merged.clothing.overallDescription = char.clothing.overallDescription;
    }
    
    // 合并关系
    if (char.relationships?.length > 0) {
      const existingRels = new Map(
        (merged.relationships || []).map(r => [r.characterName, r])
      );
      for (const rel of char.relationships) {
        if (!existingRels.has(rel.characterName)) {
          existingRels.set(rel.characterName, rel);
        }
      }
      merged.relationships = Array.from(existingRels.values());
    }
    
    // 更新置信度（取平均）
    if (char.metadata?.confidence && merged.metadata?.confidence) {
      merged.metadata.confidence = 
        (merged.metadata.confidence + char.metadata.confidence) / 2;
    }
  }
  
  // 更新元数据
  merged.metadata = {
    ...merged.metadata,
    updatedAt: new Date().toISOString(),
    version: (merged.metadata?.version || 1) + 1,
    mergedFrom: group.length
  };
  
  return merged;
}

/**
 * 标准化人物名称（用于匹配）
 * @param {string} name - 人物名称
 * @returns {string} 标准化后的名称
 */
function normalizeName(name) {
  if (!name) return '';
  
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·.]/g, '');
}

/**
 * 计算两个人物的相似度
 * @param {Object} char1 - 人物 1
 * @param {Object} char2 - 人物 2
 * @returns {number} 相似度 0-1
 */
function calculateSimilarity(char1, char2) {
  let score = 0;
  let factors = 0;
  
  // 名称相似度
  factors++;
  if (normalizeName(char1.name) === normalizeName(char2.name)) {
    score += 1;
  } else if (char1.name.includes(char2.name) || char2.name.includes(char1.name)) {
    score += 0.5;
  }
  
  // 年龄相似度
  if (char1.age && char2.age) {
    factors++;
    const ageDiff = Math.abs(char1.age - char2.age);
    if (ageDiff === 0) score += 1;
    else if (ageDiff <= 2) score += 0.7;
    else if (ageDiff <= 5) score += 0.3;
  }
  
  // 性别相似度
  if (char1.gender && char2.gender) {
    factors++;
    if (char1.gender === char2.gender) score += 1;
  }
  
  // 外貌相似度（基于关键词）
  if (char1.appearance?.overallDescription && char2.appearance?.overallDescription) {
    factors++;
    const desc1 = char1.appearance.overallDescription.toLowerCase();
    const desc2 = char2.appearance.overallDescription.toLowerCase();
    
    // 简单关键词匹配
    const keywords = ['头发', '眼睛', '脸', '身材', '发型'];
    let matchCount = 0;
    for (const keyword of keywords) {
      if (desc1.includes(keyword) && desc2.includes(keyword)) {
        matchCount++;
      }
    }
    score += matchCount / keywords.length;
  }
  
  return factors > 0 ? score / factors : 0;
}

/**
 * 验证人物档案完整性
 * @param {Object} character - 人物档案
 * @returns {Object} 验证结果
 */
function validate(character) {
  const errors = [];
  const warnings = [];
  
  // 必填字段检查
  const requiredFields = ['id', 'name', 'age', 'gender'];
  for (const field of requiredFields) {
    if (!character[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // 年龄范围检查
  if (character.age && (character.age < 0 || character.age > 150)) {
    errors.push('Age must be between 0 and 150');
  }
  
  // 性别值检查
  if (character.gender && !['男', '女', '其他'].includes(character.gender)) {
    warnings.push(`Unusual gender value: ${character.gender}`);
  }
  
  // 外貌描述检查
  if (!character.appearance?.overallDescription) {
    warnings.push('Missing overall appearance description');
  }
  
  // 性格描述检查
  if (!character.personality?.description) {
    warnings.push('Missing personality description');
  }
  
  // 服装描述检查
  if (!character.clothing?.overallDescription) {
    warnings.push('Missing overall clothing description');
  }
  
  // 一致性描述检查
  if (!character.consistency?.prompt) {
    warnings.push('Missing consistency prompt for AI generation');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 导出人物档案为不同格式
 * @param {Object} character - 人物档案
 * @param {string} format - 导出格式 (json, markdown, csv)
 * @returns {string} 导出的内容
 */
function exportCharacter(character, format = 'json') {
  switch (format) {
    case 'json':
      return JSON.stringify(character, null, 2);
    
    case 'markdown':
      return `
# ${character.name} - 人物档案

## 基本信息
- **ID**: ${character.id}
- **年龄**: ${character.age}
- **性别**: ${character.gender}
- **角色**: ${character.role}

## 外貌特征
${character.appearance?.overallDescription || '无描述'}

## 性格特点
${character.personality?.description || '无描述'}

**性格标签**: ${character.personality?.traits?.join(', ') || '无'}

## 服装风格
${character.clothing?.overallDescription || '无描述'}

## 人物关系
${character.relationships?.map(r => `- **${r.characterName}** (${r.type}): ${r.description}`).join('\n') || '无'}

## AI 生成提示词
**正向**: ${character.consistency?.prompt || '无'}

**负向**: ${character.consistency?.negativePrompt || '无'}
`.trim();
    
    case 'csv':
      // 简化的 CSV 导出
      const headers = ['id', 'name', 'age', 'gender', 'role', 'appearance', 'personality', 'clothing'];
      const values = headers.map(h => {
        let val = character[h];
        if (typeof val === 'object') {
          val = val?.overallDescription || JSON.stringify(val);
        }
        return `"${(val || '').toString().replace(/"/g, '""')}"`;
      });
      return headers.join(',') + '\n' + values.join(',');
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

module.exports = {
  create,
  update,
  mergeCharacters,
  mergeCharacterGroup,
  normalizeName,
  calculateSimilarity,
  validate,
  exportCharacter
};
