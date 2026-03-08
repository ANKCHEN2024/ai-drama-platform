import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCharacterList, createCharacter, getCharacterDetail, updateCharacter, deleteCharacter, generateCharacterImage, getCharacterImages } from '@/api/character'

export const useCharacterStore = defineStore('character', () => {
  const characters = ref([])
  const currentCharacter = ref(null)
  const characterImages = ref([])
  const loading = ref(false)

  async function fetchCharacters(projectId, params = {}) {
    loading.value = true
    try {
      const res = await getCharacterList(projectId, params)
      characters.value = res.data || []
    } finally {
      loading.value = false
    }
  }

  async function fetchCharacterDetail(id) {
    loading.value = true
    try {
      const res = await getCharacterDetail(id)
      currentCharacter.value = res.data
      return currentCharacter.value
    } finally {
      loading.value = false
    }
  }

  async function addCharacter(projectId, data) {
    const res = await createCharacter(projectId, data)
    await fetchCharacters(projectId)
    return res.data
  }

  async function updateCharacterData(id, data, projectId) {
    const res = await updateCharacter(id, data)
    if (currentCharacter.value && currentCharacter.value.id === id) {
      currentCharacter.value = res.data
    }
    if (projectId) {
      await fetchCharacters(projectId)
    }
    return res.data
  }

  async function removeCharacter(id, projectId) {
    await deleteCharacter(id)
    if (currentCharacter.value && currentCharacter.value.id === id) {
      currentCharacter.value = null
    }
    if (projectId) {
      await fetchCharacters(projectId)
    }
  }

  async function generateImage(id) {
    const res = await generateCharacterImage(id)
    return res.data
  }

  async function fetchCharacterImages(id) {
    const res = await getCharacterImages(id)
    characterImages.value = res.data || []
    return characterImages.value
  }

  function setCurrentCharacter(character) {
    currentCharacter.value = character
  }

  function reset() {
    characters.value = []
    currentCharacter.value = null
    characterImages.value = []
  }

  return {
    characters,
    currentCharacter,
    characterImages,
    loading,
    fetchCharacters,
    fetchCharacterDetail,
    addCharacter,
    updateCharacterData,
    removeCharacter,
    generateImage,
    fetchCharacterImages,
    setCurrentCharacter,
    reset
  }
})
