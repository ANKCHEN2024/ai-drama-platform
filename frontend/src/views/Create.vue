<template>
  <Layout>
    <div class="create-page">
      <el-steps :active="currentStep" finish-status="success" align-center class="steps">
        <el-step title="上传小说" description="支持 TXT、DOCX 格式" />
        <el-step title="故事分析" description="AI 自动分析剧情" />
        <el-step title="人物设定" description="提取并完善人物" />
        <el-step title="分镜生成" description="AI 生成分镜脚本" />
        <el-step title="确认创建" description="开始生成短剧" />
      </el-steps>
      
      <el-card class="step-content">
        <!-- 步骤 1: 上传小说 -->
        <div v-if="currentStep === 0" class="step-panel">
          <h3 class="panel-title">{{ isEditMode ? '编辑项目' : '上传小说文件' }}</h3>
          
          <div class="form-section">
            <div class="section-title">项目名称</div>
            <el-input
              v-model="projectName"
              placeholder="请输入项目名称"
              class="project-name-input"
            />
          </div>
          
          <el-upload
            v-if="!isEditMode"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :limit="1"
            accept=".txt,.docx"
            class="upload-area"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              拖拽文件到此处或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 TXT、DOCX 格式，建议 10-50 万字
              </div>
            </template>
          </el-upload>
          
          <el-divider />
          
          <div class="form-section">
            <div class="section-title">{{ isEditMode ? '小说内容' : '或直接粘贴文本' }}</div>
            <el-input
              v-model="novelText"
              type="textarea"
              :rows="10"
              placeholder="请粘贴小说内容..."
              class="novel-input"
            />
          </div>
          
          <div class="panel-footer">
            <el-button type="primary" size="large" :disabled="!canNext" @click="nextStep">
              {{ isEditMode ? '保存项目' : '下一步：故事分析' }}
            </el-button>
          </div>
        </div>
        
        <!-- 步骤 2: 故事分析 -->
        <div v-if="currentStep === 1" class="step-panel">
          <h3 class="panel-title">AI 故事分析</h3>
          
          <div v-if="storyStore.analyzing" class="analyzing">
            <el-icon class="is-loading" :size="48"><Loading /></el-icon>
            <p>AI 正在分析小说内容，请稍候...</p>
          </div>
          
          <div v-else-if="storyStore.analysisResult" class="analysis-result">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-card>
                  <template #header>基本信息</template>
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="题材">{{ storyStore.analysisResult.genre }}</el-descriptions-item>
                    <el-descriptions-item label="基调">{{ storyStore.analysisResult.tone }}</el-descriptions-item>
                    <el-descriptions-item label="预计集数">{{ storyStore.analysisResult.episodes }}集</el-descriptions-item>
                    <el-descriptions-item label="单集时长">{{ storyStore.analysisResult.duration }}分钟</el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </el-col>
              
              <el-col :span="12">
                <el-card>
                  <template #header>剧情摘要</template>
                  <p class="summary">{{ storyStore.analysisResult.summary }}</p>
                </el-card>
              </el-col>
            </el-row>
            
            <el-card class="episodes-preview">
              <template #header>分集预览</template>
              <el-timeline>
                <el-timeline-item
                  v-for="(episode, index) in storyStore.analysisResult.episodeList"
                  :key="index"
                  :timestamp="`第${index + 1}集`"
                  placement="top"
                >
                  <p>{{ episode }}</p>
                </el-timeline-item>
              </el-timeline>
            </el-card>
          </div>
          
          <div class="panel-footer">
            <el-button @click="prevStep">上一步</el-button>
            <el-button type="primary" :disabled="!storyStore.analysisResult" @click="nextStep">
              下一步：人物设定
            </el-button>
          </div>
        </div>
        
        <!-- 步骤 3: 人物设定 -->
        <div v-if="currentStep === 2" class="step-panel">
          <h3 class="panel-title">人物设定</h3>
          
          <div v-if="characters.length === 0" class="empty-characters">
            <el-empty description="暂无人物数据" />
            <el-button type="primary" @click="extractCharacters">AI 提取人物</el-button>
          </div>
          
          <div v-else class="characters-grid">
            <el-card v-for="char in characters" :key="char.id" class="character-card">
              <div class="character-header">
                <el-avatar :size="64" :src="char.avatar" />
                <div class="character-info">
                  <h4>{{ char.name }}</h4>
                  <el-tag :type="char.gender === '男' ? 'primary' : 'danger'">{{ char.gender }}</el-tag>
                  <span class="character-role">{{ char.role }}</span>
                </div>
              </div>
              <el-divider />
              <div class="character-desc">{{ char.description }}</div>
              <el-button link type="primary" class="edit-btn" @click="editCharacter(char)">
                编辑设定
              </el-button>
            </el-card>
            
            <el-card class="add-character" @click="addCharacter">
              <el-icon :size="32"><Plus /></el-icon>
              <span>添加人物</span>
            </el-card>
          </div>
          
          <div class="panel-footer">
            <el-button @click="prevStep">上一步</el-button>
            <el-button type="primary" :disabled="characters.length === 0" @click="nextStep">
              下一步：分镜生成
            </el-button>
          </div>
        </div>
        
        <!-- 步骤 4: 分镜生成 -->
        <div v-if="currentStep === 3" class="step-panel">
          <h3 class="panel-title">分镜生成</h3>
          
          <div class="episode-selector">
            <el-select v-model="selectedEpisode" placeholder="选择集数" style="width: 200px">
              <el-option
                v-for="ep in storyStore.episodes"
                :key="ep.id"
                :label="`第${ep.number}集：${ep.title}`"
                :value="ep.id"
              />
            </el-select>
            <el-button type="primary" :loading="storyStore.generating" @click="generateStoryboard">
              生成分镜
            </el-button>
          </div>
          
          <div v-if="storyboards.length > 0" class="storyboard-list">
            <el-card v-for="board in storyboards" :key="board.id" class="storyboard-card">
              <div class="storyboard-header">
                <span class="scene-number">场景 {{ board.sceneNumber }}</span>
                <el-tag>{{ board.type }}</el-tag>
              </div>
              <div class="storyboard-content">
                <div class="scene-desc">{{ board.description }}</div>
                <div class="scene-props">
                  <strong>道具：</strong>{{ board.props }}
                </div>
                <div class="scene-dialog">
                  <strong>对白：</strong>{{ board.dialogue }}
                </div>
              </div>
            </el-card>
          </div>
          
          <div class="panel-footer">
            <el-button @click="prevStep">上一步</el-button>
            <el-button type="primary" @click="nextStep">
              下一步：确认创建
            </el-button>
          </div>
        </div>
        
        <!-- 步骤 5: 确认创建 -->
        <div v-if="currentStep === 4" class="step-panel">
          <h3 class="panel-title">{{ isEditMode ? '确认更新' : '确认创建' }}</h3>
          
          <el-card class="confirm-card">
            <template #header>项目信息</template>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="项目名称">{{ projectName }}</el-descriptions-item>
              <el-descriptions-item label="集数">{{ storyStore.episodes?.length || 0 }}集</el-descriptions-item>
              <el-descriptions-item label="人物数量">{{ characters.length }}个</el-descriptions-item>
              <el-descriptions-item label="预计生成时间" v-if="!isEditMode">约 30 分钟</el-descriptions-item>
            </el-descriptions>
          </el-card>
          
          <el-alert
            v-if="!isEditMode"
            title="生成说明"
            type="info"
            :closable="false"
            class="generate-tips"
          >
            <ul>
              <li>将使用阿里通义千问进行故事分析</li>
              <li>将使用阿里通义万相生成人物场景</li>
              <li>将使用快手可灵 AI 生成视频</li>
              <li>将使用阿里云智能语音进行配音</li>
              <li>生成过程可随时在项目管理中查看进度</li>
            </ul>
          </el-alert>
          
          <div class="panel-footer">
            <el-button @click="prevStep">上一步</el-button>
            <el-button type="primary" size="large" :loading="creating" @click="saveProject">
              {{ isEditMode ? '保存项目' : '开始生成' }}
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useProjectStore } from '@/stores/project'
import { useStoryStore } from '@/stores/story'
import Layout from '@/components/Layout.vue'

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()
const storyStore = useStoryStore()

