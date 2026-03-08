import express from 'express';
import {
  createProject,
  getProjectList,
  getProjectById,
  updateProject,
  deleteProject,
  archiveProject,
  getProjectStatistics,
  duplicateProject
} from '../controllers/projectController';
import { authMiddleware as authenticate } from '../middleware/auth';

const router = express.Router();

// 所有项目相关路由都需要认证
router.use(authenticate);

/**
 * @route   POST /api/projects
 * @desc    创建项目
 * @access  Private
 */
router.post('/', createProject);

/**
 * @route   GET /api/projects
 * @desc    获取项目列表（支持分页、筛选、排序）
 * @access  Private
 * @query   page - 页码（默认 1）
 * @query   limit - 每页数量（默认 10）
 * @query   status - 状态筛选（draft/producing/completed/all）
 * @query   search - 搜索关键词（名称/描述）
 * @query   sortBy - 排序字段（createdAt/updatedAt/name/status）
 * @query   sortOrder - 排序方向（asc/desc）
 * @query   archived - 是否已归档（true/false）
 */
router.get('/', getProjectList);

/**
 * @route   GET /api/projects/:id
 * @desc    获取项目详情
 * @access  Private
 */
router.get('/:id', getProjectById);

/**
 * @route   PUT /api/projects/:id
 * @desc    更新项目
 * @access  Private
 */
router.put('/:id', updateProject);

/**
 * @route   DELETE /api/projects/:id
 * @desc    删除项目
 * @access  Private
 */
router.delete('/:id', deleteProject);

/**
 * @route   POST /api/projects/:id/archive
 * @desc    归档/取消归档项目
 * @access  Private
 * @body    unarchive - true 表示取消归档，false 或不传表示归档
 */
router.post('/:id/archive', archiveProject);

/**
 * @route   GET /api/projects/:id/statistics
 * @desc    获取项目统计信息
 * @access  Private
 */
router.get('/:id/statistics', getProjectStatistics);

/**
 * @route   POST /api/projects/:id/duplicate
 * @desc    复制项目
 * @access  Private
 * @body    name - 新项目名称（可选，默认为"原名称 (副本)"）
 */
router.post('/:id/duplicate', duplicateProject);

export default router;
