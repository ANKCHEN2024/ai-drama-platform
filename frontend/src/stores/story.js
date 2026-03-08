import { defineStore } from 'pinia'
import { ref } from 'vue'
import { analyzeStory, getScript, getEpisodes, updateScript, regenerateScript } from '@/api/story'

export const useStoryStore = defineStore('story', () => {
  const analysisResult = ref(null)
  const episodes = ref([])
  const characters = ref([])
  const storyboards = ref([])
  const analyzing = ref(false)
  const generating = ref(false)

  async function analyzeNovel(content) {
    analyzing.value = true
    try {
      const res = await analyzeStory({ content })
      analysisResult.value = res.data
      return res.data
    } finally {
      analyzing.value = false
    }
  }

  async function fetchEpisodes(scriptId) {
    const res = await getEpisodes(scriptId)
    episodes.value = res.data || []
    return episodes.value
  }

  async function fetchScript(id) {
    const res = await getScript(id)
    return res.data
  }

  async function updateExistingScript(id, data) {
    const res = await updateScript(id, data)
    return res.data
  }

  async function regenerateExistingScript(id) {
    const res = await regenerateScript(id)
    return res.data
  }

  function reset() {
    analysisResult.value = null
    episodes.value = []
    characters.value = []
    storyboards.value = []
  }

  return {
    analysisResult,
    episodes,
    characters,
    storyboards,
    analyzing,
    generating,
    analyzeNovel,
    fetchEpisodes,
    fetchScript,
    updateExistingScript,
    regenerateExistingScript,
    reset
  }
})
