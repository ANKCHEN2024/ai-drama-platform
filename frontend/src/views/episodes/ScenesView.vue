<template>
  <div class="scenes-view">
    <div class="header">
      <div class="breadcrumb">
        <el-button icon="ArrowLeft" circle @click="goBack" />
        <span class="path">
          <router-link :to="`/projects/${projectId}`">项目</router-link>
          <span class="separator">/</span>
          <router-link :to="`/projects/${projectId}/episodes`">分集</router-link>
          <span class="separator">/</span>
          <span>分镜</span>
        </span>
      </div>
      <div class="header-actions">
        <el-button 
          v-if="selectedScenes.length > 0" 
          type="danger" 
          @click="batchDelete"
        >
          批量删除 ({{ selectedScenes.length }})
        </el-button>
        <el-button 
          v-if="selectedScenes.length > 0" 
          @click="showBatchStatusDialog = true"
        >
          批量修改状态
        </el-button>
        <el-dropdown @command="handleExport">
          <el-button>
            导出
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="json">导出为 JSON</el-dropdown-item>
              <el-dropdown-item command="csv">导出为 CSV</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button @click="showImportDialog = true">
          <el-icon><Upload /></el-icon>
          导入
        </el-button>
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          新建分镜
        </el-button>
      </div>
    </div>

    <div class="episode-info">
      <h2>第{{ episode.number }}集：{{ episode.title }}</h2>
      <p v-if="episode.description">{{ episode.description }}</p>
    </div>

    <div class="scenes-list" @dragover.prevent @drop="handleDrop">
      <el-card
        v-for="scene in scenes"
        :key="scene.id"
        class="scene-card"
        :class="{ 
          selected: selectedScenes.includes(scene.id),
          'drag-over': dragOverScene === scene.id
        }"
        draggable="true"
        @dragstart="handleDragStart($event, scene)"
        @dragenter="handleDragEnter($event, scene)"
        @dragleave="handleDragLeave"
        @dragover.prevent
        @drop="handleDropOnScene($event, scene)"
      >
        <div class="scene-checkbox" @click.stop>
          <el-checkbox 
            :model-value="selectedScenes.includes(scene.id)"
            @change="toggleSelect(scene.id)"
          />
        </div>
        <div class="scene-drag-handle" @click.stop>⋮⋮</div>
        <div class="scene-header">
          <div class="scene-number">
            <span class="label">场号</span>
            <span class="value">SC{{ String(scene.number).padStart(3, '0') }}</span>
          </div>
          <div class="scene-meta">
            <el-tag size="small">{{ scene.timeOfDay }}</el-tag>
            <el-tag :type="getStatusType(scene.status)" size="small">
              {{ getStatusText(scene.status) }}
            </el-tag>
          </div>
        </div>

        <div class="scene-location">
          <el-icon><Location /></el-icon>
          <span>{{ scene.location }}</span>
        </div>

        <div class="scene-content">
          <h4>剧情内容</h4>
          <p>{{ scene.content }}</p>
        </div>

        <div class="scene-dialogue" v-if="scene.dialogue">
          <h4>对白</h4>
          <p>{{ scene.dialogue }}</p>
        </div>

        <div class="scene-footer">
          <span class="duration" v-if="scene.duration">
            <el-icon><Timer /></el-icon>
            预计时长：{{ scene.duration }}秒
          </span>
          <div class="scene-actions">
            <el-button size="small" @click="editScene(scene)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteScene(scene)">删除</el-button>
          </div>
        </div>
      </el-card>

      <el-empty v-if="scenes.length === 0" description="还没有分镜，创建一个吧" />
    </div>

    <!-- 创建/编辑分镜对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingScene ? '编辑分镜' : '创建分镜'"
      width="600px"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="场号" required>
          <el-input-number
            v-model="form.number"
            :min="1"
            :disabled="!!editingScene"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="场景" required>
          <el-input v-model="form.location" placeholder="如：内景 - 办公室 - 白天" />
        </el-form-item>
        <el-form-item label="时间" required>
          <el-select v-model="form.timeOfDay" style="width: 100%">
            <el-option label="清晨" value="清晨" />
            <el-option label="上午" value="上午" />
            <el-option label="中午" value="中午" />
            <el-option label="下午" value="下午" />
            <el-option label="傍晚" value="傍晚" />
            <el-option label="夜晚" value="夜晚" />
            <el-option label="深夜" value="深夜" />
          </el-select>
        </el-form-item>
        <el-form-item label="剧情" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            placeholder="描述场景中的动作和事件"
          />
        </el-form-item>
        <el-form-item label="对白">
          <el-input
            v-model="form.dialogue"
            type="textarea"
            :rows="3"
            placeholder="角色的对话内容（可选）"
          />
        </el-form-item>
        <el-form-item label="预计时长">
          <el-input-number v-model="form.duration" :min="1" :max="300" style="width: 100%" />
          <span style="margin-left: 10px; color: #909399">秒</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="草稿" value="draft" />
            <el-option label="创作中" value="writing" />
            <el-option label="已完成" value="completed" />
            <el-option label="已审核" value="approved" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveScene">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量修改状态对话框 -->
    <el-dialog
      v-model="showBatchStatusDialog"
      title="批量修改状态"
      width="400px"
    >
      <el-form>
        <el-form-item label="选择状态">
          <el-select v-model="batchStatus" style="width: 100%">
            <el-option label="草稿" value="draft" />
            <el-option label="创作中" value="writing" />
            <el-option label="已完成" value="completed" />
            <el-option label="已审核" value="approved" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchStatusDialog = false">取消</el-button>
        <el-button type="primary" @click="saveBatchStatus">确定</el-button>
      </template>
    </el-dialog>

    <!-- 导入分镜对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入分镜"
      width="500px"
    >
      <el-alert
        title="支持格式"
        description="支持导入 JSON 或 CSV 格式的分镜文件。JSON 文件应包含分镜数组，CSV 文件应包含表头：number,location,timeOfDay,content,dialogue,duration,status"
        type="info"
        show-icon
        style="margin-bottom: 20px"
      />
      <el-form>
        <el-form-item label="选择文件">
          <input 
            type="file" 
            @change="handleFileChange" 
            accept=".json,.csv"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="handleImport" :loading="importing">
          导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Location, Timer, ArrowLeft, Upload, ArrowDown } from '@element-plus/icons-vue'
