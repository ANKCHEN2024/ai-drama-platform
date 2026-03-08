<template>
  <div class="layout">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="logo">
        <el-icon :size="28"><VideoCamera /></el-icon>
        <span v-if="!sidebarCollapsed" class="logo-text">AI 短剧平台</span>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        background-color="transparent"
        :collapse="sidebarCollapsed"
        router
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <template #title>首页</template>
        </el-menu-item>
        
        <el-menu-item index="/create">
          <el-icon><Edit /></el-icon>
          <template #title>创作</template>
        </el-menu-item>
        
        <el-menu-item index="/projects">
          <el-icon><FolderOpened /></el-icon>
          <template #title>项目</template>
        </el-menu-item>
      </el-menu>
      
      <div class="sidebar-footer">
        <el-button link @click="toggleSidebar">
          <el-icon><Fold v-if="!sidebarCollapsed" /><Expand v-else /></el-icon>
        </el-button>
      </div>
    </aside>
    
    <!-- 主内容区 -->
    <main class="main-content">
      <header class="header">
        <div class="header-left">
          <h2 class="page-title">{{ pageTitle }}</h2>
        </div>
        <div class="header-right">
          <el-button :icon="Plus" type="primary" size="small" @click="$router.push('/create')">
            新建项目
          </el-button>
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="32" icon="UserFilled" />
              <span class="username">管理员</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人设置</el-dropdown-item>
                <el-dropdown-item divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      
      <div class="content">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'

const route = useRoute()
const sidebarCollapsed = ref(false)

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => route.meta.title || 'AI 短剧平台')

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.layout {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
}

.sidebar {
  width: 220px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  
  &.collapsed {
    width: 64px;
  }
  
  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border-bottom: 1px solid #e4e7ed;
    
    .logo-text {
      font-size: 18px;
      font-weight: 600;
      color: $primary-color;
      white-space: nowrap;
    }
  }
  
  :deep(.el-menu) {
    flex: 1;
    border-right: none;
    padding: $spacing-md 0;
    
    .el-menu-item {
      height: 50px;
      line-height: 50px;
      margin: 4px 8px;
      border-radius: $border-radius-md;
      
      &:hover {
        background: #f5f7fa;
      }
      
      &.is-active {
        background: $gradient-primary;
        color: #fff;
      }
    }
  }
  
  .sidebar-footer {
    padding: $spacing-md;
    border-top: 1px solid #e4e7ed;
    
    .el-button {
      width: 100%;
    }
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-lg;
  
  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      
      .username {
        font-size: 14px;
        color: #606266;
      }
    }
  }
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-lg;
}

@media (max-width: $breakpoint-mobile) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
    
    &.collapsed {
      transform: translateX(0);
    }
  }
  
  .header {
    padding: 0 $spacing-md;
    
    .page-title {
      font-size: 16px;
    }
  }
}
</style>
