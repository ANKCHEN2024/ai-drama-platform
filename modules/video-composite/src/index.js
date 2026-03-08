/**
 * 视频合成模块入口
 * @module @ai-drama/video-composite
 */

const VideoComposer = require('./composer');
const TransitionManager = require('./transition');
const SubtitleGenerator = require('./subtitle');
const AudioMixer = require('./audio');

module.exports = {
  VideoComposer,
  TransitionManager,
  SubtitleGenerator,
  AudioMixer
};
