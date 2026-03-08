<template>
  <div class="projects-page">
    <div class="page-header">
      <h1>项目管理</h1>
      <button @click="$router.push('/projects/new')" class="btn-primary">
        + 新建项目
      </button>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filters-bar">
      <div class="search-box">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="搜索项目名称或描述..."
          @input="debouncedSearch"
        />
      </div>

      <div class="filter-group">
        <select v-model="filters.status" @change="loadProjects">
          <option value="all">全部状态</option>
          <option value="draft">草稿</option>
          <option value="producing">制作中</option>
          <option value="completed">已完成</option>
        </select>

        <select v-model="filters.archived" @change="loadProjects">
          <option value="false">活跃项目</option>
          <option value="true">已归档</option>
          <option value="all">全部</option>
        </select>

        <select v-model="filters.sortBy" @change="loadProjects">
          <option value="createdAt">按创建时间</option>
          <option value="updatedAt">按更新时间</option>
          <option value="name">按名称</option>
          <option value="status">按状态</option>
        </select>

        <select v-model="filters.sortOrder" @change="loadProjects">
          <option value="desc">降序</option>
          <option value="asc">升序</option>
        </select>
      </div>

      <div class="view-toggle">
        <button
          :class="['view-btn', { active: viewMode === 'card' }]"
          @click="viewMode = 'card'"
        >
          卡片视图
        </button>
        <button
          :class="['view-btn', { active: viewMode === 'list' }]"
          @click="viewMode = 'list'"
        >
          列表视图
        </button>
      </div>
    </div>

    <!-- 项目列表 -->
    <div v-if="loading" class="loading-container">
      <div class="loading">加载中...</div>
    </div>

    <div v-else-if="projects.length === 0" class="empty-state">
      <div class="empty-icon">📁</div>
      <h3>暂无项目</h3>
      <p>点击"新建项目"创建你的第一个短剧项目</p>
      <button @click="$router.push('/projects/new')" class="btn-primary">
        新建项目
      </button>
    </div>

    <!-- 卡片视图 -->
    <div v-else-if="viewMode === 'card'" class="projects-grid">
      <div
        v-for="project in projects"
        :key="project.id"
        :class="['project-card', { archived: project.archivedAt }]"
      >
        <div class="card-header">
          <h3>{{ project.name }}</h3>
          <span :class="['status-badge', project.status]">
            {{ statusLabels[project.status] }}
          </span>
        </div>

        <p class="card-description">{{ project.description || '暂无描述' }}</p>

        <div class="card-stats">
          <div class="stat">
            <span class="stat-value">{{ project.statistics?.episodeCount || 0 }}</span>
            <span class="stat-label">剧集</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ project.statistics?.characterCount || 0 }}</span>
            <span class="stat-label">角色</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ project.statistics?.sceneCount || 0 }}</span>
            <span class="stat-label">场景</span>
          </div>
        </div>

        <div class="card-footer">
          <span class="update-time">
            {{ formatDate(project.updatedAt) }}
          </span>
          <div class="card-actions">
            <button @click="$router.push(`/projects/${project.id}`)" class="btn-sm">
              查看
            </button>
            <button
              v-if="!project.archivedAt"
              @click="confirmArchive(project)"
              class="btn-sm btn-warning"
            >
              归档
            </button>
            <button
              v-if="project.archivedAt"
              @click="confirmUnarchive(project)"
              class="btn-sm btn-success"
            >
              取消归档
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-else class="projects-table">
      <table>
        <thead>
          <tr>
            <th>项目名称</th>
            <th>状态</th>
            <th>剧集数</th>
            <th>角色数</th>
            <th>最后更新</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="project in projects" :key="project.id" :class="{ archived: project.archivedAt }">
            <td>
              <div class="project-name">
                {{ project.name }}
                <span v-if="project.archivedAt" class="archived-tag">已归档</span>
              </div>
            </td>
            <td>
              <span :class="['status-badge', project.status]">
                {{ statusLabels[project.status] }}
              </span>
            </td>
            <td>{{ project.statistics?.episodeCount || 0 }}</td>
            <td>{{ project.statistics?.characterCount || 0 }}</td>
            <td>{{ formatDate(project.updatedAt) }}</td>
            <td>
              <div class="table-actions">
                <button @click="$router.push(`/projects/${project.id}`)" class="btn-sm">
                  查看
                </button>
                <button
                  v-if="!project.archivedAt"
                  @click="$router.push(`/projects/${project.id}/edit`)"
                  class="btn-sm"
                >
                  编辑
                </button>
                <button
                  v-if="!project.archivedAt"
                  @click="confirmArchive(project)"
                  class="btn-sm btn-warning"
                >
                  归档
                </button>
                <button
                  v-if="project.archivedAt"
                  @click="confirmUnarchive(project)"
                  class="btn-sm btn-success"
                >
                  取消归档
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.totalPages > 1" class="pagination">
      <button
        :disabled="pagination.page === 1"
        @click="changePage(pagination.page - 1)"
        class="btn-page"
      >
        上一页
      </button>
      <span class="page-info">
        第 {{ pagination.page }} / {{ pagination.totalPages }} 页
        （共 {{ pagination.total }} 项）
      </span>
      <button
        :disabled="pagination.page === pagination.totalPages"
        @click="changePage(pagination.page + 1)"
        class="btn-page"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import api from '../utils/api';

