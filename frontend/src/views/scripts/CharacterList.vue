<template>
  <div class="characters-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">角色管理</h1>
        <el-button @click="backToProject" class="back-btn">
          <i class="el-icon-arrow-left"></i> 返回项目
        </el-button>
      </div>
      <div class="header-right">
        <el-input
          v-model="searchQuery"
          placeholder="搜索角色..."
          prefix-icon="el-icon-search"
          class="search-input"
          clearable
          @clear="handleSearch"
        />
        <el-button type="primary" @click="handleCreate">
          <i class="el-icon-plus"></i> 新建角色
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="性别">
          <el-select v-model="filters.gender" placeholder="全部" clearable style="width: 120px">
            <el-option label="男" value="male" />
            <el-option label="女" value="female" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="年龄段">
          <el-select v-model="filters.ageRange" placeholder="全部" clearable style="width: 150px">
            <el-option label="儿童" value="child" />
            <el-option label="青少年" value="teen" />
            <el-option label="青年" value="young_adult" />
            <el-option label="成人" value="adult" />
            <el-option label="中年" value="middle_aged" />
            <el-option label="老年" value="senior" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 角色列表 -->
    <el-card class="characters-card" shadow="hover">
      <el-table
        :data="characters"
        v-loading="loading"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="角色名称" min-width="150">
          <template #default="{ row }">
            <el-link type="primary" @click="handleEdit(row.id)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="gender" label="性别" width="80">
          <template #default="{ row }">
            <span>{{ getGenderText(row.gender) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="ageRange" label="年龄段" width="100">
          <template #default="{ row }">
            <span>{{ getAgeRangeText(row.ageRange) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="剧本数" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.scripts?.length || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row.id)">
              编辑
            </el-button>
            <el-button type="success" size="small" @click="handleScripts(row.id)">
              剧本
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

    <!-- 新建/编辑角色对话框 -->
    <el-dialog
      :title="dialogMode === 'create' ? '新建角色' : '编辑角色'"
      v-model="dialogVisible"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入角色名称" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="form.gender">
            <el-radio label="male">男</el-radio>
            <el-radio label="female">女</el-radio>
            <el-radio label="other">其他</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="年龄段" prop="ageRange">
          <el-select v-model="form.ageRange" placeholder="请选择年龄段" style="width: 100%">
            <el-option label="儿童" value="child" />
            <el-option label="青少年" value="teen" />
            <el-option label="青年" value="young_adult" />
            <el-option label="成人" value="adult" />
            <el-option label="中年" value="middle_aged" />
            <el-option label="老年" value="senior" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述（可选）"
          />
        </el-form-item>
        <el-form-item label="外貌特征" prop="appearance">
          <el-input
            v-model="form.appearance"
            type="textarea"
            :rows="3"
            placeholder="请输入角色外貌特征（可选）"
          />
        </el-form-item>
        <el-form-item label="性格特点" prop="personality">
          <el-input
            v-model="personalityText"
            type="textarea"
            :rows="3"
            placeholder="请输入性格特点，多个特点用逗号分隔"
          />
          <div class="form-tip">提示：多个性格特点用英文逗号分隔，例如：开朗，幽默，善良</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 关联剧本对话框 -->
    <el-dialog title="关联剧本" v-model="scriptsDialogVisible" width="700px">
      <el-table :data="linkedScripts" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="剧本标题" min-width="200" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleViewScript(row.script.id)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/utils/api';

const route = useRoute();
const router = useRouter();

const projectId = ref(route.params.projectId);

// 状态
const loading = ref(false);
const submitting = ref(false);
const characters = ref([]);
const searchQuery = ref('');
const dialogVisible = ref(false);
const dialogMode = ref('create');
const scriptsDialogVisible = ref(false);
const linkedScripts = ref([]);
const currentCharacterId = ref(null);

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const filters = reactive({
  gender: '',
  ageRange: '',
  status: '',
});

const form = reactive({
  name: '',
  description: '',
  appearance: '',
  gender: '',
  ageRange: '',
  personality: null,
});

const personalityText = ref('');

const rules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
};

const formRef = ref(null);

// 计算属性
const personalityArray = computed(() => {
  if (!personalityText.value) return [];
  return personalityText.value.split(',').map(s => s.trim()).filter(s => s);
});

// 生命周期
onMounted(() => {
  loadCharacters();
});

// 方法
async function loadCharacters() {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters,
    };
    
    const res = await api.get(`/characters/projects/${projectId.value}/characters`, { params });
    characters.value = res.data.characters;
    pagination.total = res.data.pagination.total;
  } catch (error) {
    ElMessage.error('加载角色列表失败：' + (error.response?.data?.message || error.message));
  } finally {
    loading.value = false;
  }
}

