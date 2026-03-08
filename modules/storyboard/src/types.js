/**
 * 分镜模块数据类型定义
 * 
 * 使用 JSDoc 定义 TypeScript 风格的类型
 * 
 * @module types/index
 */

/**
 * 镜头角度枚举
 * @enum {string}
 */
const CameraAngle = {
  /** 大远景 - 展现宏大环境 */
  EXTREME_LONG_SHOT: 'extreme_long_shot',
  /** 远景 - 人物全身和环境 */
  LONG_SHOT: 'long_shot',
  /** 全景 - 人物全身 */
  FULL_SHOT: 'full_shot',
  /** 中全景 - 膝盖以上 */
  MEDIUM_LONG_SHOT: 'medium_long_shot',
  /** 中景 - 腰部以上 */
  MEDIUM_SHOT: 'medium_shot',
  /** 中近景 - 胸部以上 */
  MEDIUM_CLOSE_UP: 'medium_close_up',
  /** 近景 - 肩部以上 */
  CLOSE_UP: 'close_up',
  /** 特写 - 面部局部 */
  EXTREME_CLOSE_UP: 'extreme_close_up'
};

/**
 * 分镜状态枚举
 * @enum {string}
 */
const StoryboardStatus = {
  /** 等待生成 */
  PENDING: 'pending',
  /** 生成中 */
  GENERATING: 'generating',
  /** 已完成 */
  COMPLETED: 'completed',
  /** 生成失败 */
  FAILED: 'failed'
};

/**
 * 图像质量等级
 * @enum {string}
 */
const QualityLevel = {
  /** 标准质量 */
  STANDARD: 'standard',
  /** 高质量 */
  HIGH: 'high',
  /** 超高质量 */
  ULTRA: 'ultra'
};

/**
 * 宽高比
 * @enum {string}
 */
const AspectRatio = {
  /** 横屏 16:9 */
  LANDSCAPE_16_9: '16:9',
  /** 竖屏 9:16 */
  PORTRAIT_9_16: '9:16',
  /** 标准 4:3 */
  STANDARD_4_3: '4:3',
  /** 正方形 1:1 */
  SQUARE_1_1: '1:1'
};

/**
 * 人物性别
 * @enum {string}
 */
const Gender = {
  MALE: 'male',
  FEMALE: 'female'
};

/**
 * 发型长度
 * @enum {string}
 */
const HairLength = {
  SHORT: 'short',
  MEDIUM: 'medium',
  LONG: 'long'
};

/**
 * 角色类型
 * @enum {string}
 */
const CharacterRole = {
  PROTAGONIST: 'protagonist',
  ANTAGONIST: 'antagonist',
  SUPPORTING: 'supporting'
};

/**
 * 人物外貌描述
 * @typedef {Object} Appearance
 * @property {Gender} gender - 性别
 * @property {number} age - 年龄
 * @property {string} height - 身高描述
 * @property {string} bodyType - 体型描述
 * @property {string} faceShape - 脸型
 * @property {string} skinTone - 肤色
 */

/**
 * 发型描述
 * @typedef {Object} Hairstyle
 * @property {string} style - 发型样式
 * @property {string} color - 发色
 * @property {HairLength} length - 长度
 */

/**
 * 服装描述
 * @typedef {Object} Outfit
 * @property {string} top - 上衣
 * @property {string} bottom - 下装
 * @property {string} shoes - 鞋子
 * @property {string[]} accessories - 配饰
 */

/**
 * 人物描述
 * @typedef {Object} CharacterDescription
 * @property {string} characterId - 人物 ID
 * @property {string} name - 人物名称
 * @property {CharacterRole} role - 角色类型
 * @property {Appearance} appearance - 外貌特征
 * @property {Hairstyle} hairstyle - 发型
 * @property {Outfit} outfit - 服装
 * @property {string} expression - 表情描述
 * @property {string} pose - 姿态描述
 * @property {string} [referenceImageId] - 人物参考图 ID
 */