const currentStep = ref(0)
const novelText = ref('')
const uploadedFile = ref(null)
const projectName = ref('')
const selectedEpisode = ref('')
const creating = ref(false)
const editingProjectId = ref(null)

const characters = ref([
  { id: 1, name: '林逸', gender: '男', role: '男主角', avatar: '', description: '年轻有为的集团总裁，外表冷漠内心温暖' },
  { id: 2, name: '苏晴', gender: '女', role: '女主角', avatar: '', description: '乐观开朗的普通女孩，善良坚韧' }
])

const storyboards = ref([])

const canNext = computed(() => {
  if (currentStep.value === 0) {
    return novelText.value.length > 100 || uploadedFile.value
  }
  return true
})

const isEditMode = computed(() => !!editingProjectId.value)

onMounted(async () => {
  const editId = route.query.edit
  if (editId) {
    editingProjectId.value = editId
    await loadProjectData(editId)
  }
})

async function loadProjectData(id) {
  try {
    const project = await projectStore.fetchProjectDetail(id)
    projectName.value = project.name
    novelText.value = project.novelText || ''
  } catch (error) {
    ElMessage.error('加载项目数据失败')
  }
}

function handleFileChange(file) {
  uploadedFile.value = file.raw
  if (!projectName.value) {
    projectName.value = file.name.replace(/\.[^/.]+$/, '')
  }
}

