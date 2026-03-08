<template>
  <div class="profile">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span>个人中心</span>
        </div>
      </template>
      
      <div class="profile-content">
        <div class="profile-avatar">
          <el-avatar :size="100" :src="user.avatar || defaultAvatar">
            <img src="https://cube.elemecdn.com/e/fd/0fc7d20532fdaf769a25683617711png.png" />
          </el-avatar>
          <el-button type="primary" size="small" class="upload-btn">更换头像</el-button>
        </div>
        
        <el-form :model="form" label-width="100px" class="profile-form">
          <el-form-item label="用户名">
            <el-input v-model="form.username" disabled />
          </el-form-item>
          
          <el-form-item label="邮箱">
            <el-input v-model="form.email" disabled />
          </el-form-item>
          
          <el-form-item label="手机号">
            <el-input v-model="form.phone" placeholder="请输入手机号" />
          </el-form-item>
          
          <el-form-item label="公司名称">
            <el-input v-model="form.company" placeholder="请输入公司名称" />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="saveProfile">保存修改</el-button>
            <el-button @click="changePassword">修改密码</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
    
    <el-card class="stats-card">
      <template #header>
        <div class="card-header">
          <span>使用统计</span>
        </div>
      </template>
      
      <el-descriptions :column="2" border>
        <el-descriptions-item label="创建项目数">{{ stats.projectCount }}</el-descriptions-item>
        <el-descriptions-item label="生成视频数">{{ stats.videoCount }}</el-descriptions-item>
        <el-descriptions-item label="本月 API 调用">{{ stats.apiCalls }}</el-descriptions-item>
        <el-descriptions-item label="账户余额">¥{{ stats.balance }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const defaultAvatar = 'https://cube.elemecdn.com/e/fd/0fc7d20532fdaf769a25683617711png.png'

const form = ref({
  username: '',
  email: '',
  phone: '',
  company: ''
})

const stats = ref({
  projectCount: 0,
  videoCount: 0,
  apiCalls: 0,
  balance: 0
})

const user = ref({
  avatar: ''
})

onMounted(() => {
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    const userData = JSON.parse(storedUser)
    user.value = userData
    form.value.username = userData.username || userData.name
    form.value.email = userData.email
  }
  
  // 模拟统计数据
  stats.value = {
    projectCount: 12,
    videoCount: 45,
    apiCalls: 1280,
    balance: 500
  }
})

function saveProfile() {
  ElMessage.success('个人信息保存成功')
}

function changePassword() {
  ElMessage.info('修改密码功能开发中')
}
</script>

<style lang="scss" scoped>
.profile {
  max-width: 800px;
  margin: 0 auto;
  
  .profile-card {
    margin-bottom: 20px;
    
    .profile-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .profile-avatar {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 30px;
        
        .upload-btn {
          margin-top: 10px;
        }
      }
      
      .profile-form {
        width: 100%;
        max-width: 500px;
      }
    }
  }
  
  .stats-card {
    :deep(.el-descriptions__label) {
      width: 120px;
    }
  }
}
</style>
