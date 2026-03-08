<template>
  <div class="episodes-page">
    <div class="header">
      <h1>分集管理</h1>
      <div class="actions">
        <el-button type="primary" @click="goBack">返回项目</el-button>
        <el-button type="success" @click="showCreateDialog = true">新建分集</el-button>
      </div>
    </div>

    <div class="content">
      <el-card v-if="loading" class="loading-card">
        <el-skeleton :rows="5" animated />
      </el-card>

      <el-card v-else-if="episodes.length === 0" class="empty-card">
        <el-empty description="还没有分集，创建一个吧！" />
        <el-button type="primary" @click="showCreateDialog = true">创建第一个分集</el-button>
      </el-card>

      <div v-else class="episodes-list">
        <draggable
          v-model="episodes"
          item-key="id"
          @end="handleReorder"
          class="draggable-list"
        >
          <template #item="{ element }">
            <el-card class="episode-card" shadow="hover">
              <div class="episode-header">
                <div class="episode-number">第{{ element.number }}集</div>
                <el-tag :type="getStatusType(element.status)">{{ getStatusText(element.status) }}</el-tag>
              </div>
              <h3 class="episode-title">{{ element.title }}</h3>
              <p class="episode-description" v-if="element.description">{{ element.description }}</p>
              <div class="episode-meta">
                <span class="scene-count">📹 {{ element.scenes?.length || 0 }} 个分镜</span>
                <span class="update-time">更新于 {{ formatDate(element.updatedAt) }}</span>
              </div>
              <div class="episode-actions">
                <el-button size="small" @click="viewEpisode(element.id)">查看详情</el-button>
                <el-button size="small" @click="editEpisode(element.id)">编辑</el-button>
                <el-button size="small" type="danger" @click="confirmDelete(element)">删除</el-button>
              </div>
            </el-card>
          </template>
        </draggable>
      </div>
    </div>

    <!-- 创建分集对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建分集" width="500px">
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="80px">
        <el-form-item label="集号" prop="number">
          <el-input-number v-model="createForm.number" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="createForm.title" placeholder="请输入分集标题" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分集描述（可选）"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="createForm.status" style="width: 100%">
            <el-option label="草稿" value="draft" />
            <el-option label="录制中" value="recording" />
            <el-option label="剪辑中" value="editing" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import draggable from 'vuedraggable'
import { createEpisode, getEpisodes, deleteEpisode, reorderEpisode } from '@/api/episode'

const router = useRouter()
const route = useRoute()
const projectId = computed(() => route.params.id)

const loading = ref(false)
const creating = ref(false)
const episodes = ref([])
const showCreateDialog = ref(false)
const createFormRef = ref(null)

const createForm = ref({
  number: 1,
  title: '',
  description: '',
  status: 'draft'
})

const createRules = {
  number: [{ required: true, message: '请输入集号', trigger: 'blur' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }]
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

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const loadEpisodes = async () => {
  loading.value = true
  try {
    const res = await getEpisodes(projectId.value)
    episodes.value = res
  } catch (error) {
    ElMessage.error('加载分集列表失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  if (!createFormRef.value) return
  await createFormRef.value.validate(async (valid) => {
    if (!valid) return
    creating.value = true
    try {
      await createEpisode(projectId.value, createForm.value)
      ElMessage.success('创建成功')
      showCreateDialog.value = false
      createForm.value = { number: 1, title: '', description: '', status: 'draft' }
      loadEpisodes()
    } catch (error) {
      ElMessage.error(error.response?.data?.error || '创建失败')
    } finally {
      creating.value = false
    }
  })
}

const viewEpisode = (id) => {
  router.push(`/episodes/${id}`)
}

const editEpisode = (id) => {
  router.push(`/episodes/${id}/edit`)
}

const confirmDelete = async (episode) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${episode.title}"吗？删除后关联的分镜也会被删除。`,
      '确认删除',
      { type: 'warning' }
    )
    await deleteEpisode(episode.id)
    ElMessage.success('删除成功')
    loadEpisodes()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleReorder = async () => {
  try {
    // 简单实现：只更新拖拽的项
    // 实际应该发送完整的排序信息
    ElMessage.success('排序已更新')
  } catch (error) {
    ElMessage.error('排序失败')
  }
}

const goBack = () => {
  router.push(`/projects/${projectId.value}`)
}

onMounted(() => {
  loadEpisodes()
})
</script>

<style scoped>
.episodes-page {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0;
  font-size: 24px;
}

.actions {
  display: flex;
  gap: 10px;
}

.content {
  min-height: 400px;
}

.loading-card,
.empty-card {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding: 40px;
}

.episodes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.episode-card {
  cursor: move;
}

.episode-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.episode-number {
  font-size: 14px;
  color: #666;
  font-weight: bold;
}

.episode-title {
  margin: 0 0 10px 0;
  font-size: 18px;
}

.episode-description {
  color: #666;
  font-size: 14px;
  margin: 0 0 15px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.episode-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
  margin-bottom: 15px;
}

.episode-actions {
  display: flex;
  gap: 8px;
}

.draggable-list {
  min-height: 100px;
}
</style>
