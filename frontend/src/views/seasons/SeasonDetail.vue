<template>
  <div class="season-detail-page">
    <div v-if="loading" class="loading">
      <el-skeleton :rows="10" animated />
    </div>

    <div v-else-if="!season" class="empty">
      <el-empty description="分季不存在" />
      <el-button type="primary" @click="goBack">返回</el-button>
    </div>

    <div v-else>
      <!-- 分季信息 -->
      <div class="season-header">
        <div class="breadcrumb">
          <el-link @click="goToProject">项目</el-link>
          <span> / </span>
          <el-link @click="goBack">分季列表</el-link>
          <span> / </span>
          <span>第{{ season.number }}季</span>
        </div>
        <div class="actions">
          <el-button @click="editSeason">编辑分季</el-button>
        </div>
      </div>

      <el-card class="season-info">
        <h1>第{{ season.number }}季：{{ season.title }}</h1>
        <p v-if="season.description" class="description">{{ season.description }}</p>
        <div class="meta">
          <span>📺 {{ season.episodes?.length || 0 }} 集</span>
          <span>🕐 更新于 {{ formatDate(season.updatedAt) }}</span>
        </div>
      </el-card>

      <!-- 分集列表 -->
      <div class="episodes-section">
        <div class="section-header">
          <h2>分集列表</h2>
          <el-button type="primary" @click="showCreateEpisodeDialog = true">新建分集</el-button>
        </div>

        <div v-if="!season.episodes || season.episodes.length === 0" class="empty-episodes">
          <el-empty description="还没有分集" />
        </div>

        <div v-else class="episodes-list">
          <el-card
            v-for="episode in season.episodes"
            :key="episode.id"
            class="episode-card"
            shadow="hover"
          >
            <div class="episode-header">
              <div class="episode-number">第{{ episode.number }}集</div>
              <el-tag :type="getStatusType(episode.status)" size="small">
                {{ getStatusText(episode.status) }}
              </el-tag>
            </div>
            <h3 class="episode-title">{{ episode.title }}</h3>
            <p v-if="episode.description" class="episode-description">{{ episode.description }}</p>
            <div class="episode-meta">
              <span>🎬 {{ episode.scenes?.length || 0 }} 个分镜</span>
              <span>更新于 {{ formatDate(episode.updatedAt) }}</span>
            </div>
            <div class="episode-actions">
              <el-button size="small" @click="viewEpisode(episode.id)">查看详情</el-button>
              <el-button size="small" @click="editEpisode(episode)">编辑</el-button>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 创建分集对话框 -->
    <el-dialog v-model="showCreateEpisodeDialog" title="创建分集" width="500px">
      <el-form :model="episodeForm" :rules="episodeRules" ref="episodeFormRef" label-width="80px">
        <el-form-item label="集号" prop="number">
          <el-input-number v-model="episodeForm.number" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="episodeForm.title" placeholder="请输入分集标题" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="episodeForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分集描述（可选）"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="episodeForm.status" style="width: 100%">
            <el-option label="草稿" value="draft" />
            <el-option label="拍摄中" value="recording" />
            <el-option label="后期制作" value="editing" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateEpisodeDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateEpisode" :loading="creatingEpisode">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getSeason } from '@/api/season'
import { createEpisode } from '@/api/episode'

const router = useRouter()
const route = useRoute()
const seasonId = computed(() => route.params.id)

const loading = ref(false)
const creatingEpisode = ref(false)
const season = ref(null)
const showCreateEpisodeDialog = ref(false)
const episodeFormRef = ref(null)

const episodeForm = ref({
  number: 1,
  title: '',
  description: '',
  status: 'draft'
})

const episodeRules = {
  number: [{ required: true, message: '请输入集号', trigger: 'blur' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }]
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const getStatusType = (status) => {
  const types = {
    draft: 'info',
    recording: 'warning',
    editing: 'primary',
    completed: 'success'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    draft: '草稿',
    recording: '拍摄中',
    editing: '后期制作',
    completed: '已完成'
  }
  return texts[status] || status
}

const loadSeason = async () => {
  loading.value = true
  try {
    const res = await getSeason(seasonId.value)
    season.value = res
  } catch (error) {
    ElMessage.error('加载分季详情失败')
  } finally {
    loading.value = false
  }
}

const goToProject = () => {
  if (season.value?.projectId) {
    router.push(`/projects/${season.value.projectId}`)
  }
}

const goBack = () => {
  if (season.value?.projectId) {
    router.push(`/projects/${season.value.projectId}/seasons`)
  } else {
    router.back()
  }
}

const editSeason = () => {
  // 可以在这里打开编辑对话框或跳转到编辑页面
  ElMessage.info('编辑功能开发中')
}

const viewEpisode = (id) => {
  router.push(`/episodes/${id}`)
}

const editEpisode = (episode) => {
  router.push(`/episodes/${episode.id}`)
}

const handleCreateEpisode = async () => {
  if (!episodeFormRef.value) return
  
  await episodeFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    creatingEpisode.value = true
    try {
      const data = {
        ...episodeForm.value,
        seasonId: seasonId.value,
        projectId: season.value.projectId
      }
      await createEpisode(data)
      ElMessage.success('创建成功')
      showCreateEpisodeDialog.value = false
      episodeForm.value = {
        number: 1,
        title: '',
        description: '',
        status: 'draft'
      }
      loadSeason()
    } catch (error) {
      ElMessage.error('创建失败')
    } finally {
      creatingEpisode.value = false
    }
  })
}

onMounted(() => {
  loadSeason()
})
</script>

<style scoped>
.season-detail-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.loading,
.empty {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
}

.season-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.breadcrumb .el-link {
  cursor: pointer;
}

.season-info {
  max-width: 1200px;
  margin: 0 auto 20px auto;
}

.season-info h1 {
  margin: 0 0 12px 0;
  font-size: 24px;
  color: #303133;
}

.description {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.meta {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #909399;
}

.episodes-section {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.empty-episodes {
  background: #fff;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
}

.episodes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.episode-card {
  transition: transform 0.2s;
}

.episode-card:hover {
  transform: translateY(-2px);
}

.episode-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.episode-number {
  font-size: 14px;
  color: #909399;
  font-weight: 500;
}

.episode-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #303133;
}

.episode-description {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.episode-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 13px;
  color: #909399;
}

.episode-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}
</style>