/**
 * 分镜图像
 * @typedef {Object} StoryboardImage
 * @property {string} id - 图像 ID
 * @property {string} storyboardId - 分镜 ID
 * @property {string} url - 图像 URL
 * @property {string} thumbnailUrl - 缩略图 URL
 * @property {number} width - 宽度 (px)
 * @property {number} height - 高度 (px)
 * @property {string} prompt - 生成提示词
 * @property {number} seed - 随机种子
 * @property {CameraAngle} cameraAngle - 镜头角度
 * @property {string} composition - 构图描述
 * @property {number} fileSize - 文件大小 (bytes)
 * @property {'png'|'jpg'} format - 格式
 * @property {boolean} isSelected - 是否被选中
 * @property {number} [score] - 质量评分 (0-100)
 * @property {Date} createdAt - 创建时间
 */

/**
 * 分镜
 * @typedef {Object} Storyboard
 * @property {string} id - 分镜 ID
 * @property {string} projectId - 项目 ID
 * @property {string} sceneId - 场景 ID
 * @property {number} sequenceNumber - 序列号
 * @property {string} sceneDescription - 场景描述
 * @property {CharacterDescription[]} characterDescriptions - 人物描述
 * @property {string} actionDescription - 动作描述
 * @property {CameraAngle} cameraAngle - 镜头角度
 * @property {StoryboardImage[]} images - 生成的图像列表
 * @property {string} selectedImageId - 选中的图像 ID
 * @property {string} prompt - 最终使用的提示词
 * @property {string} negativePrompt - 负面提示词
 * @property {number} seed - 随机种子
 * @property {string} model - 使用的模型版本
 * @property {StoryboardStatus} status - 状态
 * @property {string} [errorMessage] - 错误消息
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 * @property {Date} [generatedAt] - 生成完成时间
 */

/**
 * 分镜生成请求
 * @typedef {Object} StoryboardRequest
 * @property {string} projectId - 项目 ID
 * @property {string} sceneId - 场景 ID
 * @property {string} sceneDescription - 场景描述
 * @property {CharacterDescription[]} characters - 人物描述
 * @property {string} action - 动作描述
 * @property {CameraAngle[]} cameraAngles - 需要生成的镜头角度列表
 * @property {number} [countPerAngle] - 每个角度生成几张 (默认 4)
 * @property {string} [style] - 艺术风格
 * @property {AspectRatio} [aspectRatio] - 宽高比
 * @property {QualityLevel} [quality] - 质量等级
 */

/**
 * 分镜生成响应
 * @typedef {Object} StoryboardResponse
 * @property {string} storyboardId - 分镜 ID
 * @property {StoryboardStatus} status - 状态
 * @property {Object[]} images - 图像列表
 * @property {CameraAngle} images[].angle - 镜头角度
 * @property {StoryboardImage[]} images[].images - 该角度的图像
 * @property {number} [estimatedTime] - 预计生成时间 (秒)
 * @property {string} [taskId] - 异步任务 ID
 */

/**
 * 一致性分数
 * @typedef {Object} ConsistencyScore
 * @property {number} average - 平均分数
 * @property {number} min - 最低分数
 * @property {number} max - 最高分数
 */

/**
 * 一致性评分结果
 * @typedef {Object} ConsistencyScores
 * @property {ConsistencyScore} [extreme_long_shot] - 大远景分数
 * @property {ConsistencyScore} [long_shot] - 远景分数
 * @property {ConsistencyScore} [full_shot] - 全景分数
 * @property {ConsistencyScore} [medium_long_shot] - 中全景分数
 * @property {ConsistencyScore} [medium_shot] - 中景分数
 * @property {ConsistencyScore} [medium_close_up] - 中近景分数
 * @property {ConsistencyScore} [close_up] - 近景分数
 * @property {ConsistencyScore} [extreme_close_up] - 特写分数
 */

/**
 * API 错误响应
 * @typedef {Object} ApiError
 * @property {string} code - 错误码
 * @property {string} message - 错误消息
 * @property {string} [raw] - 原始错误消息
 */

/**
 * API 响应（通用）
 * @typedef {Object} ApiResponse
 * @property {boolean} success - 是否成功
 * @property {Object} [data] - 成功时的数据
 * @property {ApiError} [error] - 失败时的错误信息
 */

module.exports = {
  CameraAngle,
  StoryboardStatus,
  QualityLevel,
  AspectRatio,
  Gender,
  HairLength,
  CharacterRole
};
