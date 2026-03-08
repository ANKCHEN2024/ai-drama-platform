<template>
  <Layout>
    <div class="video-generator">
      <el-page-header @back="goBack" content="视频生成">
        <template #extra>
          <el-button type="primary" :loading="videoStore.generating" @click="startGenerate" :disabled="!canGenerate">
            <el-icon><VideoPlay /></el-icon>
            开始生成
          </el-button>
        </template>
      </el-page-header>

      <el-row :gutter="20" class="generator-content">
        <el-col :span="16">
          <el-card class="config-card">
            <template #header>
              <div class="card-header">
                <span>生成配置</span>
              </div>
            </template>

            <el-form :model="generateConfig" label-width="120px">
              <el-form-item label="选择集数">
                <el-select v-model="generateConfig.episodeId" placeholder="请选择要生成的剧集" style="width: 100%">
                  <el-option
                    v-for="episode in episodeStore.episodes"
                    :key="episode.id"
                    :label="`第${episode.episodeNumber}集：${episode.title || '未命名'}`"
                    :value="episode.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="选择人物">
                <el-checkbox-group v-model="generateConfig.characters">
                  <el-checkbox
                    v-for="char in characterStore.characters"
                    :key="char.id"
                    :label="char.id"
                  >
                    {{ char.name }}
                  </el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <el-form-item label="选择场景">
                <el-checkbox-group v-model="generateConfig.scenes">
                  <el-checkbox
                    v-for="scene in sceneStore.scenes"
                    :key="scene.id"
                    :label="scene.id"
                  >
                    {{ scene.name }}
                  </el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <el-divider />

              <el-form-item label="视频比例">
                <el-select v-model="generateConfig.videoRatio" style="width: 200px">
                  <el-option label="9:16 (竖屏)" value="9:16" />
                  <el-option label="16:9 (横屏)" value="16:9" />
                  <el-option label="1:1 (正方形)" value="1:1" />
                </el-select>
              </el-form-item>

              <el-form-item label="视频质量">
                <el-select v-model="generateConfig.videoQuality" style="width: 200px">
                  <el-option label="720p" value="720p" />
                  <el-option label="1080p" value="1080p" />
                  <el-option label="4K" value="4K" />
                </el-select>
              </el-form-item>

              <el-divider />

              <el-form-item label="默认配音">
                <el-select v-model="generateConfig.defaultVoice" style="width: 200px">
                  <el-option label="女声-温柔" value="female_gentle" />
                  <el-option label="女声-活泼" value="female_lively" />
                  <el-option label="男声-沉稳" value="male_calm" />
                  <el-option label="男声-浑厚" value="male_deep" />
                </el-select>
              </el-form-item>

              <el-form-item label="BGM 风格">
                <el-select v-model="generateConfig.bgmStyle" style="width: 200px">
                  <el-option label="情感" value="emotional" />
                  <el-option label="紧张" value="tense" />
                  <el-option label="温馨" value="warm" />
                  <el-option label="悬疑" value="suspense" />
                  <el-option label="无 BGM" value="none" />
                </el-select>
              </el-form-item>
            </el-form>
          </el-card>

          <el-card class="preview-card" style="margin-top: 20px">
            <template #header>
              <div class="card-header">
                <span>分镜预览</span>
                <el-tag v-if="generateConfig.episodeId" type="info">
                  {{ storyboardStore.storyboards.length }} 个镜头
                </el-tag>
              </div>
            </template>

            <div v-if="!generateConfig.episodeId" class="empty-state">
              <el-empty description="请先选择一集" />
            </div>

            <div v-else-if="storyboardStore.storyboards.length === 0" class="empty-state">
              <el-empty description="该集暂无论镜" />
            </div>

            <div v-else class="storyboards-preview">
              <el-card
                v-for="(board, index) in storyboardStore.storyboards"
                :key="board.id"
                class="storyboard-preview-item"
              >
                <div class="preview-header">
                  <el-tag type="primary">镜头 {{ board.shotNumber }}</el-tag>
                  <span class="duration">{{ board.duration || 0 }}秒</span>
                </div>
                <div class="preview-content">
                  <div class="preview-row">
                    <span class="label">景别：</span>
                    <span>{{ board.shotType || '-' }}</span>
                  </div>
                  <div class="preview-row">
                    <span class="label">画面：</span>
                    <span>{{ board.visualDescription || board.description || '-' }}</span>
                  </div>
                  <div class="preview-row" v-if="board.action">
                    <span class="label">动作：</span>
                    <span>{{ board.action }}</span>
                  </div>
                  <div class="preview-row" v-if="board.dialogue">
                    <span class="label">对白：</span>
                    <span>{{ board.dialogue }}</span>
                  </div>
                </div>
              </el-card>
            </div>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card class="progress-card">
            <template #header>
              <div class="card-header">
                <span>生成进度</span>
              </div>
            </template>

            <div v-if="currentTask" class="task-progress">
              <el-steps :active="currentStep" direction="vertical">
                <el-step title="准备素材" :description="getStepDesc(0)" />
                <el-step title="生成视频片段" :description="getStepDesc(1)" />
                <el-step title="合成配音" :description="getStepDesc(2)" />
                <el-step title="添加 BGM" :description="getStepDesc(3)" />
                <el-step title="视频合成" :description="getStepDesc(4)" />
              </el-steps>

              <el-progress
                :percentage="currentTask.progress"
                :status="currentTask.status === 'completed' ? 'success' : currentTask.status === 'failed' ? 'exception' : ''"
                style="margin-top: 20px"
              />
              <p class="status-text">{{ currentTask.message || '处理中...' }}</p>
            </div>

            <div v-else class="empty-state">
              <el-empty description="暂无进行中的任务" />
            </div>
          </el-card>

          <el-card class="history-card" style="margin-top: 20px">
            <template #header>
              <div class="card-header">
                <span>历史记录</span>
              </div>
            </template>

            <div v-if="videoStore.videos.length === 0" class="empty-state">
              <el-empty description="暂无历史记录" />
            </div>

            <div v-else class="video-history">
              <div
                v-for="video in videoStore.videos"
                :key="video.id"
                class="history-item"
              >
                <div class="history-info">
                  <div class="history-title">{{ video.title || `视频 ${video.id}` }}</div>
                  <div class="history-meta">
                    <el-tag :type="getStatusType(video.status)" size="small">
                      {{ getStatusText(video.status) }}
                    </el-tag>
                    <span class="time">{{ formatDate(video.createdAt) }}</span>
                  </div>
                </div>
                <div class="history-actions">
                  <el-button link type="primary" size="small" v-if="video.status === 'completed'">
                    预览
                  </el-button>
                  <el-button link type="danger" size="small">
                    删除
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useProjectStore } from '@/stores/project'
import { useEpisodeStore } from '@/stores/episode'
import { useCharacterStore } from '@/stores/character'
import { useSceneStore } from '@/stores/scene'
import { useStoryboardStore } from '@/stores/storyboard'
import { useVideoStore } from '@/stores/video'
import Layout from '@/components/Layout.vue'

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()
const episodeStore = useEpisodeStore()
const characterStore = useCharacterStore()
const sceneStore = useSceneStore()
const storyboardStore = useStoryboardStore()
const videoStore = useVideoStore()