import { episodeAPI, sceneAPI } from '@/utils/api'

const route = useRoute()
const router = useRouter()

const projectId = ref(route.params.projectId)
const episodeId = ref(route.params.episodeId)
const episode = ref({})
const scenes = ref([])
const selectedScenes = ref([])
const showCreateDialog = ref(false)
const showBatchStatusDialog = ref(false)
const showImportDialog = ref(false)
const editingScene = ref(null)
const batchStatus = ref('draft')
const importFile = ref(null)

// 拖拽相关
const draggedScene = ref(null)
const dragOverScene = ref(null)

const form = ref({
  number: 1,
  location: '',
  timeOfDay: '白天',
  content: '',
  dialogue: '',
  duration: 30,
  status: 'draft'
})

onMounted(() => {
  loadEpisode()
  loadScenes()
})

async function loadEpisode() {
  try {
    const data = await episodeAPI.get(projectId.value, episodeId.value)
    episode.value = data
  } catch (error) {
    console.error('加载分集信息失败:', error)
    ElMessage.error('加载分集信息失败')
  }
}

async function loadScenes() {
  try {
    const data = await sceneAPI.list(projectId.value, episodeId.value)
    scenes.value = data
  } catch (error) {
    console.error('加载分镜列表失败:', error)
    ElMessage.error('加载分镜列表失败')
  }
}

