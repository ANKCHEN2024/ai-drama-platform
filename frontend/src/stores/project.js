import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getProjectList, getProjectDetail, createProject, updateProject, deleteProject } from '@/api/project'

export const useProjectStore = defineStore('project', () => {
  const projects = ref([])
  const currentProject = ref(null)
  const loading = ref(false)

  const projectCount = computed(() => projects.value.length)

  // 获取项目列表
  async function fetchProjects(params = {}) {
    loading.value = true
    try {
      const res = await getProjectList(params)
      projects.value = res.data || []
    } finally {
      loading.value = false
    }
  }

  // 获取项目详情
  async function fetchProjectDetail(id) {
    loading.value = true
    try {
      const res = await getProjectDetail(id)
      currentProject.value = res.data
      return currentProject.value
    } finally {
      loading.value = false
    }
  }

  // 创建项目
  async function createNewProject(data) {
    const res = await createProject(data)
    await fetchProjects()
    return res.data
  }

  // 更新项目
  async function updateProjectData(id, data) {
    const res = await updateProject(id, data)
    if (currentProject.value && currentProject.value.id === id) {
      currentProject.value = res.data
    }
    await fetchProjects()
    return res.data
  }

  // 删除项目
  async function removeProject(id) {
    await deleteProject(id)
    if (currentProject.value && currentProject.value.id === id) {
      currentProject.value = null
    }
    await fetchProjects()
  }

  // 设置当前项目
  function setCurrentProject(project) {
    currentProject.value = project
  }

  return {
    projects,
    currentProject,
    loading,
    projectCount,
    fetchProjects,
    fetchProjectDetail,
    createNewProject,
    updateProjectData,
    removeProject,
    setCurrentProject
  }
})