const currentTask = ref(null)
const currentStep = ref(0)

const generateConfig = ref({
  episodeId: null,
  characters: [],
  scenes: [],
  videoRatio: '9:16',
  videoQuality: '1080p',
  defaultVoice: 'female_gentle',
  bgmStyle: 'emotional'
})

const canGenerate = computed(() => {
  return generateConfig.value.episodeId && 
         storyboardStore.storyboards.length > 0
})

onMounted(async () => {
  await loadData()
  await videoStore.fetchVideoList({ projectId: route.params.id })
})

async function loadData() {
  const projectId = route.params.id
  await projectStore.fetchProjectDetail(projectId)
  
  await Promise.all([
    episodeStore.fetchEpisodes(1),
    characterStore.fetchCharacters(projectId),
    sceneStore.fetchScenes(projectId)
  ])
}

watch(() => generateConfig.value.episodeId, async (episodeId) => {
  if (episodeId) {
    await storyboardStore.fetchStoryboards(episodeId)
    
    generateConfig.value.characters = characterStore.characters.map(c => c.id)
    generateConfig.value.scenes = sceneStore.scenes.map(s => s.id)
  }
})

function goBack() {
  router.push(`/projects/${route.params.id}`)
}

async function startGenerate() {
  try {
    const task = await videoStore.createVideo({
      projectId: route.params.id,
      episodeId: generateConfig.value.episodeId,
      characters: generateConfig.value.characters,
      scenes: generateConfig.value.scenes,
      voiceOptions: {
        defaultVoice: generateConfig.value.defaultVoice
      },
      bgmStyle: generateConfig.value.bgmStyle,
      videoRatio: generateConfig.value.videoRatio,
      videoQuality: generateConfig.value.videoQuality,
      outputFormat: 'mp4'
    })
    
    currentTask.value = {
      id: task.id,
      progress: 0,
      status: 'processing',
      message: '准备中...'
    }
    currentStep.value = 0
    
    ElMessage.success('任务已提交，开始生成视频')
    
    startProgressPolling(task.id)
  } catch (error) {
    ElMessage.error('生成失败，请重试')
  }
}

