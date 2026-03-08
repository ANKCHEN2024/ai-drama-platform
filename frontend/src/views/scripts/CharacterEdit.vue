<template>
  <div class="character-edit-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="backToList" class="back-btn">
          <i class="el-icon-arrow-left"></i> 返回
        </el-button>
        <h1 class="page-title">{{ isEdit ? '编辑角色' : '新建角色' }}</h1>
      </div>
      <div class="header-right">
        <el-button @click="handleSave" :loading="saving">保存</el-button>
      </div>
    </div>

    <!-- 编辑区域 -->
    <div class="editor-wrapper">
      <el-row :gutter="20">
        <!-- 左侧：基本信息 -->
        <el-col :span="16">
          <el-card class="editor-card">
            <template #header>
              <div class="card-header">
                <span>基本信息</span>
              </div>
            </template>
            
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
              
              <el-form-item label="状态" prop="status">
                <el-radio-group v-model="form.status">
                  <el-radio label="active">启用</el-radio>
                  <el-radio label="inactive">停用</el-radio>
                </el-radio-group>
              </el-form-item>
              
              <el-form-item label="角色描述" prop="description">
                <el-input
                  v-model="form.description"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入角色描述，包括背景故事、性格特点等"
                />
              </el-form-item>
              
              <el-form-item label="外貌特征" prop="appearance">
                <el-input
                  v-model="form.appearance"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入角色外貌特征，如身高、体型、发型、面部特征等"
                />
              </el-form-item>
              
              <el-form-item label="性格特点" prop="personality">
                <el-input
                  v-model="personalityText"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入性格特点，多个特点用逗号分隔"
                />
                <div class="form-tip">提示：多个性格特点用逗号分隔，例如：开朗，幽默，善良，固执</div>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
        
        <!-- 右侧：关联剧本 -->
        <el-col :span="8">
          <el-card class="editor-card">
            <template #header>
              <div class="card-header">
                <span>关联剧本</span>
              </div>
            </template>
            
            <div v-if="isEdit" class="linked-scripts">
              <div v-if="linkedScripts.length === 0" class="empty-state">
                <el-empty description="该角色还未关联任何剧本" :image-size="80" />
              </div>
              <el-table v-else :data="linkedScripts" style="width: 100%" size="small">
                <el-table-column prop="id" label="ID" width="60" />
                <el-table-column prop="script.title" label="剧本" min-width="150">
                  <template #default="{ row }">
                    <el-link type="primary" @click="viewScript(row.script.id)">
                      {{ row.script.title }}
                    </el-link>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            
            <div v-else class="empty-state">
              <el-empty description="请先保存角色" :image-size="80" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '@/utils/api';

const route = useRoute();
const router = useRouter();

const projectId = ref(route.params.projectId);
const characterId = ref(route.params.id);
const isEdit = ref(!!characterId.value);

// 状态
const saving = ref(false);
const form = reactive({
  name: '',
  description: '',
  appearance: '',
  gender: '',
  ageRange: '',
  personality: null,
  status: 'active',
});
const linkedScripts = ref([]);

const personalityText = ref('');

const rules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
};

const formRef = ref(null);

// 生命周期
onMounted(() => {
  if (isEdit.value) {
    loadCharacter();
  }
});

// 方法
async function loadCharacter() {
  try {
    const res = await api.get(`/characters/${characterId.value}`);
    const character = res.data;
    form.name = character.name;
    form.description = character.description || '';
    form.appearance = character.appearance || '';
    form.gender = character.gender || '';
    form.ageRange = character.ageRange || '';
    form.personality = character.personality;
    form.status = character.status || 'active';
    
    // 解析性格特点
    if (character.personality && typeof character.personality === 'object') {
      personalityText.value = Object.values(character.personality).join(',');
    } else if (typeof character.personality === 'string') {
      personalityText.value = character.personality;
    } else {
      personalityText.value = '';
    }
    
    // 加载关联剧本
    await loadLinkedScripts();
  } catch (error) {
    ElMessage.error('加载角色详情失败：' + (error.response?.data?.message || error.message));
  }
}

async function loadLinkedScripts() {
  try {
    const res = await api.get(`/characters/${characterId.value}/scripts`);
    linkedScripts.value = res.data;
  } catch (error) {
    console.error('加载关联剧本失败:', error);
  }
}

function backToList() {
  router.push(`/projects/${projectId.value}/characters`);
}

async function handleSave() {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    
    saving.value = true;
    try {
      // 构建 personality 对象
      const personalityObj = {};
      if (personalityText.value) {
        const traits = personalityText.value.split(',').map(s => s.trim()).filter(s => s);
        traits.forEach((trait, index) => {
          personalityObj[`trait_${index + 1}`] = trait;
        });
      }
      
      const data = {
        ...form,
        personality: Object.keys(personalityObj).length > 0 ? personalityObj : null,
      };
      
      if (isEdit.value) {
        await api.put(`/characters/${characterId.value}`, data);
        ElMessage.success('更新角色成功');
      } else {
        const res = await api.post(`/characters/projects/${projectId.value}/characters`, data);
        ElMessage.success('创建角色成功');
        // 跳转到编辑页面
        router.push(`/projects/${projectId.value}/characters/${res.data.id}/edit`);
      }
    } catch (error) {
      ElMessage.error((isEdit.value ? '更新' : '创建') + '角色失败：' + 
        (error.response?.data?.message || error.message));
    } finally {
      saving.value = false;
    }
  });
}

function viewScript(scriptId) {
  router.push(`/projects/${projectId.value}/scripts/${scriptId}/edit`);
}
</script>

<style scoped lang="scss">
.character-edit-container {
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
      
      .back-btn {
        margin-right: 10px;
      }
      
      .page-title {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      }
    }
    
    .header-right {
      display: flex;
      gap: 10px;
    }
  }
  
  .editor-wrapper {
    .editor-card {
      .card-header {
        font-weight: 600;
        font-size: 16px;
      }
      
      .form-tip {
        font-size: 12px;
        color: #909399;
        margin-top: 5px;
      }
      
      .linked-scripts {
        .empty-state {
          padding: 40px 0;
        }
      }
    }
  }
}
</style>
