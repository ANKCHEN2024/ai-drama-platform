<template>
  <div class="episodes-view">
    <div class="header">
      <h2>
        <el-button icon="ArrowLeft" circle @click="goBack" />
        分集管理
      </h2>
      <div class="header-actions">
        <el-button 
          v-if="selectedEpisodes.length > 0" 
          type="danger" 
          @click="batchDelete"
        >
          批量删除 ({{ selectedEpisodes.length }})
        </el-button>
        <el-button 
          v-if="selectedEpisodes.length > 0" 
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
          新建分集
        </el-button>
      </div>
    </div>

    <div class="episodes-list">
      <el-card
        v-for="episode in episodes"
        :key="episode.id"
        class="episode-card"
        :class="{ 
          active: selectedEpisode?.id === episode.id,
          selected: selectedEpisodes.includes(episode.id),
          'drag-over': dragOverEpisode === episode.id
        }"
        draggable="true"
        @dragstart="handleDragStart($event, episode)"
        @dragenter="handleDragEnter($event, episode)"
        @dragleave="handleDragLeave"
        @dragover.prevent
        @drop="handleDrop($event, episode)"
        @click="selectEpisode(episode)"
      >
        <div class="episode-checkbox" @click.stop>
          <el-checkbox 
            :model-value="selectedEpisodes.includes(episode.id)"
            @change="toggleSelect(episode.id)"
          />
        </div>
        <div class="episode-drag-handle" @click.stop>⋮⋮</div>
        <div class="episode-header">
          <span class="episode-number">第{{ episode.number }}集</span>
          <el-tag :type="getStatusType(episode.status)" size="small">
            {{ getStatusText(episode.status) }}
          </el-tag>
        </div>
        <h3 class="episode-title">{{ episode.title }}</h3>
        <p class="episode-description" v-if="episode.description">
          {{ episode.description }}
        </p>
        <div class="episode-footer">
          <span class="scene-count">
            <el-icon><Document /></el-icon>
            {{ episode.scenes?.length || 0 }} 个分镜
          </span>
          <div class="episode-actions">
            <el-button size="small" @click.stop="editEpisode(episode)">编辑</el-button>
            <el-button size="small" type="danger" @click.stop="deleteEpisode(episode)">删除</el-button>
          </div>
        </div>
      </el-card>

      <el-empty v-if="episodes.length === 0" description="还没有分集，创建一个吧" />
    </div>

    <!-- 创建/编辑分集对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingEpisode ? '编辑分集' : '创建分集'"
      width="500px"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="集号" required>
          <el-input-number
            v-model="form.number"
            :min="1"
            :disabled="!!editingEpisode"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="请输入分集标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分集描述（可选）"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="草稿" value="draft" />
            <el-option label="创作中" value="writing" />
            <el-option label="已完成" value="completed" />
            <el-option label="已归档" value="archived" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveEpisode">确定</el-button>
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
            <el-option label="已归档" value="archived" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchStatusDialog = false">取消</el-button>
        <el-button type="primary" @click="saveBatchStatus">确定</el-button>
      </template>
    </el-dialog>

    <!-- 导入分集对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入分集"
      width="500px"
    >
      <el-alert
        title="支持格式"
        description="支持导入 JSON 或 CSV 格式的分集文件。JSON 文件应包含分集数组，CSV 文件应包含表头：number,title,description,duration,status"
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
import { Plus, Document, ArrowLeft, Upload, ArrowDown } from '@element-plus/icons-vue'
import { episodeAPI, projectAPI } from '@/utils/api'

const route = useRoute()
const router = useRouter()

const projectId = ref(route.params.projectId)
const episodes = ref([])
const selectedEpisode = ref(null)
const selectedEpisodes = ref([])
const showCreateDialog = ref(false)
const showBatchStatusDialog = ref(false)
const showImportDialog = ref(false)
const importFile = ref(null)
const editingEpisode = ref(null)
const batchStatus = ref('draft')

// 拖拽相关
const draggedEpisode = ref(null)
const dragOverEpisode = ref(null)

const form = ref({
  number: 1,
  title: '',
  description: '',
  status: 'draft'
})

onMounted(async () => {
  await loadProjectInfo()
  await loadEpisodes()
})

async function loadProjectInfo() {
  try {
    const data = await projectAPI.get(projectId.value)
    // project info loaded but not used in template
  } catch (error) {
    console.error('加载项目信息失败:', error)
  }
}

async function loadEpisodes() {
  try {
    const data = await episodeAPI.list(projectId.value)
    episodes.value = data
  } catch (error) {
    console.error('加载分集列表失败:', error)
    ElMessage.error('加载分集列表失败')
  }
}

function selectEpisode(episode) {
  selectedEpisode.value = episode
  router.push(`/projects/${projectId.value}/episodes/${episode.id}`)
}

function goBack() {
  router.push('/projects')
}

function getStatusType(status) {
  const types = {
    draft: 'info',
    writing: 'warning',
    completed: 'success',
    archived: ''
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    draft: '草稿',
    writing: '创作中',
    completed: '已完成',
    archived: '已归档'
  }
  return texts[status] || status
}

function toggleSelect(episodeId) {
  const index = selectedEpisodes.value.indexOf(episodeId)
  if (index > -1) {
    selectedEpisodes.value.splice(index, 1)
  } else {
    selectedEpisodes.value.push(episodeId)
  }
}