async function startProgressPolling(taskId) {
  const pollInterval = setInterval(async () => {
    try {
      const status = await videoStore.checkVideoStatus(taskId)
      currentTask.value = {
        ...currentTask.value,
        ...status
      }
      
      updateCurrentStep(status.progress)
      
      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(pollInterval)
        await videoStore.fetchVideoList({ projectId: route.params.id })
        
        if (status.status === 'completed') {
          ElMessage.success('视频生成完成！')
        } else {
          ElMessage.error('视频生成失败')
        }
      }
    } catch (error) {
      console.error('Polling error:', error)
    }
  }, 3000)
}

function updateCurrentStep(progress) {
  if (progress < 20) currentStep.value = 0
  else if (progress < 40) currentStep.value = 1
  else if (progress < 60) currentStep.value = 2
  else if (progress < 80) currentStep.value = 3
  else currentStep.value = 4
}

function getStepDesc(step) {
  const steps = ['待开始', '进行中', '进行中', '进行中', '完成']
  if (currentTask.value) {
    if (currentStep.value > step) return '已完成'
    if (currentStep.value === step) return steps[step]
  }
  return '待开始'
}

function getStatusType(status) {
  const map = {
    'pending': 'info',
    'processing': 'warning',
    'completed': 'success',
    'failed': 'danger'
  }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = {
    'pending': '待处理',
    'processing': '处理中',
    'completed': '已完成',
    'failed': '失败'
  }
  return map[status] || status
}

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.video-generator {
  max-width: 1440px;
  margin: 0 auto;
}

.generator-content {
  margin-top: $spacing-lg;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-state {
  padding: 40px 0;
}

.storyboards-preview {
  max-height: 600px;
  overflow-y: auto;
  
  .storyboard-preview-item {
    margin-bottom: $spacing-md;
    
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $spacing-sm;
      
      .duration {
        color: #909399;
        font-size: 14px;
      }
    }
    
    .preview-content {
      .preview-row {
        margin-bottom: $spacing-sm;
        font-size: 14px;
        line-height: 1.6;
        
        .label {
          color: #606266;
          font-weight: 500;
        }
      }
    }
  }
}

.task-progress {
  .status-text {
    text-align: center;
    margin-top: $spacing-sm;
    color: #606266;
  }
}

.video-history {
  max-height: 400px;
  overflow-y: auto;
  
  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-md 0;
    border-bottom: 1px solid #ebeef5;
    
    &:last-child {
      border-bottom: none;
    }
    
    .history-info {
      flex: 1;
      
      .history-title {
        font-size: 14px;
        font-weight: 500;
        color: #303133;
        margin-bottom: $spacing-xs;
      }
      
      .history-meta {
        display: flex;
        gap: $spacing-sm;
        align-items: center;
        
        .time {
          font-size: 12px;
          color: #909399;
        }
      }
    }
    
    .history-actions {
      display: flex;
      gap: $spacing-xs;
    }
  }
}
</style>
