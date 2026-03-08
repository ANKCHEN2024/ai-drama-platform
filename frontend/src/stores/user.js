import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, logout, getProfile, updateProfile } from '@/api/auth'
import { setToken, removeToken, setUserInfo, getUserInfo, removeUserInfo, clearAuth } from '@/utils/storage'

export const useUserStore = defineStore('user', () => {
  const token = ref(getUserInfo()?.token || '')
  const userInfo = ref(getUserInfo() || null)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => userInfo.value?.username || '')
  const email = computed(() => userInfo.value?.email || '')
  const avatar = computed(() => userInfo.value?.avatarUrl || '')

  async function loginUser(data) {
    loading.value = true
    try {
      const res = await login(data)
      const { token: userToken, user } = res.data
      
      token.value = userToken
      userInfo.value = user
      
      setToken(userToken)
      setUserInfo(user)
      
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function registerUser(data) {
    loading.value = true
    try {
      const res = await register(data)
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function logoutUser() {
    try {
      await logout()
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      token.value = ''
      userInfo.value = null
      clearAuth()
    }
  }

  async function fetchUserProfile() {
    loading.value = true
    try {
      const res = await getProfile()
      userInfo.value = res.data
      setUserInfo(res.data)
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function updateUserProfile(data) {
    loading.value = true
    try {
      const res = await updateProfile(data)
      userInfo.value = res.data
      setUserInfo(res.data)
      return res.data
    } finally {
      loading.value = false
    }
  }

  function setUser(user) {
    userInfo.value = user
    setUserInfo(user)
  }

  return {
    token,
    userInfo,
    loading,
    isLoggedIn,
    username,
    email,
    avatar,
    loginUser,
    registerUser,
    logoutUser,
    fetchUserProfile,
    updateUserProfile,
    setUser
  }
})
