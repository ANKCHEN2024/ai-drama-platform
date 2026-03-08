<template>
  <Layout>
    <div class="home">
      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
              <el-icon :size="32"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ projectStore.projectCount }}</div>
              <div class="stat-label">总项目数</div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
              <el-icon :size="32"><VideoCamera /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ totalVideosCount }}</div>
              <div class="stat-label">已生成剧集</div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
              <el-icon :size="32"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ inProgressCount }}</div>
              <div class="stat-label">进行中</div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
              <el-icon :size="32"><Check /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ successRate }}%</div>
              <div class="stat-label">成功率</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <!-- 快捷操作 -->
      <el-card class="quick-actions">
        <template #header>
          <div class="card-header">
            <span>快捷操作</span>
          </div>
        </template>
        <div class="actions-grid">
          <div class="action-item" @click="$router.push('/create')">
            <div class="action-icon">
              <el-icon :size="24"><Edit /></el-icon>
            </div>
            <div class="action-text">
              <div class="action-title">创作新剧</div>
              <div class="action-desc">上传小说开始创作</div>
            </div>
          </div>
          
          <div class="action-item" @click="$router.push('/projects')">
            <div class="action-icon">
              <el-icon :size="24"><FolderOpened /></el-icon>
            </div>
            <div class="action-text">
              <div class="action-title">项目管理</div>
              <div class="action-desc">查看和管理所有项目</div>
            </div>
          </div>
          
          <div class="action-item">
            <div class="action-icon">
              <el-icon :size="24"><DataAnalysis /></el-icon>
            </div>
            <div class="action-text">
              <div class="action-title">数据分析</div>
              <div class="action-desc">查看生成统计</div>
            </div>
          </div>
          
          <div class="action-item">
            <div class="action-icon">
              <el-icon :size="24"><Setting /></el-icon>
            </div>
            <div class="action-text">
              <div class="action-title">API 设置</div>
              <div class="action-desc">配置国产 AI 服务</div>
            </div>
          </div>
        </div>
      </el-card>
      
      <!-- 最近项目 -->
      <el-card class="recent-projects">
        <template #header>
          <div class="card-header flex-between">
            <span>最近项目</span>
            <el-button link type="primary" @click="$router.push('/projects')">查看全部</el-button>
          </div>
        </template>
        
        <el-table :data="recentProjects" style="width: 100%" v-loading="projectStore.loading">
          <el-table-column prop="name" label="项目名称" min-width="200" />
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="进度" width="150">
            <template #default="{ row }">
              <el-progress :percentage="getProjectProgress(row)" :status="row.status === 'completed' ? 'success' : ''" />
            </template>
          </el-table-column>
          <el-table-column label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.updatedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewProject(row)">查看</el-button>
              <el-button link type="primary" size="small" @click="previewProject(row)" :disabled="row.status !== 'completed'">预览</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useVideoStore } from '@/stores/video'
import Layout from '@/components/Layout.vue'

const router = useRouter()
const projectStore = useProjectStore()
const videoStore = useVideoStore()

const recentProjects = computed(() => {
  return projectStore.projects
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)
})

const totalVideosCount = computed(() => {
  let count = 0
  projectStore.projects.forEach(p => {
    if (p.status === 'completed') {
      count += (p.episodes || 0)
    }
  })
  return count
})

const inProgressCount = computed(() => {
  return projectStore.projects.filter(p => 
    p.status === 'analyzing' || p.status === 'generating'
  ).length
})

const successRate = computed(() => {
  const completed = projectStore.projects.filter(p => p.status === 'completed').length
  const total = projectStore.projects.length
  return total > 0 ? Math.round(completed / total * 100) : 0
})

onMounted(async () => {
  await projectStore.fetchProjects()
})

function getStatusType(status) {
  const map = {
    'completed': 'success',
    'generating': 'warning',
    'analyzing': 'warning',
    'character_building': 'primary',
    'scene_building': 'primary',
    'pending': 'info'
  }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = {
    'pending': '待开始',
    'analyzing': '分析中',
    'character_building': '人物构建',
    'scene_building': '场景构建',
    'generating': '生成中',
    'completed': '已完成',
    'failed': '失败'
  }
  return map[status] || status
}

function getProjectProgress(project) {
  const statusOrder = ['pending', 'analyzing', 'character_building', 'scene_building', 'generating', 'completed']
  const index = statusOrder.indexOf(project.status)
  return Math.round((index + 1) / statusOrder.length * 100)
}

function viewProject(project) {
  router.push(`/projects/${project.id}`)
}

function previewProject(project) {
  router.push(`/preview/${project.id}`)
}

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.home {
  max-width: 1440px;
  margin: 0 auto;
}

.stats-row {
  margin-bottom: $spacing-lg;
  
  .stat-card {
    display: flex;
    align-items: center;
    gap: $spacing-lg;
    cursor: pointer;
    transition: transform 0.3s ease;
    
    &:hover {
      transform: translateY(-4px);
    }
    
    .stat-icon {
      width: 64px;
      height: 64px;
      border-radius: $border-radius-lg;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      flex-shrink: 0;
    }
    
    .stat-info {
      flex: 1;
      
      .stat-value {
        font-size: 28px;
        font-weight: 700;
        color: #303133;
        line-height: 1;
        margin-bottom: 4px;
      }
      
      .stat-label {
        font-size: 14px;
        color: #909399;
      }
    }
  }
}

.quick-actions {
  margin-bottom: $spacing-lg;
  
  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: $spacing-md;
    
    .action-item {
      display: flex;
      align-items: center;
      gap: $spacing-md;
      padding: $spacing-md;
      border-radius: $border-radius-md;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background: #f5f7fa;
      }
      
      .action-icon {
        width: 48px;
        height: 48px;
        border-radius: $border-radius-md;
        background: $gradient-primary;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        flex-shrink: 0;
      }
      
      .action-text {
        flex: 1;
        
        .action-title {
          font-size: 16px;
          font-weight: 600;
          color: #303133;
          margin-bottom: 4px;
        }
        
        .action-desc {
          font-size: 13px;
          color: #909399;
        }
      }
    }
  }
}

.recent-projects {
  :deep(.el-table) {
    .el-button + .el-button {
      margin-left: 8px;
    }
  }
}

@media (max-width: $breakpoint-mobile) {
  .stats-row {
    .stat-card {
      margin-bottom: $spacing-md;
    }
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
