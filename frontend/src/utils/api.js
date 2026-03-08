import axios from 'axios'
import { getToken, removeToken } from './storage'

// 创建 axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    if (error.response) {
      const { status } = error.response
      
      if (status === 401) {
        // 未授权，清除 token 并跳转到登录页
        removeToken()
        window.location.href = '/login'
      } else if (status === 403) {
        console.error('没有权限访问该资源')
      } else if (status === 404) {
        console.error('请求的资源不存在')
      } else if (status >= 500) {
        console.error('服务器错误')
      }
    }
    return Promise.reject(error)
  }
)

// API 方法
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  getCurrentUser: () => api.get('/auth/me')
}

export const projectAPI = {
  list: (params) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  archive: (id) => api.post(`/projects/${id}/archive`),
  restore: (id) => api.post(`/projects/${id}/restore`)
}

export const episodeAPI = {
  list: (projectId, params) => api.get(`/projects/${projectId}/episodes`, { params }),
  get: (projectId, episodeId) => api.get(`/projects/${projectId}/episodes/${episodeId}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/episodes`, data),
  update: (projectId, episodeId, data) => api.put(`/projects/${projectId}/episodes/${episodeId}`, data),
  delete: (projectId, episodeId) => api.delete(`/projects/${projectId}/episodes/${episodeId}`),
  reorder: (projectId, episodeId, data) => api.put(`/api/episodes/${episodeId}/reorder`, data),
  // 导入/导出功能
  export: (projectId, format = 'json') => 
    api.get(`/projects/${projectId}/episodes/export`, { 
      params: { format },
      responseType: 'blob'
    }),
  import: (projectId, formData) => 
    api.post(`/projects/${projectId}/episodes/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
}

export const sceneAPI = {
  list: (projectId, episodeId, params) => 
    api.get(`/projects/${projectId}/episodes/${episodeId}/scenes`, { params }),
  get: (projectId, episodeId, sceneId) => 
    api.get(`/projects/${projectId}/episodes/${episodeId}/scenes/${sceneId}`),
  create: (projectId, episodeId, data) => 
    api.post(`/projects/${projectId}/episodes/${episodeId}/scenes`, data),
  update: (projectId, episodeId, sceneId, data) => 
    api.put(`/projects/${projectId}/episodes/${episodeId}/scenes/${sceneId}`, data),
  delete: (projectId, episodeId, sceneId) => 
    api.delete(`/projects/${projectId}/episodes/${episodeId}/scenes/${sceneId}`),
  reorder: (projectId, episodeId, sceneId, data) => 
    api.put(`/api/episodes/${episodeId}/scenes/${sceneId}/reorder`, data),
  // 导入/导出功能
  export: (projectId, episodeId, format = 'json') => 
    api.get(`/projects/${projectId}/episodes/${episodeId}/scenes/export`, { 
      params: { format },
      responseType: 'blob'
    }),
  import: (projectId, episodeId, formData) => 
    api.post(`/projects/${projectId}/episodes/${episodeId}/scenes/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
}

export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  changePassword: (data) => api.put('/user/change-password', data),
  uploadAvatar: (formData) => api.post('/user/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export default api
