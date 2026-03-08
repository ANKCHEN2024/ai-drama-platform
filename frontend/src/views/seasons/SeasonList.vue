<template>
  <div class="seasons-page">
    <div class="header">
      <h1>分季管理</h1>
      <div class="actions">
        <el-button type="primary" @click="goBack">返回项目</el-button>
        <el-button type="success" @click="showCreateDialog = true">新建分季</el-button>
      </div>
    </div>

    <div class="content">
      <el-card v-if="loading" class="loading-card">
        <el-skeleton :rows="5" animated />
      </el-card>

      <el-card v-else-if="seasons.length === 0" class="empty-card">
        <el-empty description="还没有分季，创建一个吧！" />
        <el-button type="primary" @click="showCreateDialog = true">创建第一个分季</el-button>
      </el-card>

      <div v-else class="seasons-list">
        <div class="seasons-grid">
          <el-card
            v-for="season in seasons"
            :key="season.id"
            class="season-card"
            shadow="hover"
          >
            <div class="season-header">
              <div class="season-number">第{{ season.number }}季</div>
            </div>
            <h3 class="season-title">{{ season.title }}</h3>
            <p class="season-description" v-if="season.description">{{ season.description }}</p>
            <div class="season-meta">
              <span class="episode-count">📺 {{ season.episodes?.length || 0 }} 集</span>
              <span class="update-time">更新于 {{ formatDate(season.updatedAt) }}</span>
            </div>
            <div class="season-actions">
              <el-button size="small" @click="viewSeason(season.id)">查看详情</el-button>
              <el-button size="small" @click="editSeason(season)">编辑</el-button>
              <el-button size="small" type="danger" @click="confirmDelete(season)">删除</el-button>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 创建分季对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建分季" width="500px">
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="80px">
        <el-form-item label="季号" prop="number">
          <el-input-number v-model="createForm.number" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="createForm.title" placeholder="请输入分季标题" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分季描述（可选）"
          />
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
import { createSeason, getSeasons, deleteSeason } from '@/api/season'

const router = useRouter()
const route = useRoute()
const projectId = computed(() => route.params.id)

const loading = ref(false)
const creating = ref(false)
const seasons = ref([])
const showCreateDialog = ref(false)
const createFormRef = ref(null)

const createForm = ref({
  number: 1,
  title: '',
  description: ''
})

const createRules = {
  number: [{ required: true, message: '请输入季号', trigger: 'blur' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }]
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const loadSeasons = async () => {
  loading.value = true
  try {
    const res = await getSeasons(projectId.value)
    seasons.value = res
  } catch (error) {
    ElMessage.error('加载分季列表失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push(`/projects/${projectId.value}`)
}

const viewSeason = (id) => {
  router.push(`/seasons/${id}`)
}

const editSeason = (season) => {
  router.push(`/seasons/${season.id}`)
}

const confirmDelete = async (season) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${season.title}"吗？删除后不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await deleteSeason(season.id)
    ElMessage.success('删除成功')
    loadSeasons()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleCreate = async () => {
  if (!createFormRef.value) return
  
  await createFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    creating.value = true
    try {
      await createSeason(projectId.value, createForm.value)
      ElMessage.success('创建成功')
      showCreateDialog.value = false
      createForm.value = {
        number: 1,
        title: '',
        description: ''
      }
      loadSeasons()
    } catch (error) {
      ElMessage.error('创建失败')
    } finally {
      creating.value = false
    }
  })
}

onMounted(() => {
  loadSeasons()
})
</script>

<style scoped>
.seasons-page {
  min-height: 100vh;
  background: #f5f7fa;
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
  color: #303133;
}

.actions {
  display: flex;
  gap: 10px;
}

.content {
  max-width: 1400px;
  margin: 0 auto;
}

.loading-card,
.empty-card {
  text-align: center;
  padding: 40px;
}

.seasons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.season-card {
  transition: transform 0.2s;
}

.season-card:hover {
  transform: translateY(-2px);
}

.season-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.season-number {
  font-size: 14px;
  color: #909399;
  font-weight: 500;
}

.season-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: #303133;
}

.season-description {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.season-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 13px;
  color: #909399;
}

.season-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}
</style>