export default {
  name: 'Projects',
  setup() {
    const loading = ref(true);
    const viewMode = ref('card'); // 'card' or 'list'
    const searchQuery = ref('');
    const searchTimeout = ref(null);

    const filters = reactive({
      status: 'all',
      archived: 'false',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    const projects = ref([]);
    const pagination = reactive({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    });

    const statusLabels = {
      draft: '草稿',
      producing: '制作中',
      completed: '已完成'
    };

    const loadProjects = async () => {
      loading.value = true;

      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          status: filters.status,
          archived: filters.archived,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder
        };

        if (searchQuery.value) {
          params.search = searchQuery.value;
        }

        const response = await api.get('/projects', { params });

        if (response.data.success) {
          projects.value = response.data.data.projects;
          pagination.page = response.data.data.pagination.page;
          pagination.limit = response.data.data.pagination.limit;
          pagination.total = response.data.data.pagination.total;
          pagination.totalPages = response.data.data.pagination.totalPages;
        }
      } catch (error) {
        console.error('加载项目列表失败:', error);
        alert('加载项目列表失败');
      } finally {
        loading.value = false;
      }
    };

    const debouncedSearch = () => {
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
      }

      searchTimeout.value = setTimeout(() => {
        pagination.page = 1;
        loadProjects();
      }, 300);
    };

    const changePage = (newPage) => {
      pagination.page = newPage;
      loadProjects();
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

    const confirmArchive = async (project) => {
      if (!confirm(`确定要归档项目"${project.name}"吗？归档后项目将变为只读状态。`)) {
        return;
      }

      try {
        const response = await api.post(`/projects/${project.id}/archive`);
        if (response.data.success) {
          alert('项目已归档');
          loadProjects();
        }
      } catch (error) {
        console.error('归档项目失败:', error);
        alert(error.response?.data?.error || '归档失败');
      }
    };

    const confirmUnarchive = async (project) => {
      if (!confirm(`确定要取消归档项目"${project.name}"吗？`)) {
        return;
      }

      try {
        const response = await api.post(`/projects/${project.id}/archive`, {
          unarchive: true
        });
        if (response.data.success) {
          alert('项目已取消归档');
          loadProjects();
        }
      } catch (error) {
        console.error('取消归档失败:', error);
        alert(error.response?.data?.error || '取消归档失败');
      }
    };

    onMounted(() => {
      loadProjects();
    });

    return {
      loading,
      viewMode,
      searchQuery,
      filters,
      projects,
      pagination,
      statusLabels,
      debouncedSearch,
      loadProjects,
      changePage,
      formatDate,
      confirmArchive,
      confirmUnarchive
    };
  }
};
</script>

<style scoped>
.projects-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 24px;
  color: #1a1a1a;
}

.filters-bar {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
}

.search-box {
  flex: 1;
  min-width: 250px;
}

.search-box input {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.filter-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-group select {
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.view-toggle {
  display: flex;
  gap: 5px;
}

.view-btn {
  padding: 10px 15px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.view-btn.active {
  background: #4a90e2;
  color: white;
  border-color: #4a90e2;
}

.loading-container {
  text-align: center;
  padding: 60px 20px;
}

.loading {
  color: #666;
  font-size: 16px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 20px;
  color: #333;
  margin-bottom: 10px;
}

.empty-state p {
  color: #666;
  margin-bottom: 20px;
}

/* 卡片视图 */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.project-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.project-card.archived {
  opacity: 0.7;
  background: #f9f9f9;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-header h3 {
  font-size: 18px;
  color: #1a1a1a;
  margin: 0;
  flex: 1;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 10px;
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

.card-description {
  color: #666;
  font-size: 14px;
  margin-bottom: 15px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.update-time {
  font-size: 12px;
  color: #999;
}

.card-actions {
  display: flex;
  gap: 8px;
}

/* 列表视图 */
.projects-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.projects-table table {
  width: 100%;
  border-collapse: collapse;
}

.projects-table th {
  background: #f9f9f9;
  padding: 15px;
  text-align: left;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.projects-table td {
  padding: 15px;
  border-top: 1px solid #f0f0f0;
  font-size: 14px;
}

.projects-table tr.archived {
  background: #f9f9f9;
  opacity: 0.7;
}

.project-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.archived-tag {
  background: #f0f0f0;
  color: #666;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.table-actions {
  display: flex;
  gap: 8px;
}

/* 按钮样式 */
.btn-primary {
  background: #4a90e2;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-primary:hover {
  background: #357abd;
}

.btn-sm {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sm:hover {
  background: #f5f5f5;
}

.btn-warning {
  color: #f39c12;
  border-color: #f39c12;
}

.btn-warning:hover {
  background: #fef9e7;
}

.btn-success {
  color: #27ae60;
  border-color: #27ae60;
}

.btn-success:hover {
  background: #e8f8f5;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 30px;
  padding: 20px;
}

.btn-page {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-page:not(:disabled):hover {
  background: #f5f5f5;
}

.page-info {
  color: #666;
  font-size: 14px;
}
</style>
