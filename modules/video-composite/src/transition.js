/**
 * 转场效果管理类
 * 提供所有支持的转场效果及其配置
 */

class TransitionManager {
  constructor() {
    // 转场预设
    this.presets = {
      default: { transition: 'fade', duration: 0.5 },
      scene_change: { transition: 'circlecrop', duration: 0.7 },
      time_skip: { transition: 'wipeleft', duration: 0.3 },
      flashback: { transition: 'dissolve', duration: 1.0 },
      action: { transition: 'slidyleft', duration: 0.2 },
      focus: { transition: 'circleopen', duration: 0.6 },
      tech: { transition: 'pixelize', duration: 0.5 }
    };

    // 所有可用转场
    this.transitions = [
      { name: 'fade', label: '淡入淡出', category: 'basic', directions: [] },
      { name: 'circlecrop', label: '圆形擦除', category: 'wipe', directions: ['left', 'right'] },
      { name: 'wipeleft', label: '左擦除', category: 'wipe', directions: [] },
      { name: 'wiperight', label: '右擦除', category: 'wipe', directions: [] },
      { name: 'slidyleft', label: '左滑动', category: 'slide', directions: [] },
      { name: 'slideright', label: '右滑动', category: 'slide', directions: [] },
      { name: 'slideup', label: '上滑动', category: 'slide', directions: [] },
      { name: 'slidedown', label: '下滑动', category: 'slide', directions: [] },
      { name: 'circleopen', label: '圆形展开', category: 'open', directions: [] },
      { name: 'rectopen', label: '矩形展开', category: 'open', directions: [] },
      { name: 'hlslice', label: '水平切片', category: 'slice', directions: ['left', 'right'] },
      { name: 'vlslice', label: '垂直切片', category: 'slice', directions: ['up', 'down'] },
      { name: 'dissolve', label: '溶解', category: 'special', directions: [] },
      { name: 'pixelize', label: '像素化', category: 'special', directions: [] },
      { name: 'radial', label: '径向擦除', category: 'special', directions: ['left', 'right'] }
    ];
  }

  /**
   * 生成 FFmpeg 转场滤镜字符串
   * @param {string} input1 - 第一个输入标签 (如 "0:v")
   * @param {string} input2 - 第二个输入标签 (如 "1:v")
   * @param {string} output - 输出标签 (如 "v01")
   * @param {string} type - 转场类型
   * @param {number} duration - 转场时长 (秒)
   * @param {number} offset - 转场开始时间 (秒)
   * @param {string} direction - 方向 (可选)
   * @returns {string} FFmpeg 滤镜字符串
   */
  generateFilter(input1, input2, output, type, duration, offset, direction = null) {
    let filter = `[${input1}][${input2}]xfade=transition=${type}:duration=${duration}:offset=${offset}`;
    
    if (direction && this._supportsDirection(type)) {
      filter += `:direction=${direction}`;
    }
    
    filter += `[${output}]`;
    return filter;
  }

  /**
   * 检查转场类型是否支持方向参数
   */
  _supportsDirection(type) {
    const transition = this.transitions.find(t => t.name === type);
    return transition && transition.directions.length > 0;
  }

  /**
   * 使用预设生成滤镜
   */
  generateFromPreset(input1, input2, output, presetName, offset) {
    const preset = this.presets[presetName] || this.presets.default;
    return this.generateFilter(input1, input2, output, preset.transition, preset.duration, offset);
  }

  /**
   * 获取所有可用转场
   */
  getAvailableTransitions() {
    return this.transitions;
  }

  /**
   * 按分类获取转场
   */
  getByCategory(category) {
    return this.transitions.filter(t => t.category === category);
  }

  /**
   * 获取预设列表
   */
  getPresets() {
    return Object.keys(this.presets).map(key => ({
      name: key,
      ...this.presets[key]
    }));
  }
}

module.exports = TransitionManager;