async function nextStep() {
  if (currentStep.value === 0) {
    // 开始分析故事
    await storyStore.analyzeNovel(novelText.value)
  } else if (currentStep.value === 1) {
    // 获取分集
    await storyStore.fetchEpisodes(1)
  }
  
  if (currentStep.value < 4) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

async function extractCharacters() {
  await storyStore.fetchCharacters(1)
  characters.value = storyStore.characters
}

function editCharacter(char) {
  // TODO: 打开编辑对话框
  console.log('编辑人物:', char)
}

function addCharacter() {
  // TODO: 打开添加对话框
  console.log('添加人物')
}

async function generateStoryboard() {
  if (!selectedEpisode.value) {
    ElMessage.warning('请选择集数')
    return
  }
  await storyStore.createStoryboard(1, selectedEpisode.value)
  await storyStore.fetchStoryboards(1, selectedEpisode.value)
  storyboards.value = storyStore.storyboards
}

async function saveProject() {
  creating.value = true
  try {
    let project
    if (isEditMode.value) {
      project = await projectStore.updateProjectData(editingProjectId.value, {
        name: projectName.value || '新项目',
        novelText: novelText.value
      })
      ElMessage.success('项目更新成功！')
    } else {
      project = await projectStore.createNewProject({
        name: projectName.value || '新项目',
        novelText: novelText.value,
        file: uploadedFile.value
      })
      ElMessage.success('项目创建成功！')
    }
    router.push(`/projects/${project.id}`)
  } catch (error) {
    ElMessage.error(isEditMode.value ? '更新失败，请重试' : '创建失败，请重试')
  } finally {
    creating.value = false
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.create-page {
  max-width: 1200px;
  margin: 0 auto;
}

.steps {
  margin-bottom: $spacing-lg;
  background: #fff;
  padding: $spacing-lg;
  border-radius: $border-radius-lg;
}

.step-content {
  .step-panel {
    min-height: 400px;
    
    .panel-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: $spacing-lg;
      color: #303133;
    }
    
    .upload-area {
      width: 100%;
      
      :deep(.el-upload-dragger) {
        width: 100%;
        height: 200px;
      }
    }
    
    .form-section {
      margin-top: $spacing-lg;
      
      .section-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: $spacing-md;
        color: #606266;
      }
    }
    
    .panel-footer {
      margin-top: $spacing-xl;
      display: flex;
      justify-content: center;
      gap: $spacing-md;
    }
    
    .analyzing {
      text-align: center;
      padding: 60px 0;
      
      .el-icon {
        color: $primary-color;
      }
      
      p {
        margin-top: $spacing-md;
        color: #909399;
      }
    }
    
    .analysis-result {
      .summary {
        line-height: 1.8;
        color: #606266;
      }
      
      .episodes-preview {
        margin-top: $spacing-lg;
      }
    }
    
    .empty-characters {
      text-align: center;
      padding: 40px 0;
    }
    
    .characters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: $spacing-md;
      
      .character-card {
        .character-header {
          display: flex;
          gap: $spacing-md;
          align-items: center;
          
          .character-info {
            flex: 1;
            
            h4 {
              margin: 0 0 8px 0;
              font-size: 16px;
            }
            
            .character-role {
              margin-left: 8px;
              color: #909399;
              font-size: 13px;
            }
          }
        }
        
        .character-desc {
          font-size: 14px;
          color: #606266;
          line-height: 1.6;
          margin-bottom: $spacing-md;
        }
        
        .edit-btn {
          padding: 0;
        }
      }
      
      .add-character {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover {
          border-color: $primary-color;
          color: $primary-color;
        }
      }
    }
    
    .episode-selector {
      display: flex;
      gap: $spacing-md;
      margin-bottom: $spacing-lg;
      align-items: center;
    }
    
    .storyboard-list {
      .storyboard-card {
        margin-bottom: $spacing-md;
        
        .storyboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: $spacing-sm;
          
          .scene-number {
            font-weight: 600;
            color: $primary-color;
          }
        }
        
        .storyboard-content {
          .scene-desc {
            margin-bottom: $spacing-sm;
            line-height: 1.6;
          }
          
          .scene-props,
          .scene-dialog {
            font-size: 13px;
            color: #606266;
            margin-bottom: 4px;
            
            strong {
              color: #303133;
            }
          }
        }
      }
    }
    
    .confirm-card {
      margin-bottom: $spacing-lg;
    }
    
    .generate-tips {
      ul {
        margin: 0;
        padding-left: 20px;
        
        li {
          margin-bottom: 8px;
          line-height: 1.6;
        }
      }
    }
  }
}

@media (max-width: $breakpoint-mobile) {
  .steps {
    :deep(.el-step) {
      flex: 0 0 100%;
      margin-bottom: 12px;
    }
  }
  
  .characters-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
