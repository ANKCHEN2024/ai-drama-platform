import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSceneList, createScene, getSceneDetail, updateScene, deleteScene, generateSceneImage, getSceneImages } from '@/api/scene'

export const useSceneStore = defineStore('scene', () => {
  const scenes = ref([])
  const currentScene = ref(null)
  const sceneImages = ref([])
  const loading = ref(false)

  async function fetchScenes(projectId, params = {}) {
    loading.value = true
    try {
      const res = await getSceneList(projectId, params)
      scenes.value = res.data || []
    } finally {
      loading.value = false
    }
  }

  async function fetchSceneDetail(id) {
    loading.value = true
    try {
      const res = await getSceneDetail(id)
      currentScene.value = res.data
      return currentScene.value
    } finally {
      loading.value = false
    }
  }

  async function addScene(projectId, data) {
    const res = await createScene(projectId, data)
    await fetchScenes(projectId)
    return res.data
  }

  async function updateSceneData(id, data, projectId) {
    const res = await updateScene(id, data)
    if (currentScene.value && currentScene.value.id === id) {
      currentScene.value = res.data
    }
    if (projectId) {
      await fetchScenes(projectId)
    }
    return res.data
  }

  async function removeScene(id, projectId) {
    await deleteScene(id)
    if (currentScene.value && currentScene.value.id === id) {
      currentScene.value = null
    }
    if (projectId) {
      await fetchScenes(projectId)
    }
  }

  async function generateImage(id) {
    const res = await generateSceneImage(id)
    return res.data
  }

  async function fetchSceneImages(id) {
    const res = await getSceneImages(id)
    sceneImages.value = res.data || []
    return sceneImages.value
  }

  function setCurrentScene(scene) {
    currentScene.value = scene
  }

  function reset() {
    scenes.value = []
    currentScene.value = null
    sceneImages.value = []
  }

  return {
    scenes,
    currentScene,
    sceneImages,
    loading,
    fetchScenes,
    fetchSceneDetail,
    addScene,
    updateSceneData,
    removeScene,
    generateImage,
    fetchSceneImages,
    setCurrentScene,
    reset
  }
})
