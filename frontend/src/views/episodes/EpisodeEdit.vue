<template>
  <div class="episode-edit-page">
    <div class="header">
      <h1>编辑分集</h1>
      <el-button @click="goBack">取消</el-button>
    </div>

    <el-card class="form-card">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="集号" prop="number">
          <el-input-number v-model="form.number" :min="1" style="width: 200px" />
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入分集标题" style="width: 400px" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请输入分集描述（可选）"
            style="width: 400px"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" style="width: 200px">
            <el-option label="草稿" value="draft" />
            <el-option label="录制中" value="recording" />
            <el-option label="剪辑中" value="editing" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">保存</el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getEpisode, updateEpisode } from '@/api/episode'

const router = useRouter()
const route = useRoute()
const episodeId = route.params.id

const loading = ref(false)
const formRef = ref(null)

const form = ref({
  number: 1,
  title: '',
  description: '',
  status: 'draft'
})

const rules = {
  number: [{ required: true, message: '请输入集号', trigger: 'blur' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }]
}

const loadEpisode = async () => {
  loading.value = true
  try {
    const data = await getEpisode(episodeId)
    form.value = {
      number: data.number,
      title: data.title,
      description: data.description || '',
      status: data.status
    }
  } catch (error) {
    ElMessage.error('加载分集信息失败')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await updateEpisode(episodeId, form.value)
      ElMessage.success('保存成功')
      goBack()
    } catch (error) {
      ElMessage.error(error.response?.data?.error || '保存失败')
    } finally {
      loading.value = false
    }
  })
}

const goBack = () => {
  router.push(`/episodes/${episodeId}`)
}

onMounted(() => {
  loadEpisode()
})
</script>

<style scoped>
.episode-edit-page {
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

.form-card {
  max-width: 600px;
}
</style>
