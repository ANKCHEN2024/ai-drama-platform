<template>
  <div class="verify-container">
    <div class="verify-card">
      <div class="verify-header">
        <h1>🎬 AI 短剧平台</h1>
        <p>邮箱验证</p>
      </div>

      <div class="verify-content">
        <!-- 加载中 -->
        <div v-if="loading" class="verify-loading">
          <el-icon class="is-loading" :size="48">
            <Loading />
          </el-icon>
          <p>正在验证您的邮箱...</p>
        </div>

        <!-- 验证成功 -->
        <div v-else-if="success" class="verify-success">
          <el-icon :size="64" color="#67C23A">
            <CircleCheckFilled />
          </el-icon>
          <h2>验证成功！</h2>
          <p>您的邮箱已验证，可以开始使用 AI 短剧平台了</p>
          <el-button type="primary" @click="goToHome">
            返回首页
          </el-button>
        </div>

        <!-- 验证失败 -->
        <div v-else-if="error" class="verify-error">
          <el-icon :size="64" color="#F56C6C">
            <CircleCloseFilled />
          </el-icon>
          <h2>验证失败</h2>
          <p>{{ errorMessage }}</p>
          <div class="verify-actions">
            <el-button @click="resendEmail">
              重新发送验证邮件
            </el-button>
            <el-button type="primary" @click="goToLogin">
              返回登录
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { verifyEmail, sendVerificationEmail } from '@/api/auth'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const success = ref(false)
const error = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  const token = route.query.token

  if (!token) {
    loading.value = false
    error.value = true
    errorMessage.value = '缺少验证令牌'
    return
  }

  try {
    const response = await verifyEmail({ token })

    if (response.code === 200) {
      success.value = true
      ElMessage.success('邮箱验证成功')
    } else {
      throw new Error(response.message || '验证失败')
    }
  } catch (err) {
    console.error('验证错误:', err)
    error.value = true
    errorMessage.value = err.message || '验证失败，令牌可能已过期'
  } finally {
    loading.value = false
  }
})

const goToHome = () => {
  router.push('/')
}

const goToLogin = () => {
  router.push('/login')
}

const resendEmail = async () => {
  try {
    const response = await sendVerificationEmail()
    
    if (response.code === 200) {
      ElMessage.success('验证邮件已重新发送，请检查邮箱')
    } else {
      ElMessage.error(response.message || '发送失败')
    }
  } catch (err) {
    console.error('发送验证邮件错误:', err)
    ElMessage.error('发送验证邮件失败，请稍后重试')
  }
}
</script>

<style scoped>
.verify-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.verify-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
  width: 100%;
  max-width: 440px;
  text-align: center;
}

.verify-header {
  margin-bottom: 30px;
}

.verify-header h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 10px;
}

.verify-header p {
  color: #666;
  font-size: 14px;
}

.verify-content {
  padding: 20px 0;
}

.verify-loading,
.verify-success,
.verify-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.verify-loading p,
.verify-success h2,
.verify-error h2 {
  font-size: 20px;
  color: #333;
  margin: 10px 0;
}

.verify-success p,
.verify-error p {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.verify-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
</style>
