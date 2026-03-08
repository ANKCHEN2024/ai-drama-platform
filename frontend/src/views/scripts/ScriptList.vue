<template>
  <div class="scripts-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">剧本管理</h1>
        <el-button @click="backToProject" class="back-btn">
          <i class="el-icon-arrow-left"></i> 返回项目
        </el-button>
      </div>
      <div class="header-right">
        <el-input
          v-model="searchQuery"
          placeholder="搜索剧本..."
          prefix-icon="el-icon-search"
          class="search-input"
          clearable
          @clear="handleSearch"
        />
        <el-button type="primary" @click="handleCreate">
          <i class="el-icon-plus"></i> 新建剧本
        </el-button>
      </div>
    </div>

    <!-- 剧本列表 -->
    <el-card class="scripts-card" shadow="hover">
      <el-table
        :data="scripts"
        v-loading="loading"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="剧本标题" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="handleEdit(row.id)">{{ row.title }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="80" />
        <el-table-column label="角色数" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.characters?.length || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row.id)">
              编辑
            </el-button>
            <el-button type="success" size="small" @click="handleExport(row.id)">
              导出
            </el-button>
            <el-button type="warning" size="small" @click="handleVersions(row.id)">
              版本
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          background
          layout="total, prev, pager, next, jumper"
          :total="pagination.total"
          :page-size="pagination.pageSize"
          :current-page="pagination.page"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 新建/编辑剧本对话框 -->
    <el-dialog
      :title="dialogMode === 'create' ? '新建剧本' : '编辑剧本'"
      v-model="dialogVisible"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="剧本标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入剧本标题" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入剧本描述（可选）"
          />
        </el-form-item>
        <el-form-item label="剧本内容" prop="content">
          <div class="editor-toolbar">
            <el-button size="small" @click="insertFormat('scene')">场景</el-button>
            <el-button size="small" @click="insertFormat('dialogue')">对话</el-button>
            <el-button size="small" @click="insertFormat('action')">动作</el-button>
            <el-button size="small" @click="insertFormat('character')">角色</el-button>
          </div>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="15"
            placeholder="请输入剧本内容"
            class="content-editor"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 版本历史对话框 -->
    <el-dialog title="版本历史" v-model="versionsDialogVisible" width="900px">
      <el-table :data="versions" style="width: 100%">
        <el-table-column prop="version" label="版本号" width="100" />
        <el-table-column prop="changeLog" label="变更说明" min-width="200" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleViewVersion(row)">
              查看
            </el-button>
            <el-button type="success" size="small" @click="handleRestoreVersion(row)">
              恢复
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 查看版本对话框 -->
    <el-dialog title="查看版本" v-model="viewVersionDialogVisible" width="800px">
      <div class="version-content">
        <div class="version-info">
          <span>版本：v{{ currentVersion?.version }}</span>
          <span>变更：{{ currentVersion?.changeLog || '-' }}</span>
          <span>时间：{{ formatDate(currentVersion?.createdAt) }}</span>
        </div>
        <el-input
          v-model="currentVersionContent"
          type="textarea"
          :rows="20"
          readonly
          class="version-editor"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/utils/api';

const route = useRoute();
const router = useRouter();

const projectId = ref(route.params.projectId);

// 状态
const loading = ref(false);
const submitting = ref(false);
const scripts = ref([]);
const searchQuery = ref('');
const dialogVisible = ref(false);
const dialogMode = ref('create');
const versionsDialogVisible = ref(false);
const viewVersionDialogVisible = ref(false);
const versions = ref([]);
const currentVersion = ref(null);
const currentVersionContent = ref('');
const currentScriptId = ref(null);

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const form = reactive({
  title: '',
  description: '',
  content: '',
});

const rules = {
  title: [{ required: true, message: '请输入剧本标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入剧本内容', trigger: 'blur' }],
};

const formRef = ref(null);

// 生命周期
onMounted(() => {
  loadScripts();
});

// 方法
async function loadScripts() {
  loading.value = true;
  try {
    const res = await api.get(`/scripts/projects/${projectId.value}/scripts`, {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize,
      },
    });
    scripts.value = res.data.scripts;
    pagination.total = res.data.pagination.total;
  } catch (error) {
    ElMessage.error('加载剧本列表失败：' + (error.response?.data?.message || error.message));
  } finally {
    loading.value = false;
  }
}

function backToProject() {
  router.push(`/projects/${projectId.value}`);
}

function handleCreate() {
  dialogMode.value = 'create';
  form.title = '';
  form.description = '';
  form.content = '';
  dialogVisible.value = true;
}

