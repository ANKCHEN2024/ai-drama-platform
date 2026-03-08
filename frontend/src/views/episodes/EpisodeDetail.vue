<template>
  <div class="episode-detail-page">
    <div v-if="loading" class="loading">
      <el-skeleton :rows="10" animated />
    </div>

    <div v-else-if="!episode" class="empty">
      <el-empty description="分集不存在" />
      <el-button type="primary" @click="goBack">返回</el-button>
    </div>

    <div v-else>
      <!-- 分集信息 -->
      <div class="episode-header">
        <div class="breadcrumb">
          <el-link @click="goToProject">项目</el-link>
          <span> / </span>
          <el-link @click="goBack">分集列表</el-link>
          <span> / </span>
          <span>第{{ episode.number }}集</span>
        </div>
        <div class="actions">
          <el-tag :type="getStatusType(episode.status)" size="large">{{ getStatusText(episode.status) }}</el-tag>
          <el-button @click="editEpisode">编辑分集</el-button>
        </div>
      </div>

      <el-card class="episode-info">
        <h1>第{{ episode.number }}集：{{ episode.title }}</h1>
        <p v-if="episode.description" class="description">{{ episode.description }}</p>
        <div class="meta">
          <span>📹 {{ scenes.length }} 个分镜</span>
          <span>🕐 更新于 {{ formatDate(episode.updatedAt) }}</span>
        </div>
      </el-card>

      <!-- 分镜列表 -->
      <div class="scenes-section">
        <div class="section-header">
          <h2>分镜列表</h2>
          <el-button type="primary" @click="showCreateSceneDialog = true">新建分镜</el-button>
        </div>

        <div v-if="scenes.length === 0" class="empty-scenes">
          <el-empty description="还没有分镜" />
        </div>

        <div v-else class="scenes-list">
          <draggable
            v-model="scenes"
            item-key="id"
            @end="handleSceneReorder"
            class="draggable-list"
          >
            <template #item="{ element }">
              <el-card class="scene-card" shadow="hover">
                <div class="scene-header">
                  <div class="scene-number">第{{ element.number }}场</div>
                  <el-tag :type="getSceneStatusType(element.status)" size="small">
                    {{ getSceneStatusText(element.status) }}
                  </el-tag>
                </div>
                <div class="scene-info">
                  <div class="scene-location">
                    <el-tag size="small" effect="plain">{{ element.location }}</el-tag>
                    <el-tag size="small" effect="plain">{{ element.timeOfDay }}</el-tag>
                  </div>
                  <p class="scene-content">{{ element.content }}</p>
                  <p v-if="element.dialogue" class="scene-dialogue">
                    <strong>对话：</strong>{{ element.dialogue }}
                  </p>
                  <div class="scene-meta">
                    <span v-if="element.duration">⏱️ {{ element.duration }}秒</span>
                    <span>更新于 {{ formatDate(element.updatedAt) }}</span>
                  </div>
                </div>
                <div class="scene-actions">
                  <el-button size="small" @click="viewScene(element.id)">编辑分镜</el-button>
                  <el-button size="small" type="danger" @click="confirmDeleteScene(element)">删除</el-button>
                </div>
              </el-card>
            </template>
          </draggable>
        </div>
      </div>
    </div>

    <!-- 创建分镜对话框 -->
    <el-dialog v-model="showCreateSceneDialog" title="创建分镜" width="600px">
      <el-form :model="sceneForm" :rules="sceneRules" ref="sceneFormRef" label-width="80px">
        <el-form-item label="场号" prop="number">
          <el-input-number v-model="sceneForm.number" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="场景" prop="location">
          <el-select v-model="sceneForm.location" placeholder="请选择场景" style="width: 100%">
            <el-option label="内景" value="内" />
            <el-option label="外景" value="外" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间" prop="timeOfDay">
          <el-select v-model="sceneForm.timeOfDay" placeholder="请选择时间" style="width: 100%">
            <el-option label="日" value="日" />
            <el-option label="夜" value="夜" />
            <el-option label="黄昏" value="黄昏" />
            <el-option label="黎明" value="黎明" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="sceneForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入分镜内容描述"
          />
        </el-form-item>
        <el-form-item label="对话" prop="dialogue">
          <el-input
            v-model="sceneForm.dialogue"
            type="textarea"
            :rows="3"
            placeholder="请输入对话（可选）"
          />
        </el-form-item>
        <el-form-item label="时长" prop="duration">
          <el-input-number v-model="sceneForm.duration" :min="1" placeholder="预计时长（秒）" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="sceneForm.status" style="width: 100%">
            <el-option label="草稿" value="draft" />
            <el-option label="拍摄中" value="filming" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateSceneDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateScene" :loading="creatingScene">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import draggable from 'vuedraggable'
