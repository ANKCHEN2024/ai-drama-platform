<template>
  <div class="script-edit-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="backToList" class="back-btn">
          <i class="el-icon-arrow-left"></i> 返回
        </el-button>
        <h1 class="page-title">{{ isEdit ? '编辑剧本' : '新建剧本' }}</h1>
      </div>
      <div class="header-right">
        <el-button @click="handleSaveDraft" :loading="saving">保存草稿</el-button>
        <el-button type="primary" @click="handlePublish" :loading="publishing">发布</el-button>
        <el-button type="success" @click="handleExport">导出</el-button>
      </div>
    </div>

    <!-- 编辑区域 -->
    <div class="editor-wrapper">
      <el-card class="editor-card">
        <!-- 基本信息 -->
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="剧本标题" prop="title">
            <el-input v-model="form.title" placeholder="请输入剧本标题" maxlength="200" show-word-limit />
          </el-form-item>
          <el-form-item label="剧本描述" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="2"
              placeholder="请输入剧本描述（可选）"
            />
          </el-form-item>
        </el-form>

        <!-- 富文本编辑器 -->
        <div class="editor-section">
          <div class="section-header">
            <h3>剧本内容</h3>
            <div class="format-tools">
              <el-button size="small" @click="insertFormat('scene')">
                <i class="el-icon-location"></i> 场景
              </el-button>
              <el-button size="small" @click="insertFormat('character')">
                <i class="el-icon-user"></i> 角色
              </el-button>
              <el-button size="small" @click="insertFormat('dialogue')">
                <i class="el-icon-chat-dot-round"></i> 对话
              </el-button>
              <el-button size="small" @click="insertFormat('action')">
                <i class="el-icon-video-play"></i> 动作
              </el-button>
              <el-button size="small" @click="insertFormat('transition')">
                <i class="el-icon-refresh-right"></i> 转场
              </el-button>
            </div>
          </div>
          
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="25"
            placeholder="请输入剧本内容..."
            class="content-editor"
            ref="contentEditor"
          />
        </div>

        <!-- 关联角色 -->
        <div class="characters-section">
          <div class="section-header">
            <h3>关联角色</h3>
            <el-button type="primary" size="small" @click="showCharacterSelector">
              <i class="el-icon-plus"></i> 添加角色
            </el-button>
          </div>
          
          <el-table :data="linkedCharacters" style="width: 100%" border>
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="角色名称" min-width="150" />
            <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="danger" size="small" @click="removeCharacter(row.character.id)">
                  移除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>
    </div>

    <!-- 角色选择器对话框 -->
    <el-dialog title="选择角色" v-model="characterSelectorVisible" width="700px">
      <el-table :data="availableCharacters" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="角色名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="characterSelectorVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddCharacters">确定</el-button>
      </template>
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
const scriptId = ref(route.params.id);
const isEdit = ref(!!scriptId.value);

// 状态
const saving = ref(false);
const publishing = ref(false);
const form = reactive({
  title: '',
  description: '',
  content: '',
});
const linkedCharacters = ref([]);
const availableCharacters = ref([]);
const selectedCharacters = ref([]);
const characterSelectorVisible = ref(false);

const rules = {
  title: [{ required: true, message: '请输入剧本标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入剧本内容', trigger: 'blur' }],
};

const formRef = ref(null);
const contentEditor = ref(null);

// 生命周期
onMounted(() => {
  if (isEdit.value) {
    loadScript();
  }
  loadAvailableCharacters();
});

// 方法
async function loadScript() {
  try {
    const res = await api.get(`/scripts/${scriptId.value}`);
    const script = res.data;
    form.title = script.title;
    form.description = script.description || '';
    form.content = script.content;
    
    // 加载关联角色
    if (script.characters && script.characters.length > 0) {
      linkedCharacters.value = script.characters;
    }
  } catch (error) {
    ElMessage.error('加载剧本失败：' + (error.response?.data?.message || error.message));
  }
}

async function loadAvailableCharacters() {
  try {
    const res = await api.get(`/characters/projects/${projectId.value}/characters`, {
      params: { pageSize: 100 },
    });
    availableCharacters.value = res.data.characters;
  } catch (error) {
    console.error('加载角色列表失败:', error);
  }
}

function backToList() {
  router.push(`/projects/${projectId.value}/scripts`);
}