function goBack() {
  router.push(`/projects/${projectId.value}/episodes`)
}

function getStatusType(status) {
  const types = {
    draft: 'info',
    writing: 'warning',
    completed: 'success',
    approved: ''
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    draft: '草稿',
    writing: '创作中',
    completed: '已完成',
    approved: '已审核'
  }
  return texts[status] || status
}

function toggleSelect(sceneId) {
  const index = selectedScenes.value.indexOf(sceneId)
  if (index > -1) {
    selectedScenes.value.splice(index, 1)
  } else {
    selectedScenes.value.push(sceneId)
  }
}

// 拖拽功能
function handleDragStart(event, scene) {
  draggedScene.value = scene
  event.dataTransfer.effectAllowed = 'move'
}

function handleDragEnter(event, scene) {
  dragOverScene.value = scene.id
}

function handleDragLeave() {
  dragOverScene.value = null
}

async function handleDropOnScene(event, targetScene) {
  dragOverScene.value = null
  
  if (!draggedScene.value || draggedScene.value.id === targetScene.id) {
    return
  }

  try {
    const draggedIndex = scenes.value.findIndex(s => s.id === draggedScene.value.id)
    const targetIndex = scenes.value.findIndex(s => s.id === targetScene.id)
    
    // 调用 API 重新排序
    await sceneAPI.reorder(projectId.value, episodeId.value, draggedScene.value.id, {
      newNumber: targetIndex + 1
    })
    
    // 重新加载列表
    await loadScenes()
    ElMessage.success('分镜排序成功')
  } catch (error) {
    console.error('排序失败:', error)
    ElMessage.error('排序失败')
  }
  
  draggedScene.value = null
}

function editScene(scene) {
  editingScene.value = scene
  form.value = {
    number: scene.number,
    location: scene.location,
    timeOfDay: scene.timeOfDay,
    content: scene.content,
    dialogue: scene.dialogue || '',
    duration: scene.duration || 30,
    status: scene.status
  }
  showCreateDialog.value = true
}

async function saveScene() {
  if (!form.value.location || !form.value.timeOfDay || !form.value.content) {
    ElMessage.warning('请填写必填字段')
    return
  }

  try {
    if (editingScene.value) {
      await sceneAPI.update(projectId.value, episodeId.value, editingScene.value.id, form.value)
      ElMessage.success('分镜更新成功')
    } else {
      await sceneAPI.create(projectId.value, episodeId.value, form.value)
      ElMessage.success('分镜创建成功')
    }
    showCreateDialog.value = false
    editingScene.value = null
    form.value = { number: 1, location: '', timeOfDay: '白天', content: '', dialogue: '', duration: 30, status: 'draft' }
    await loadScenes()
  } catch (error) {
    console.error('保存分镜失败:', error)
    ElMessage.error(error.response?.data?.error || '保存分镜失败')
  }
}

async function deleteScene(scene) {
  try {
    await ElMessageBox.confirm(`确定要删除场号 SC${String(scene.number).padStart(3, '0')} 吗？`, '确认删除', {
      type: 'warning'
    })
    
    await sceneAPI.delete(projectId.value, episodeId.value, scene.id)
    ElMessage.success('分镜已删除')
    await loadScenes()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除分镜失败:', error)
      ElMessage.error('删除分镜失败')
    }
  }
}

