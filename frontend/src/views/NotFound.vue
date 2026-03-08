<template>
  <div class="not-found">
    <div class="content">
      <h1 class="error-code">404</h1>
      <h2 class="error-title">页面未找到</h2>
      <p class="error-message">抱歉，您访问的页面不存在或已被移除</p>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<style lang="scss" scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f0f1a;
  
  .content {
    text-align: center;
    
    .error-code {
      font-size: 120px;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
      line-height: 1;
    }
    
    .error-title {
      font-size: 32px;
      color: #fff;
      margin: 20px 0 10px;
    }
    
    .error-message {
      font-size: 16px;
      color: #909399;
      margin-bottom: 30px;
    }
  }
}
</style>
