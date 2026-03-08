import request from './index'

export function generateVideo(data) {
  return request({
    url: '/videos/generate',
    method: 'post',
    data
  })
}

export function getVideo(id) {
  return request({
    url: `/videos/${id}`,
    method: 'get'
  })
}

export function getVideoStatus(id) {
  return request({
    url: `/videos/${id}/status`,
    method: 'get'
  })
}

export function deleteVideo(id) {
  return request({
    url: `/videos/${id}`,
    method: 'delete'
  })
}

export function regenerateVideo(id) {
  return request({
    url: `/videos/${id}/regenerate`,
    method: 'post'
  })
}

export function getVideoList(params) {
  return request({
    url: '/videos',
    method: 'get',
    params
  })
}
