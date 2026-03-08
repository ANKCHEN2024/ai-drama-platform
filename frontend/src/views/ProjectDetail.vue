<template>
  <div class="project-detail-page">
    <div v-if="loading" class="loading-container">
      <div class="loading">加载中...</div>
    </div>

    <div v-else-if="project" class="content">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <button @click="$router.push('/projects')" class="btn-back">
            ← 返回
          </button>
          <div>
            <h1>{{ project.name }}</h1>
            <div class="header-meta">
              <span :class="['status-badge', project.status]">
                {{ statusLabels[project.status] }}
              </span>
              <span v-if="project.archivedAt" class="archived-badge">
                已归档
              </span>
              <span class="create-time">
                创建于 {{ formatDate(project.createdAt) }}
              </span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button
            v-if="!project.archivedAt"
            @click="$router.push(`/projects/${project.id}/edit`)"
            class="btn-secondary"
          >
            编辑
          </button>
          <button
            v-if="!project.archivedAt"
            @click="handleDuplicate"
            class="btn-secondary"
          >
            复制
          </button>
          <button
            v-if="!project.archivedAt"
            @click="handleArchive"
            class="btn-warning"
          >
            归档
          </button>
          <button
            v-if="project.archivedAt"
            @click="handleUnarchive"
            class="btn-success"
          >
            取消归档
          </button>
          <button @click="handleDelete" class="btn-danger">
            删除
          </button>
        </div>
      </div>

      <!-- 统计概览 -->
      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-icon">🎬</div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics?.episodes?.total || 0 }}</div>
            <div class="stat-label">剧集</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics?.characters?.total || 0 }}</div>
            <div class="stat-label">角色</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏛️</div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics?.scenes?.total || 0 }}</div>
            <div class="stat-label">场景</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics?.duration?.formatted || '0 秒' }}</div>
            <div class="stat-label">总时长</div>
          </div>
        </div>
      </div>

      <!-- 项目详情 -->
      <div class="detail-grid">
        <!-- 基本信息 -->
        <div class="detail-section">
          <h2>基本信息</h2>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">项目名称</span>
              <span class="info-value">{{ project.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">描述</span>
              <span class="info-value">{{ project.description || '暂无描述' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">状态</span>
              <span class="info-value">
                <span :class="['status-badge', project.status]">
                  {{ statusLabels[project.status] }}
                </span>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ formatDate(project.createdAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">更新时间</span>
              <span class="info-value">{{ formatDate(project.updatedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 剧集设置 -->
        <div class="detail-section">
          <h2>剧集设置</h2>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">计划集数</span>
              <span class="info-value">{{ project.episodeCount }} 集</span>
            </div>
            <div class="info-item">
              <span class="info-label">单集时长</span>
              <span class="info-value">{{ project.episodeDuration }} 秒</span>
            </div>
            <div class="info-item">
              <span class="info-label">画面比例</span>
              <span class="info-value">{{ project.videoRatio }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">视频质量</span>
              <span class="info-value">{{ project.videoQuality }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 详细统计 -->
      <div class="detail-section" v-if="statistics">
        <h2>详细统计</h2>
        <div class="stats-grid">
          <div class="stats-detail-card">
            <h3>剧集状态</h3>
            <div class="status-breakdown">
              <div
                v-for="(count, status) in statistics.episodes.byStatus"
                :key="status"
                class="status-item"
              >
                <span :class="['status-dot', status]"></span>
                <span>{{ statusLabels[status] || status }}</span>
                <span class="count">{{ count }}</span>
              </div>
            </div>
          </div>

          <div class="stats-detail-card">
            <h3>角色状态</h3>
            <div class="status-breakdown">
              <div
                v-for="(count, status) in statistics.characters.byStatus"
                :key="status"
                class="status-item"
              >
                <span :class="['status-dot', status]"></span>
                <span>{{ status }}</span>
                <span class="count">{{ count }}</span>
              </div>
            </div>
          </div>

          <div class="stats-detail-card">
            <h3>场景状态</h3>
            <div class="status-breakdown">
              <div
                v-for="(count, status) in statistics.scenes.byStatus"
                :key="status"
                class="status-item"
              >
                <span :class="['status-dot', status]"></span>
                <span>{{ status }}</span>
                <span class="count">{{ count }}</span>
              </div>
            </div>
          </div>

          <div class="stats-detail-card">
            <h3>制作进度</h3>
            <div class="progress-stats">
              <div class="progress-item">
                <span>分镜</span>
                <span class="value">{{ statistics.storyboards?.total || 0 }}</span>
              </div>
              <div class="progress-item">
                <span>视频片段</span>
                <span class="value">{{ statistics.videoClips?.total || 0 }}</span>
              </div>
              <div class="progress-item">
                <span>音频</span>
                <span class="value">{{ statistics.audios?.total || 0 }}</span>
              </div>
              <div class="progress-item">
                <span>最终视频</span>
                <span class="value">{{ statistics.videos?.total || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 剧集列表 -->
      <div class="detail-section" v-if="project.episodes && project.episodes.length > 0">
        <h2>剧集列表</h2>
        <div class="episodes-list">
          <div
            v-for="episode in project.episodes"
            :key="episode.id"
            class="episode-item"
          >
            <div class="episode-number">第 {{ episode.episodeNumber }} 集</div>
            <div class="episode-title">{{ episode.title || '无标题' }}</div>
            <div class="episode-meta">
              <span :class="['status-badge', episode.status]">
                {{ statusLabels[episode.status] }}
              </span>
              <span v-if="episode.duration" class="duration">
                {{ episode.duration }}秒
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="not-found">
      <h2>项目不存在</h2>
      <button @click="$router.push('/projects')" class="btn-primary">
        返回项目列表
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../utils/api';

export default {
  name: 'ProjectDetail',
  setup() {
    const router = useRouter();
    const route = useRoute();

    const loading = ref(true);
    const project = ref(null);
    const statistics = ref(null);

    const statusLabels = {
      draft: '草稿',
      producing: '制作中',
      completed: '已完成'
    };

    const loadProject = async () => {
      try {
        const response = await api.get(`/projects/${route.params.id}`);
        if (response.data.success) {
          project.value = response.data.data;
          loadStatistics();
        }
      } catch (error) {
        console.error('加载项目失败:', error);
        project.value = null;
      } finally {
        loading.value = false;
      }
    };

    const loadStatistics = async () => {
      try {
        const response = await api.get(`/projects/${route.params.id}/statistics`);
        if (response.data.success) {
          statistics.value = response.data.data;
        }
      } catch (error) {
        console.error('加载统计失败:', error);
      }
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const handleArchive = async () => {
      if (!confirm('确定要归档此项目吗？归档后项目将变为只读状态。')) {
        return;
      }

      try {
        const response = await api.post(`/projects/${project.value.id}/archive`);
        if (response.data.success) {
          alert('项目已归档');
          loadProject();
        }
      } catch (error) {
        console.error('归档失败:', error);
        alert(error.response?.data?.error || '归档失败');
      }
    };

    const handleUnarchive = async () => {
      if (!confirm('确定要取消归档此项目吗？')) {
        return;
      }

      try {
        const response = await api.post(`/projects/${project.value.id}/archive`, {
          unarchive: true
        });
        if (response.data.success) {
          alert('项目已取消归档');
          loadProject();
        }
      } catch (error) {
        console.error('取消归档失败:', error);
        alert(error.response?.data?.error || '取消归档失败');
      }
    };

    const handleDuplicate = async () => {
      if (!confirm('确定要复制此项目吗？将创建一个包含相同设置的副本。')) {
        return;
      }

      try {
        const response = await api.post(`/projects/${project.value.id}/duplicate`);
        if (response.data.success) {
          alert('项目已复制');
          router.push(`/projects/${response.data.data.id}`);
        }
      } catch (error) {
        console.error('复制失败:', error);
        alert(error.response?.data?.error || '复制失败');
      }
    };

    const handleDelete = async () => {
      if (!confirm('确定要删除此项目吗？此操作不可恢复，所有关联数据（剧集、角色、场景等）都将被删除。')) {
        return;
      }

      try {
        const response = await api.delete(`/projects/${project.value.id}`);
        if (response.data.success) {
          alert('项目已删除');
          router.push('/projects');
        }
      } catch (error) {
        console.error('删除失败:', error);
        alert(error.response?.data?.error || '删除失败');
      }
    };

    onMounted(() => {
      loadProject();
    });

    return {
      loading,
      project,
      statistics,
      statusLabels,
      formatDate,
      handleArchive,
      handleUnarchive,
      handleDuplicate,
      handleDelete
    };
  }
};
</script>

<style scoped>
.project-detail-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.loading-container {
  text-align: center;
  padding: 60px 20px;
}

.loading {
  color: #666;
  font-size: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.header-left {
  display: flex;
  gap: 15px;
  align-items: flex-start;
}

.btn-back {
  background: none;
  border: none;
  color: #666;
  font-size: 16px;
  cursor: pointer;
  padding: 5px 10px;
}

.btn-back:hover {
  color: #333;
}

.header-left h1 {
  font-size: 28px;
  color: #1a1a1a;
  margin: 0 0 10px 0;
}

.header-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.create-time {
  font-size: 13px;
  color: #999;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* 统计概览 */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 36px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

/* 详情网格 */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.detail-section {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.detail-section h2 {
  font-size: 18px;
  color: #1a1a1a;
  margin: 0 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f0f0;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 14px;
  color: #666;
}

.info-value {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 500;
}

/* 详细统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.stats-detail-card {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
}

.stats-detail-card h3 {
  font-size: 14px;
  color: #666;
  margin: 0 0 15px 0;
}

.status-breakdown {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-dot.draft {
  background: #999;
}

.status-dot.producing {
  background: #1976d2;
}

.status-dot.completed {
  background: #388e3c;
}

.status-item .count {
  margin-left: auto;
  font-weight: 600;
  color: #1a1a1a;
}

.progress-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.progress-item .value {
  font-weight: 600;
  color: #1a1a1a;
}

/* 剧集列表 */
.episodes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.episode-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
}

.episode-number {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.episode-title {
  flex: 1;
  font-size: 14px;
  color: #1a1a1a;
}

.episode-meta {
  display: flex;
  gap: 10px;
  align-items: center;
}

.duration {
  font-size: 13px;
  color: #999;
}

/* 按钮样式 */
.btn-secondary,
.btn-warning,
.btn-success,
.btn-danger,
.btn-primary {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: white;
  color: #666;
  border: 1px solid #ddd;
}

.btn-secondary:hover {
  background: #f5f5f5;
}

.btn-warning {
  background: #f39c12;
  color: white;
}

.btn-warning:hover {
  background: #e67e22;
}

.btn-success {
  background: #27ae60;
  color: white;
}

.btn-success:hover {
  background: #229954;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.btn-primary {
  background: #4a90e2;
  color: white;
}

.btn-primary:hover {
  background: #357abd;
}

/* 状态徽章 */
.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.draft {
  background: #f0f0f0;
  color: #666;
}

.status-badge.producing {
  background: #e3f2fd;
  color: #1976d2;
}

.status-badge.completed {
  background: #e8f5e9;
  color: #388e3c;
}

.archived-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  background: #f0f0f0;
  color: #666;
}

.not-found {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
}

.not-found h2 {
  color: #666;
  margin-bottom: 20px;
}
</style>
