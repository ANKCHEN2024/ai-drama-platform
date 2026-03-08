<template>
  <div class="reset-container">
    <div class="reset-card">
      <div class="reset-header">
        <h1>🔐 重置密码</h1>
        <p>设置您的新密码</p>
      </div>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-position="top"
        class="reset-form"
      >
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="formData.newPassword"
            type="password"
            placeholder="请输入新密码（至少 6 位）"
            prefix-icon="Lock"
            show-password
            size="large"
          />
        </el-form-item>

        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="formData.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            prefix-icon="Lock"
            show-password
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
            {{ loading ? '重置中...' : '重置密码' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="reset-footer">
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
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { resetPassword } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const formRef = ref(null)
const loading = ref(false)

const formData = reactive({
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== formData.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const formRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    const token = route.query.token
    if (!token) {
      ElMessage.error('缺少重置令牌')
      return
    }

    loading.value = true

    try {
      const response = await resetPassword({
        token,
        newPassword: formData.newPassword
      })

      if (response.code === 200) {
        ElMessage.success({
          message: '密码重置成功，请使用新密码登录',
          duration: 3000
        })

        setTimeout(() => {
          router.push('/login')
        }, 1000)
      } else {
        ElMessage.error(response.message || '重置失败')
      }
    } catch (error) {
      console.error('重置密码错误:', error)
      ElMessage.error(error.message || '重置失败，请稍后重试')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.reset-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  padding: 20px;
}

.reset-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
  width: 100%;
  max-width: 440px;
}

.reset-header {
  text-align: center;
  margin-bottom: 30px;
}

.reset-header h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 10px;
}

.reset-header p {
  color: #666;
  font-size: 14px;
}

.reset-form {
  margin-bottom: 20px;
}

.submit-button {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 600;
}

.reset-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.reset-footer p {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.reset-footer a {
  color: #f5576c;
  text-decoration: none;
  font-weight: 600;
}

.reset-footer a:hover {
  text-decoration: underline;
}
</style>
