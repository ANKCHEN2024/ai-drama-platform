import { defineStore } from 'pinia'
import { ref } from 'vue'
import { generateVideo, getVideo, getVideoStatus, deleteVideo, regenerateVideo, getVideoList } from '@/api/video'

export const useVideoStore = defineStore('video', () => {
  const videos = ref([])
  const currentVideo = ref(null)
  const loading = ref(false)
  const generating = ref(false)

  async function fetchVideoList(params = {}) {
    loading.value = true
    try {
      const res = await getVideoList(params)
      videos.value = res.data || []
    } finally {
      loading.value = false
    }
  }

  async function fetchVideoDetail(id) {
    loading.value = true
    try {
      const res = await getVideo(id)
      currentVideo.value = res.data
      return currentVideo.value
    } finally {
      loading.value = false
    }
  }

  async function checkVideoStatus(id) {
    const res = await getVideoStatus(id)
    return res.data
  }

  async function createVideo(data) {
    generating.value = true
    try {
      const res = await generateVideo(data)
      return res.data
    } finally {
      generating.value = false
    }
  }

  async function regenerate(id) {
    generating.value = true
    try {
      const res = await regenerateVideo(id)
      return res.data
    } finally {
      generating.value = false
    }
  }

  async function removeVideo(id) {
    await deleteVideo(id)
    if (currentVideo.value && currentVideo.value.id === id) {
      currentVideo.value = null
    }
  }

  function setCurrentVideo(video) {
    currentVideo.value = video
  }

  function reset() {
    videos.value = []
    currentVideo.value = null
  }

  return {
    videos,
    currentVideo,
    loading,
    generating,
    fetchVideoList,
    fetchVideoDetail,
    checkVideoStatus,
    createVideo,
    regenerate,
    removeVideo,
    setCurrentVideo,
    reset
  }
})
