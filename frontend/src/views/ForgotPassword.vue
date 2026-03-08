<template>
  <div class="forgot-container">
    <div class="forgot-card">
      <div class="forgot-header">
        <h1>🔐 忘记密码</h1>
        <p>输入您的邮箱，我们将发送重置链接</p>
      </div>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-position="top"
        class="forgot-form"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="formData.email"
            placeholder="请输入注册时使用的邮箱"
            prefix-icon="Message"
            size="large"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="submit-button"
            @click="handleSubmit"
          >
            {{ loading ? '发送中...' : '发送重置邮件' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="forgot-footer">
        <p>
          记得密码了？
          <router-link to="/login">立即登录</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { forgotPassword } from '@/api/auth'

const formRef = ref(null)
const loading = ref(false)
const submitted = ref(false)

const formData = reactive({
  email: ''
})

const formRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true

    try {
      const response = await forgotPassword({
        email: formData.email
      })

      if (response.code === 200) {
        submitted.value = true
        ElMessage.success({
          message: '如果该邮箱已注册，您将收到密码重置邮件',
          duration: 5000
        })
      } else {
        ElMessage.error(response.message || '发送失败')
      }
    } catch (error) {
      console.error('发送重置邮件错误:', error)
      ElMessage.error(error.message || '发送失败，请稍后重试')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.forgot-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  padding: 20px;
}

.forgot-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
  width: 100%;
  max-width: 440px;
}

.forgot-header {
  text-align: center;
  margin-bottom: 30px;
}

.forgot-header h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 10px;
}

.forgot-header p {
  color: #666;
  font-size: 14px;
}

.forgot-form {
  margin-bottom: 20px;
}

.submit-button {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 600;
}

.forgot-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.forgot-footer p {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.forgot-footer a {
  color: #f5576c;
  text-decoration: none;
  font-weight: 600;
}

.forgot-footer a:hover {
  text-decoration: underline;
}
</style>
