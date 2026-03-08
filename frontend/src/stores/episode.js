import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getEpisodeList, getEpisodeDetail, updateEpisode } from '@/api/episode'

export const useEpisodeStore = defineStore('episode', () => {
  const episodes = ref([])
  const currentEpisode = ref(null)
  const loading = ref(false)

  async function fetchEpisodes(scriptId, params = {}) {
    loading.value = true
    try {
      const res = await getEpisodeList(scriptId, params)
      episodes.value = res.data || []
    } finally {
      loading.value = false
    }
  }

  async function fetchEpisodeDetail(id) {
    loading.value = true
    try {
      const res = await getEpisodeDetail(id)
      currentEpisode.value = res.data
      return currentEpisode.value
    } finally {
      loading.value = false
    }
  }

  async function updateEpisodeData(id, data, scriptId) {
    const res = await updateEpisode(id, data)
    if (currentEpisode.value && currentEpisode.value.id === id) {
      currentEpisode.value = res.data
    }
    if (scriptId) {
      await fetchEpisodes(scriptId)
    }
    return res.data
  }

  function setCurrentEpisode(episode) {
    currentEpisode.value = episode
  }

  function reset() {
    episodes.value = []
    currentEpisode.value = null
  }

  return {
    episodes,
    currentEpisode,
    loading,
    fetchEpisodes,
    fetchEpisodeDetail,
    updateEpisodeData,
    setCurrentEpisode,
    reset
  }
})
