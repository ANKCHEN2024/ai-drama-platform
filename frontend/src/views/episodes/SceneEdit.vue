<template>
  <div class="scene-edit-page">
    <div v-if="loading" class="loading">
      <el-skeleton :rows="10" animated />
    </div>

    <div v-else-if="!scene" class="empty">
      <el-empty description="分镜不存在" />
      <el-button type="primary" @click="goBack">返回</el-button>
    </div>

    <div v-else>
      <div class="header">
        <div class="breadcrumb">
          <el-link @click="goToEpisode">分集详情</el-link>
          <span> / </span>
          <span>第{{ scene.episode?.number }}集</span>
          <span> / </span>
          <span>第{{ scene.number }}场</span>
        </div>
        <el-button @click="goBack">返回</el-button>
      </div>

      <el-card class="form-card">
        <template #header>
          <div class="card-header">
            <h2>编辑分镜</h2>
            <el-tag :type="getStatusType(scene.status)">{{ getStatusText(scene.status) }}</el-tag>
          </div>
        </template>

        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="场号" prop="number">
            <el-input-number v-model="form.number" :min="1" style="width: 200px" />
          </el-form-item>
          <el-form-item label="场景" prop="location">
            <el-select v-model="form.location" style="width: 200px">
              <el-option label="内景" value="内" />
              <el-option label="外景" value="外" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间" prop="timeOfDay">
            <el-select v-model="form.timeOfDay" style="width: 200px">
              <el-option label="日" value="日" />
              <el-option label="夜" value="夜" />
              <el-option label="黄昏" value="黄昏" />
              <el-option label="黎明" value="黎明" />
            </el-select>
          </el-form-item>
          <el-form-item label="内容" prop="content">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="6"
              placeholder="请输入分镜内容描述"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="对话" prop="dialogue">
            <el-input
              v-model="form.dialogue"
              type="textarea"
              :rows="4"
              placeholder="请输入对话（可选）"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="预计时长" prop="duration">
            <el-input-number v-model="form.duration" :min="1" placeholder="秒" />
            <span class="hint">（单位：秒）</span>
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="form.status" style="width: 200px">
              <el-option label="草稿" value="draft" />
              <el-option label="拍摄中" value="filming" />
              <el-option label="已完成" value="completed" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSubmit" :loading="saving">保存</el-button>
            <el-button @click="goBack">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getScene, updateScene } from '@/api/scene'

const router = useRouter()
const route = useRoute()
const sceneId = route.params.sceneId
const episodeId = route.params.id

const loading = ref(false)
const saving = ref(false)
const scene = ref(null)
const formRef = ref(null)

const form = ref({
  number: 1,
  location: '内',
  timeOfDay: '日',
  content: '',
  dialogue: '',
  duration: null,
  status: 'draft'
})

const rules = {
  number: [{ required: true, message: '请输入场号', trigger: 'blur' }],
  location: [{ required: true, message: '请选择场景', trigger: 'change' }],
  timeOfDay: [{ required: true, message: '请选择时间', trigger: 'change' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const getStatusType = (status) => {
  const map = {
    draft: 'info',
    filming: 'warning',
    completed: 'success'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    draft: '草稿',
    filming: '拍摄中',
    completed: '已完成'
  }
  return map[status] || status
}

const loadScene = async () => {
  loading.value = true
  try {
    scene.value = await getScene(sceneId)
    form.value = {
      number: scene.value.number,
      location: scene.value.location,
      timeOfDay: scene.value.timeOfDay,
      content: scene.value.content,
      dialogue: scene.value.dialogue || '',
      duration: scene.value.duration,
      status: scene.value.status
    }
  } catch (error) {
    ElMessage.error('加载分镜信息失败')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      await updateScene(sceneId, form.value)
      ElMessage.success('保存成功')
      loadScene()
    } catch (error) {
      ElMessage.error(error.response?.data?.error || '保存失败')
    } finally {
      saving.value = false
    }
  })
}

const goBack = () => {
  router.push(`/episodes/${episodeId}`)
}

const goToEpisode = () => {
  router.push(`/episodes/${episodeId}`)
}

onMounted(() => {
  loadScene()
})
</script>

<style scoped>
.scene-edit-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.loading,
.empty {
  padding: 40px;
}

.header {
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

.form-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
}

.hint {
  margin-left: 10px;
  color: #999;
  font-size: 12px;
}
</style>
