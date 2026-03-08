import request from './index'

export function getStoryboardList(episodeId, params) {
  return request({
    url: `/episodes/${episodeId}/storyboards`,
    method: 'get',
    params
  })
}

export function createStoryboard(episodeId, data) {
  return request({
    url: `/episodes/${episodeId}/storyboards`,
    method: 'post',
    data
  })
}

export function getStoryboardDetail(id) {
  return request({
    url: `/storyboards/${id}`,
    method: 'get'
  })
}

export function updateStoryboard(id, data) {
  return request({
    url: `/storyboards/${id}`,
    method: 'put',
    data
  })
}

export function deleteStoryboard(id) {
  return request({
    url: `/storyboards/${id}`,
    method: 'delete'
  })
}
