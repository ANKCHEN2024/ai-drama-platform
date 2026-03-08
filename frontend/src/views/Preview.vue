<template>
  <Layout>
    <div class="preview-page">
      <div class="preview-header">
        <el-button link @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 class="preview-title">{{ project?.name || '项目预览' }}</h2>
        <div class="preview-actions">
          <el-button type="primary" :icon="Download" @click="downloadVideo">
            下载视频
          </el-button>
          <el-button :icon="Share" @click="shareProject">
            分享
          </el-button>
        </div>
      </div>
      
      <el-row :gutter="20">
        <!-- 左侧：视频播放器 -->
        <el-col :xs="24" :lg="16">
          <el-card class="player-card">
            <div class="video-player">
              <video
                ref="videoRef"
                :src="currentVideoUrl"
                controls
                class="video-element"
                @loadedmetadata="onVideoLoaded"
              />
            </div>
            
            <div class="video-info">
              <div class="video-title">
                <h3>{{ currentEpisode?.title || '第 1 集' }}</h3>
                <el-tag v-if="project?.status === 'completed'" type="success">
                  已完成
                </el-tag>
              </div>
              <p class="video-description">
                {{ currentEpisode?.description || '暂无描述' }}
              </p>
            </div>
            
            <!-- 播放列表 -->
            <div class="episode-list">
              <div class="list-header">
                <span>剧集列表</span>
                <span class="list-count">共{{ episodes.length }}集</span>
              </div>
              <div class="list-content">
                <div
                  v-for="ep in episodes"
                  :key="ep.id"
                  class="episode-item"
                  :class="{ active: currentEpisode?.id === ep.id }"
                  @click="playEpisode(ep)"
                >
                  <div class="episode-number">{{ ep.number }}</div>
                  <div class="episode-info">
                    <div class="episode-title">{{ ep.title }}</div>
                    <div class="episode-duration">
                      <el-icon><Timer /></el-icon>
                      {{ ep.duration }}分钟
                    </div>
                  </div>
                  <div class="episode-status">
                    <el-icon v-if="ep.status === 'completed'" color="#67C23A"><Check /></el-icon>
                    <el-icon v-else-if="ep.status === 'generating'" class="is-loading"><Loading /></el-icon>
                    <el-icon v-else><Clock /></el-icon>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <!-- 右侧：项目信息 -->
        <el-col :xs="24" :lg="8">
          <el-card class="info-card">
            <template #header>
              <span>项目信息</span>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="项目名称">{{ project?.name }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="getStatusType(project?.status)">
                  {{ getStatusText(project?.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="总集数">{{ project?.episodes }}集</el-descriptions-item>
              <el-descriptions-item label="总时长">{{ totalDuration }}分钟</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ formatDate(project?.createdAt) }}</el-descriptions-item>
              <el-descriptions-item label="更新时间">{{ formatDate(project?.updatedAt) }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
          
          <el-card class="characters-card" style="margin-top: 20px">
            <template #header>
              <span>主要人物</span>
            </template>
            <div class="characters-list">
              <div v-for="char in characters" :key="char.id" class="character-item">
                <el-avatar :size="48" :src="char.avatar" />
                <div class="character-info">
                  <div class="character-name">{{ char.name }}</div>
                  <div class="character-role">{{ char.role }}</div>
                </div>
              </div>
            </div>
          </el-card>
          
          <el-card class="storyboard-card" style="margin-top: 20px">
            <template #header>
              <div class="card-header-flex">
                <span>分镜预览</span>
                <el-select v-model="selectedEpisode" size="small" style="width: 120px">
                  <el-option
                    v-for="ep in episodes"
                    :key="ep.id"
                    :label="`第${ep.number}集`"
                    :value="ep.id"
                  />
                </el-select>
              </div>
            </template>
            <div class="storyboard-list">
              <div v-for="board in storyboards" :key="board.id" class="storyboard-item">
                <div class="storyboard-scene">场景 {{ board.sceneNumber }}</div>
                <div class="storyboard-desc">{{ board.description }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Download, Share } from '@element-plus/icons-vue'
import { useProjectStore } from '@/stores/project'
import { useStoryStore } from '@/stores/story'
import Layout from '@/components/Layout.vue'

const route = useRoute()
const projectStore = useProjectStore()
const storyStore = useStoryStore()

const videoRef = ref(null)
const project = ref(null)
const currentEpisode = ref(null)
const currentVideoUrl = ref('')
const selectedEpisode = ref('')

const episodes = ref([
  { id: 1, number: 1, title: '初遇', duration: 2, status: 'completed', description: '男女主角在咖啡厅偶遇' },
  { id: 2, number: 2, title: '误会', duration: 2, status: 'completed', description: '因为一场误会产生矛盾' },
  { id: 3, number: 3, title: '和解', duration: 2, status: 'generating', description: '误会解除，感情升温' },
  { id: 4, number: 4, title: '考验', duration: 2, status: 'pending', description: '面临外部挑战' },
  { id: 5, number: 5, title: '圆满', duration: 2, status: 'pending', description: '幸福结局' }
])

const characters = ref([
  { id: 1, name: '林逸', role: '男主角', avatar: '' },
  { id: 2, name: '苏晴', role: '女主角', avatar: '' },
  { id: 3, name: '林母', role: '配角', avatar: '' },
  { id: 4, name: '闺蜜', role: '配角', avatar: '' }
])

const storyboards = ref([
  { id: 1, sceneNumber: 1, description: '咖啡厅内景，温馨浪漫的氛围' },
  { id: 2, sceneNumber: 2, description: '男女主角对视，特写镜头' },
  { id: 3, sceneNumber: 3, description: '咖啡洒落，慢动作' }
])

const totalDuration = computed(() => {
  return episodes.value.reduce((sum, ep) => sum + (ep.duration || 0), 0)
})

onMounted(async () => {
  const projectId = route.params.id
  if (projectId) {
    project.value = await projectStore.fetchProjectDetail(projectId)
    selectedEpisode.value = episodes.value[0]?.id
    currentEpisode.value = episodes.value[0]
    currentVideoUrl.value = '/sample-video.mp4' // TODO: 替换为实际视频 URL
  }
})

function getStatusType(status) {
  const map = {
    'pending': 'info',
    'analyzing': 'warning',
    'generating': 'warning',
    'completed': 'success'
  }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = {
    'pending': '待开始',
    'analyzing': '分析中',
    'generating': '生成中',
    'completed': '已完成'
  }
  return map[status] || status
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

function onVideoLoaded() {
  console.log('视频加载完成')
}

function playEpisode(episode) {
  currentEpisode.value = episode
  // TODO: 加载实际视频
  currentVideoUrl.value = `/api/videos/${episode.id}/stream`
}

function downloadVideo() {
  ElMessage.info('开始下载视频...')
  // TODO: 实现下载逻辑
}

function shareProject() {
  ElMessage.info('分享功能开发中')
  // TODO: 实现分享逻辑
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.preview-page {
  max-width: 1440px;
  margin: 0 auto;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  margin-bottom: $spacing-lg;
  
  .preview-title {
    flex: 1;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
  }
  
  .preview-actions {
    display: flex;
    gap: $spacing-sm;
  }
}

.player-card {
  .video-player {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #000;
    border-radius: $border-radius-md;
    overflow: hidden;
    
    .video-element {
      width: 100%;
      height: 100%;
      display: block;
    }
  }
  
  .video-info {
    padding: $spacing-md 0;
    
    .video-title {
      display: flex;
      align-items: center;
      gap: $spacing-md;
      margin-bottom: $spacing-sm;
      
      h3 {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
        margin: 0;
      }
    }
    
    .video-description {
      font-size: 14px;
      color: #606266;
      line-height: 1.6;
    }
  }
  
  .episode-list {
    margin-top: $spacing-md;
    border-top: 1px solid #e4e7ed;
    
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $spacing-md 0;
      font-weight: 600;
      color: #303133;
      
      .list-count {
        font-size: 13px;
        color: #909399;
        font-weight: normal;
      }
    }
    
    .list-content {
      max-height: 400px;
      overflow-y: auto;
      
      .episode-item {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        padding: $spacing-md;
        border-radius: $border-radius-md;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover {
          background: #f5f7fa;
        }
        
        &.active {
          background: #ecf5ff;
          border-left: 3px solid $primary-color;
        }
        
        .episode-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: $gradient-primary;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
        }
        
        .episode-info {
          flex: 1;
          min-width: 0;
          
          .episode-title {
            font-size: 14px;
            color: #303133;
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .episode-duration {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #909399;
          }
        }
        
        .episode-status {
          flex-shrink: 0;
        }
      }
    }
  }
}

.info-card,
.characters-card,
.storyboard-card {
  :deep(.el-card__header) {
    padding: $spacing-md;
  }
  
  :deep(.el-card__body) {
    padding: $spacing-md;
  }
}

.characters-list {
  .character-item {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-sm 0;
    
    &:not(:last-child) {
      border-bottom: 1px solid #f0f0f0;
    }
    
    .character-info {
      .character-name {
        font-size: 14px;
        font-weight: 600;
        color: #303133;
      }
      
      .character-role {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}

.storyboard-list {
  .storyboard-item {
    padding: $spacing-sm 0;
    
    &:not(:last-child) {
      border-bottom: 1px solid #f0f0f0;
    }
    
    .storyboard-scene {
      font-size: 13px;
      font-weight: 600;
      color: $primary-color;
      margin-bottom: 4px;
    }
    
    .storyboard-desc {
      font-size: 13px;
      color: #606266;
      line-height: 1.6;
    }
  }
}

.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: $breakpoint-mobile) {
  .preview-header {
    flex-wrap: wrap;
    
    .preview-title {
      font-size: 18px;
    }
    
    .preview-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
  
  .episode-list {
    .list-content {
      max-height: 300px;
    }
  }
}
</style>