async function handleEdit(id) {
  dialogMode.value = 'edit';
  currentScriptId.value = id;
  
  try {
    const res = await api.get(`/scripts/${id}`);
    const script = res.data;
    form.title = script.title;
    form.description = script.description || '';
    form.content = script.content;
    dialogVisible.value = true;
  } catch (error) {
    ElMessage.error('加载剧本详情失败：' + (error.response?.data?.message || error.message));
  }
}

async function handleSubmit() {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    
    submitting.value = true;
    try {
      if (dialogMode.value === 'create') {
        await api.post(`/scripts/projects/${projectId.value}/scripts`, form);
        ElMessage.success('创建剧本成功');
      } else {
        await api.put(`/scripts/${currentScriptId.value}`, form);
        ElMessage.success('更新剧本成功');
      }
      dialogVisible.value = false;
      loadScripts();
    } catch (error) {
      ElMessage.error((dialogMode.value === 'create' ? '创建' : '更新') + '剧本失败：' + 
        (error.response?.data?.message || error.message));
    } finally {
      submitting.value = false;
    }
  });
}

async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定要删除这个剧本吗？此操作不可恢复。', '确认删除', {
      type: 'warning',
    });
    
    await api.delete(`/scripts/${id}`);
    ElMessage.success('删除剧本成功');
    loadScripts();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除剧本失败：' + (error.response?.data?.message || error.message));
    }
  }
}

async function handleExport(id) {
  try {
    const res = await api.get(`/scripts/${id}/export`, {
      responseType: 'blob',
    });
    
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `剧本_${id}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    ElMessage.success('导出剧本成功');
  } catch (error) {
    ElMessage.error('导出剧本失败：' + (error.response?.data?.message || error.message));
  }
}

async function handleVersions(id) {
  currentScriptId.value = id;
  try {
    const res = await api.get(`/scripts/${id}/versions`);
    versions.value = res.data;
    versionsDialogVisible.value = true;
  } catch (error) {
    ElMessage.error('加载版本历史失败：' + (error.response?.data?.message || error.message));
  }
}

async function handleViewVersion(version) {
  currentVersion.value = version;
  currentVersionContent.value = version.content;
  viewVersionDialogVisible.value = true;
}

async function handleRestoreVersion(version) {
  try {
    await ElMessageBox.confirm(`确定要恢复到版本 ${version.version} 吗？`, '确认恢复', {
      type: 'warning',
    });
    
    await api.post(`/scripts/${currentScriptId.value}/versions`, {
      content: version.content,
      changeLog: `恢复到版本 ${version.version}`,
    });
    
    ElMessage.success('恢复版本成功');
    versionsDialogVisible.value = false;
    loadScripts();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('恢复版本失败：' + (error.response?.data?.message || error.message));
    }
  }
}

function handlePageChange(page) {
  pagination.page = page;
  loadScripts();
}

function handleSearch() {
  pagination.page = 1;
  loadScripts();
}

function insertFormat(type) {
  const formats = {
    scene: '\n【场景】\n',
    dialogue: '\n【对话】\n',
    action: '\n【动作】\n',
    character: '\n【角色】\n',
  };
  
  if (formRef.value && formRef.value.$el) {
    const textarea = formRef.value.$el.querySelector('.content-editor textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = form.content;
      const before = text.substring(0, start);
      const after = text.substring(end);
      form.content = before + formats[type] + after;
      
      // 恢复焦点
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + formats[type].length;
      }, 0);
    }
  }
}

function getStatusType(status) {
  const types = {
    draft: 'info',
    published: 'success',
    archived: 'warning',
  };
  return types[status] || 'info';
}

function getStatusText(status) {
  const texts = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
  };
  return texts[status] || status;
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
}
</script>

<style scoped lang="scss">
.scripts-container {
  padding: 20px;
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
      
      .page-title {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      }
      
      .back-btn {
        margin-left: 10px;
      }
    }
    
    .header-right {
      display: flex;
      gap: 10px;
      
      .search-input {
        width: 250px;
      }
    }
  }
  
  .scripts-card {
    .pagination-container {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }
  
  .editor-toolbar {
    margin-bottom: 10px;
    display: flex;
    gap: 8px;
  }
  
  .content-editor {
    :deep(textarea) {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
    }
  }
  
  .version-content {
    .version-info {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
      padding: 10px;
      background: #f5f7fa;
      border-radius: 4px;
      font-size: 14px;
      color: #606266;
    }
    
    .version-editor {
      :deep(textarea) {
        font-family: 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.6;
      }
    }
  }
}
</style>