import { getEpisode, deleteEpisode } from '@/api/episode'
import { getScenes, createScene, deleteScene, reorderScene } from '@/api/scene'

const router = useRouter()
const route = useRoute()
const episodeId = route.params.id

const loading = ref(false)
const creatingScene = ref(false)
const episode = ref(null)
const scenes = ref([])
const showCreateSceneDialog = ref(false)
const sceneFormRef = ref(null)

const sceneForm = ref({
  number: 1,
  location: '内',
  timeOfDay: '日',
  content: '',
  dialogue: '',
  duration: null,
  status: 'draft'
})

const sceneRules = {
  number: [{ required: true, message: '请输入场号', trigger: 'blur' }],
  location: [{ required: true, message: '请选择场景', trigger: 'change' }],
  timeOfDay: [{ required: true, message: '请选择时间', trigger: 'change' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const getStatusType = (status) => {
  const map = {
    draft: 'info',
    recording: 'warning',
    editing: 'primary',
    completed: 'success'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    draft: '草稿',
    recording: '录制中',
    editing: '剪辑中',
    completed: '已完成'
  }
  return map[status] || status
}

const getSceneStatusType = (status) => {
  const map = {
    draft: 'info',
    filming: 'warning',
    completed: 'success'
  }
  return map[status] || 'info'
}

const getSceneStatusText = (status) => {
  const map = {
    draft: '草稿',
    filming: '拍摄中',
    completed: '已完成'
  }
  return map[status] || status
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const loadEpisode = async () => {
  loading.value = true
  try {
    episode.value = await getEpisode(episodeId)
    scenes.value = episode.value.scenes || []
  } catch (error) {
    ElMessage.error('加载分集信息失败')
  } finally {
    loading.value = false
  }
}

const handleCreateScene = async () => {
  if (!sceneFormRef.value) return
  await sceneFormRef.value.validate(async (valid) => {
    if (!valid) return
    creatingScene.value = true
    try {
      await createScene(episodeId, sceneForm.value)
      ElMessage.success('创建成功')
      showCreateSceneDialog.value = false
      sceneForm.value = {
        number: scenes.value.length + 1,
        location: '内',
        timeOfDay: '日',
        content: '',
        dialogue: '',
        duration: null,
        status: 'draft'
      }
      loadEpisode()
    } catch (error) {
      ElMessage.error(error.response?.data?.error || '创建失败')
    } finally {
      creatingScene.value = false
    }
  })
}

const confirmDeleteScene = async (scene) => {
  try {
    await ElMessageBox.confirm(`确定要删除第${scene.number}场吗？`, '确认删除', { type: 'warning' })
    await deleteScene(scene.id)
    ElMessage.success('删除成功')
    loadEpisode()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleSceneReorder = async () => {
  try {
    ElMessage.success('排序已更新')
  } catch (error) {
    ElMessage.error('排序失败')
  }
}

const editEpisode = () => {
  router.push(`/episodes/${episodeId}/edit`)
}

const viewScene = (sceneId) => {
  router.push(`/episodes/${episodeId}/scenes/${sceneId}`)
}

const goBack = () => {
  if (episode.value?.projectId) {
    router.push(`/projects/${episode.value.projectId}/episodes`)
  } else {
    router.back()
  }
}

const goToProject = () => {
  if (episode.value?.project?.id) {
    router.push(`/projects/${episode.value.project.id}`)
  }
}

onMounted(() => {
  loadEpisode()
})
</script>

<style scoped>
.episode-detail-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.loading,
.empty {
  padding: 40px;
}

.episode-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.breadcrumb {
  font-size: 14px;
  color: #666;
}

.breadcrumb .el-link {
  margin: 0 4px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.episode-info {
  margin-bottom: 30px;
}

.episode-info h1 {
  margin: 0 0 10px 0;
  font-size: 24px;
}

.description {
  color: #666;
  margin: 0 0 15px 0;
  line-height: 1.6;
}

.meta {
  display: flex;
  gap: 20px;
  color: #999;
  font-size: 14px;
}

.scenes-section {
  margin-top: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
}

.empty-scenes {
  padding: 40px;
  text-align: center;
}

.scenes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.scene-card {
  cursor: move;
}

.scene-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.scene-number {
  font-size: 14px;
  color: #666;
  font-weight: bold;
}

.scene-info {
  margin-bottom: 15px;
}

.scene-location {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.scene-content {
  color: #333;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 10px 0;
}

.scene-dialogue {
  color: #666;
  font-size: 13px;
  margin: 0 0 10px 0;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
}

.scene-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.scene-actions {
  display: flex;
  gap: 8px;
}

.draggable-list {
  min-height: 100px;
}
</style>