async function handleSaveDraft() {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    
    saving.value = true;
    try {
      if (isEdit.value) {
        await api.put(`/scripts/${scriptId.value}`, {
          ...form,
          status: 'draft',
        });
        ElMessage.success('保存草稿成功');
      } else {
        const res = await api.post(`/scripts/projects/${projectId.value}/scripts`, {
          ...form,
          status: 'draft',
        });
        ElMessage.success('创建剧本成功');
        // 跳转到编辑页面
        router.push(`/projects/${projectId.value}/scripts/${res.data.id}/edit`);
      }
    } catch (error) {
      ElMessage.error('保存失败：' + (error.response?.data?.message || error.message));
    } finally {
      saving.value = false;
    }
  });
}

async function handlePublish() {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    
    publishing.value = true;
    try {
      if (isEdit.value) {
        await api.put(`/scripts/${scriptId.value}`, {
          ...form,
          status: 'published',
        });
        ElMessage.success('发布剧本成功');
      } else {
        const res = await api.post(`/scripts/projects/${projectId.value}/scripts`, {
          ...form,
          status: 'published',
        });
        ElMessage.success('创建并发布剧本成功');
        router.push(`/projects/${projectId.value}/scripts/${res.data.id}/edit`);
      }
    } catch (error) {
      ElMessage.error('发布失败：' + (error.response?.data?.message || error.message));
    } finally {
      publishing.value = false;
    }
  });
}

async function handleExport() {
  if (!scriptId.value) {
    ElMessage.warning('请先保存剧本');
    return;
  }
  
  try {
    const res = await api.get(`/scripts/${scriptId.value}/export`);
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${form.title || '剧本'}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    ElMessage.success('导出剧本成功');
  } catch (error) {
    ElMessage.error('导出失败：' + (error.response?.data?.message || error.message));
  }
}

function insertFormat(type) {
  const formats = {
    scene: '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n【场景】\n时间：\n地点：\n人物：\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n',
    character: '\n【角色】角色名称\n',
    dialogue: '\n【对话】\n角色：台词内容\n',
    action: '\n【动作】动作描述\n',
    transition: '\n✂ ✂ ✂ 转场 ✂ ✂ ✂\n',
  };
  
  const editor = contentEditor.value;
  if (editor && editor.$el) {
    const textarea = editor.$el.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = form.content;
      const before = text.substring(0, start);
      const after = text.substring(end);
      form.content = before + formats[type] + after;
      
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + formats[type].length;
      }, 0);
    }
  }
}

function showCharacterSelector() {
  characterSelectorVisible.value = true;
  selectedCharacters.value = [];
}

function handleSelectionChange(selection) {
  selectedCharacters.value = selection;
}

async function confirmAddCharacters() {
  if (selectedCharacters.value.length === 0) {
    ElMessage.warning('请选择要添加的角色');
    return;
  }
  
  try {
    for (const char of selectedCharacters.value) {
      await api.post(`/scripts/${scriptId.value}/characters`, {
        characterId: char.id.toString(),
      });
    }
    
    ElMessage.success(`成功添加 ${selectedCharacters.value.length} 个角色`);
    characterSelectorVisible.value = false;
    loadScript();
  } catch (error) {
    ElMessage.error('添加角色失败：' + (error.response?.data?.message || error.message));
  }
}

async function removeCharacter(characterId) {
  try {
    await ElMessageBox.confirm('确定要移除这个角色吗？', '确认移除', {
      type: 'warning',
    });
    
    await api.delete(`/scripts/${scriptId.value}/characters/${characterId}`);
    ElMessage.success('移除角色成功');
    loadScript();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('移除角色失败：' + (error.response?.data?.message || error.message));
    }
  }
}
</script>

<style scoped lang="scss">
.script-edit-container {
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
      .editor-section {
        margin: 30px 0;
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          
          h3 {
            margin: 0;
            font-size: 18px;
            color: #303133;
          }
          
          .format-tools {
            display: flex;
            gap: 8px;
          }
        }
        
        .content-editor {
          :deep(textarea) {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.8;
            min-height: 500px;
          }
        }
      }
      
      .characters-section {
        margin-top: 30px;
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          
          h3 {
            margin: 0;
            font-size: 18px;
            color: #303133;
          }
        }
      }
    }
  }
}
</style>
