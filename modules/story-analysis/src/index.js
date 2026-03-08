/**
 * 故事分析模块 - 入口文件
 * Story Analysis Module Entry Point
 * 
 * @module story-analysis
 * @version 1.0.0
 */

const DashScope = require('dashscope');
const { StoryAnalyzer } = require('./analyzer');
const { PromptManager } = require('./prompts');
const { ResponseParser } = require('./parser');
const { DataValidator } = require('./validator');

// 初始化配置
const config = {
  apiKey: process.env.DASHSCOPE_API_KEY,
  model: process.env.DASHSCOPE_MODEL || 'qwen3.5-plus',
  timeout: parseInt(process.env.DASHSCOPE_TIMEOUT) || 30000,
  maxTextLength: 51200, // 50KB
  cacheEnabled: process.env.CACHE_ENABLED !== 'false',
  retryAttempts: 3,
  retryDelay: 1000
};

// 初始化 SDK 客户端
const client = new DashScope({
  apiKey: config.apiKey,
  model: config.model,
  timeout: config.timeout
});

// 初始化模块组件
const promptManager = new PromptManager();
const parser = new ResponseParser();
const validator = new DataValidator();
const analyzer = new StoryAnalyzer(client, promptManager, parser, validator, config);

/**
 * 分析故事文本
 * @param {string} text - 故事文本或大纲
 * @param {object} options - 分析选项
 * @returns {Promise<object>} 分析结果
 */
async function analyze(text, options = {}) {
  return analyzer.analyze(text, options);
}

/**
 * 批量分析故事
 * @param {array} texts - 故事文本数组
 * @param {object} options - 分析选项
 * @returns {Promise<object>} 任务 ID
 */
async function analyzeBatch(texts, options = {}) {
  return analyzer.analyzeBatch(texts, options);
}

/**
 * 查询批量任务状态
 * @param {string} taskId - 任务 ID
 * @returns {Promise<object>} 任务状态
 */
async function getBatchStatus(taskId) {
  return analyzer.getBatchStatus(taskId);
}

/**
 * 获取分析历史
 * @param {object} query - 查询参数
 * @returns {Promise<object>} 历史记录
 */
async function getHistory(query = {}) {
  return analyzer.getHistory(query);
}

/**
 * 获取分析详情
 * @param {string} analysisId - 分析 ID
 * @returns {Promise<object>} 分析详情
 */
async function getDetail(analysisId) {
  return analyzer.getDetail(analysisId);
}

module.exports = {
  analyze,
  analyzeBatch,
  getBatchStatus,
  getHistory,
  getDetail,
  config,
  version: '1.0.0'
};