async function batchDelete() {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedScenes.value.length} 个分镜吗？`, '确认批量删除', {
      type: 'warning'
    })
    
    await Promise.all(
      selectedScenes.value.map(id => {
        const scene = scenes.value.find(s => s.id === id)
        return scene ? sceneAPI.delete(projectId.value, episodeId.value, id) : Promise.resolve()
      })
    )
    
    ElMessage.success(`已删除 ${selectedScenes.value.length} 个分镜`)
    selectedScenes.value = []
    await loadScenes()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

async function saveBatchStatus() {
  try {
    await Promise.all(
      selectedScenes.value.map(id => {
        const scene = scenes.value.find(s => s.id === id)
        return scene ? sceneAPI.update(projectId.value, episodeId.value, id, { status: batchStatus.value }) : Promise.resolve()
      })
    )
    
    ElMessage.success(`已更新 ${selectedScenes.value.length} 个分镜的状态`)
    showBatchStatusDialog.value = false
    selectedScenes.value = []
    await loadScenes()
  } catch (error) {
    console.error('批量更新状态失败:', error)
    ElMessage.error('批量更新状态失败')
  }
}

// 导出功能
const importing = ref(false)

async function handleExport(format) {
  try {
    const blob = await sceneAPI.export(projectId.value, episodeId.value, format)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `分镜_${episode.value.title || episodeId.value}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

function handleFileChange(event) {
  importFile.value = event.target.files[0]
}

async function handleImport() {
  if (!importFile.value) {
    ElMessage.warning('请选择要导入的文件')
    return
  }

  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    
    await sceneAPI.import(projectId.value, episodeId.value, formData)
    
    ElMessage.success('导入成功')
    showImportDialog.value = false
    importFile.value = null
    await loadScenes()
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败：' + (error.response?.data?.message || error.message))
  } finally {
    importing.value = false
  }
}
</script>

<style lang="scss" scoped>
.scenes-view {
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #909399;

      .path {
        display: flex;
        align-items: center;
        gap: 8px;

        a {
          color: #6366f1;
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }

        .separator {
          color: #606266;
        }
      }
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }
  }

  .episode-info {
    margin-bottom: 30px;
    padding: 20px;
    background: #1a1a2e;
    border-radius: 8px;

    h2 {
      color: #fff;
      margin: 0 0 10px 0;
      font-size: 1.5rem;
    }

    p {
      color: #909399;
      margin: 0;
    }
  }

  .scenes-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 20px;

    .scene-card {
      background: #1a1a2e;
      border: 1px solid #2a2a3e;
      transition: all 0.3s;
      position: relative;
      cursor: pointer;

      &:hover {
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        transform: translateY(-2px);
      }

      &.selected {
        border-color: #6366f1;
        background: rgba(99, 102, 241, 0.1);
      }

      &.drag-over {
        border-color: #6366f1;
        border-style: dashed;
        transform: scale(1.02);
      }

      :deep(.el-card__body) {
        padding: 1.5rem;
      }

      .scene-checkbox {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 10;
      }

      .scene-drag-handle {
        position: absolute;
        top: 10px;
        right: 10px;
        color: #6366f1;
        cursor: grab;
        font-size: 1.2rem;
        user-select: none;
        z-index: 10;
        
        &:active {
          cursor: grabbing;
        }
      }

      .scene-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        margin-top: 20px;

        .scene-number {
          display: flex;
          flex-direction: column;

          .label {
            font-size: 0.8rem;
            color: #909399;
          }

          .value {
            font-size: 1.2rem;
            font-weight: bold;
            color: #6366f1;
          }
        }

        .scene-meta {
          display: flex;
          gap: 8px;
        }
      }

      .scene-location {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #e0e0e0;
        margin-bottom: 15px;
        padding: 8px 12px;
        background: rgba(99, 102, 241, 0.1);
        border-radius: 4px;
      }

      .scene-content,
      .scene-dialogue {
        margin-bottom: 15px;

        h4 {
          color: #909399;
          font-size: 0.9rem;
          margin: 0 0 8px 0;
        }

        p {
          color: #e0e0e0;
          margin: 0;
          line-height: 1.6;
        }
      }

      .scene-dialogue {
        padding: 12px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        border-left: 3px solid #6366f1;
      }

      .scene-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 15px;
        border-top: 1px solid #2a2a3e;

        .duration {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #909399;
          font-size: 0.9rem;
        }

        .scene-actions {
          display: flex;
          gap: 8px;
        }
      }
    }
  }
}
</style>