function backToProject() {
  router.push(`/projects/${projectId.value}`);
}

function handleCreate() {
  dialogMode.value = 'create';
  form.name = '';
  form.description = '';
  form.appearance = '';
  form.gender = '';
  form.ageRange = '';
  form.personality = null;
  personalityText.value = '';
  dialogVisible.value = true;
}

async function handleEdit(id) {
  dialogMode.value = 'edit';
  currentCharacterId.value = id;
  
  try {
    const res = await api.get(`/characters/${id}`);
    const character = res.data;
    form.name = character.name;
    form.description = character.description || '';
    form.appearance = character.appearance || '';
    form.gender = character.gender || '';
    form.ageRange = character.ageRange || '';
    form.personality = character.personality;
    
    // 解析性格特点
    if (character.personality && typeof character.personality === 'object') {
      personalityText.value = Object.values(character.personality).join(',');
    } else if (typeof character.personality === 'string') {
      personalityText.value = character.personality;
    } else {
      personalityText.value = '';
    }
    
    dialogVisible.value = true;
  } catch (error) {
    ElMessage.error('加载角色详情失败：' + (error.response?.data?.message || error.message));
  }
}

async function handleSubmit() {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    
    submitting.value = true;
    try {
      // 构建 personality 对象
      const personalityObj = {};
      if (personalityText.value) {
        personalityArray.value.forEach((trait, index) => {
          personalityObj[`trait_${index + 1}`] = trait;
        });
      }
      
      const data = {
        ...form,
        personality: Object.keys(personalityObj).length > 0 ? personalityObj : null,
      };
      
      if (dialogMode.value === 'create') {
        await api.post(`/characters/projects/${projectId.value}/characters`, data);
        ElMessage.success('创建角色成功');
      } else {
        await api.put(`/characters/${currentCharacterId.value}`, data);
        ElMessage.success('更新角色成功');
      }
      dialogVisible.value = false;
      loadCharacters();
    } catch (error) {
      ElMessage.error((dialogMode.value === 'create' ? '创建' : '更新') + '角色失败：' + 
        (error.response?.data?.message || error.message));
    } finally {
      submitting.value = false;
    }
  });
}

async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定要删除这个角色吗？此操作不可恢复。', '确认删除', {
      type: 'warning',
    });
    
    await api.delete(`/characters/${id}`);
    ElMessage.success('删除角色成功');
    loadCharacters();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除角色失败：' + (error.response?.data?.message || error.message));
    }
  }
}

async function handleScripts(id) {
  currentCharacterId.value = id;
  try {
    const res = await api.get(`/characters/${id}/scripts`);
    linkedScripts.value = res.data;
    scriptsDialogVisible.value = true;
  } catch (error) {
    ElMessage.error('加载关联剧本失败：' + (error.response?.data?.message || error.message));
  }
}

function handleViewScript(scriptId) {
  router.push(`/projects/${projectId.value}/scripts/${scriptId}/edit`);
}

function handlePageChange(page) {
  pagination.page = page;
  loadCharacters();
}

function handleSearch() {
  pagination.page = 1;
  loadCharacters();
}

function handleFilter() {
  pagination.page = 1;
  loadCharacters();
}

function resetFilters() {
  filters.gender = '';
  filters.ageRange = '';
  filters.status = '';
  pagination.page = 1;
  loadCharacters();
}

function getGenderText(gender) {
  const texts = {
    male: '男',
    female: '女',
    other: '其他',
  };
  return texts[gender] || '-';
}

function getAgeRangeText(ageRange) {
  const texts = {
    child: '儿童',
    teen: '青少年',
    young_adult: '青年',
    adult: '成人',
    middle_aged: '中年',
    senior: '老年',
  };
  return texts[ageRange] || '-';
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
.characters-container {
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
  
  .filter-card {
    margin-bottom: 20px;
    
    .filter-form {
      .form-tip {
        font-size: 12px;
        color: #909399;
        margin-top: 5px;
      }
    }
  }
  
  .characters-card {
    .pagination-container {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }
}
</style>