// 拖拽功能
function handleDragStart(event, episode) {
  draggedEpisode.value = episode
  event.dataTransfer.effectAllowed = 'move'
}

function handleDragEnter(event, episode) {
  dragOverEpisode.value = episode.id
}

function handleDragLeave() {
  dragOverEpisode.value = null
}

async function handleDrop(event, targetEpisode) {
  dragOverEpisode.value = null
  
  if (!draggedEpisode.value || draggedEpisode.value.id === targetEpisode.id) {
    return
  }

  try {
    const draggedIndex = episodes.value.findIndex(e => e.id === draggedEpisode.value.id)
    const targetIndex = episodes.value.findIndex(e => e.id === targetEpisode.id)
    
    // 调用 API 重新排序
    await episodeAPI.reorder(projectId.value, draggedEpisode.value.id, {
      newNumber: targetIndex + 1
    })
    
    // 重新加载列表
    await loadEpisodes()
    ElMessage.success('分集排序成功')
  } catch (error) {
    console.error('排序失败:', error)
    ElMessage.error('排序失败')
  }
  
  draggedEpisode.value = null
}

function editEpisode(episode) {
  editingEpisode.value = episode
  form.value = {
    number: episode.number,
    title: episode.title,
    description: episode.description || '',
    status: episode.status
  }
  showCreateDialog.value = true
}

async function saveEpisode() {
  if (!form.value.title) {
    ElMessage.warning('请输入分集标题')
    return
  }

  try {
    if (editingEpisode.value) {
      await episodeAPI.update(projectId.value, editingEpisode.value.id, form.value)
      ElMessage.success('分集更新成功')
    } else {
      await episodeAPI.create(projectId.value, form.value)
      ElMessage.success('分集创建成功')
    }
    showCreateDialog.value = false
    editingEpisode.value = null
    form.value = { number: 1, title: '', description: '', status: 'draft' }
    await loadEpisodes()
  } catch (error) {
    console.error('保存分集失败:', error)
    ElMessage.error(error.response?.data?.error || '保存分集失败')
  }
}

async function deleteEpisode(episode) {
  try {
    await ElMessageBox.confirm(`确定要删除分集"${episode.title}"吗？`, '确认删除', {
      type: 'warning'
    })
    
    await episodeAPI.delete(projectId.value, episode.id)
    ElMessage.success('分集已删除')
    await loadEpisodes()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除分集失败:', error)
      ElMessage.error('删除分集失败')
    }
  }
}

async function batchDelete() {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedEpisodes.value.length} 个分集吗？`, '确认批量删除', {
      type: 'warning'
    })
    
    await Promise.all(
      selectedEpisodes.value.map(id => {
        const episode = episodes.value.find(e => e.id === id)
        return episode ? episodeAPI.delete(projectId.value, id) : Promise.resolve()
      })
    )
    
    ElMessage.success(`已删除 ${selectedEpisodes.value.length} 个分集`)
    selectedEpisodes.value = []
    await loadEpisodes()
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
      selectedEpisodes.value.map(id => {
        const episode = episodes.value.find(e => e.id === id)
        return episode ? episodeAPI.update(projectId.value, id, { status: batchStatus.value }) : Promise.resolve()
      })
    )
    
    ElMessage.success(`已更新 ${selectedEpisodes.value.length} 个分集的状态`)
    showBatchStatusDialog.value = false
    selectedEpisodes.value = []
    await loadEpisodes()
  } catch (error) {
    console.error('批量更新状态失败:', error)
    ElMessage.error('批量更新状态失败')
  }
}

// 导出功能
const importing = ref(false)

async function handleExport(format) {
  try {
    const blob = await episodeAPI.export(projectId.value, format)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `分集_${project.value.name || projectId.value}.${format}`
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
    
    await episodeAPI.import(projectId.value, formData)
    
    ElMessage.success('导入成功')
    showImportDialog.value = false
    importFile.value = null
    await loadEpisodes()
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败：' + (error.response?.data?.message || error.message))
  } finally {
    importing.value = false
  }
}
</script>

<style lang="scss" scoped>
.episodes-view {
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #fff;
      font-size: 1.5rem;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }
  }

  .episodes-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;

    .episode-card {
      cursor: pointer;
      transition: all 0.3s;
      background: #1a1a2e;
      border: 1px solid #2a2a3e;
      position: relative;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
      }
      
      &.active {
        border-color: #6366f1;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
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

      .episode-checkbox {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 10;
      }

      .episode-drag-handle {
        position: absolute;
        top: 10px;
        right: 10px;
        color: #6366f1;
        cursor: grab;
        font-size: 1.2rem;
        user-select: none;
        
        &:active {
          cursor: grabbing;
        }
      }

      .episode-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        margin-top: 20px;

        .episode-number {
          font-size: 0.9rem;
          color: #6366f1;
          font-weight: 600;
        }
      }

      .episode-title {
        font-size: 1.2rem;
        color: #fff;
        margin: 0 0 10px 0;
      }

      .episode-description {
        color: #909399;
        font-size: 0.9rem;
        margin: 0 0 15px 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .episode-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 15px;
        border-top: 1px solid #2a2a3e;

        .scene-count {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #909399;
          font-size: 0.9rem;
        }

        .episode-actions {
          display: flex;
          gap: 8px;
        }
      }
    }
  }
}
</style>
