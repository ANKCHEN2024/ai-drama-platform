import request from './index'

export function analyzeStory(data) {
  return request({
    url: '/scripts/analyze',
    method: 'post',
    data
  })
}

export function getScript(id) {
  return request({
    url: `/scripts/${id}`,
    method: 'get'
  })
}

export function updateScript(id, data) {
  return request({
    url: `/scripts/${id}`,
    method: 'put',
    data
  })
}

export function getEpisodes(id) {
  return request({
    url: `/scripts/${id}/episodes`,
    method: 'get'
  })
}

export function regenerateScript(id) {
  return request({
    url: `/scripts/${id}/regenerate`,
    method: 'post'
  })
}
