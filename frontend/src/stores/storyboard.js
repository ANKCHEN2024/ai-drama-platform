import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getStoryboardList, createStoryboard, getStoryboardDetail, updateStoryboard, deleteStoryboard } from '@/api/storyboard'

export const useStoryboardStore = defineStore('storyboard', () => {
  const storyboards = ref([])
  const currentStoryboard = ref(null)
  const loading = ref(false)

  async function fetchStoryboards(episodeId, params = {}) {
    loading.value = true
    try {
      const res = await getStoryboardList(episodeId, params)
      storyboards.value = res.data || []
    } finally {
      loading.value = false
    }
  }

  async function fetchStoryboardDetail(id) {
    loading.value = true
    try {
      const res = await getStoryboardDetail(id)
      currentStoryboard.value = res.data
      return currentStoryboard.value
    } finally {
      loading.value = false
    }
  }

  async function addStoryboard(episodeId, data) {
    const res = await createStoryboard(episodeId, data)
    await fetchStoryboards(episodeId)
    return res.data
  }

  async function updateStoryboardData(id, data, episodeId) {
    const res = await updateStoryboard(id, data)
    if (currentStoryboard.value && currentStoryboard.value.id === id) {
      currentStoryboard.value = res.data
    }
    if (episodeId) {
      await fetchStoryboards(episodeId)
    }
    return res.data
  }

  async function removeStoryboard(id, episodeId) {
    await deleteStoryboard(id)
    if (currentStoryboard.value && currentStoryboard.value.id === id) {
      currentStoryboard.value = null
    }
    if (episodeId) {
      await fetchStoryboards(episodeId)
    }
  }

  function setCurrentStoryboard(storyboard) {
    currentStoryboard.value = storyboard
  }

  function reset() {
    storyboards.value = []
    currentStoryboard.value = null
  }

  return {
    storyboards,
    currentStoryboard,
    loading,
    fetchStoryboards,
    fetchStoryboardDetail,
    addStoryboard,
    updateStoryboardData,
    removeStoryboard,
    setCurrentStoryboard,
    reset
  }
})
