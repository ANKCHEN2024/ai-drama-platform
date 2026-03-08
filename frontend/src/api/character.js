import request from './index'

export function getCharacterList(projectId, params) {
  return request({
    url: `/projects/${projectId}/characters`,
    method: 'get',
    params
  })
}

export function createCharacter(projectId, data) {
  return request({
    url: `/projects/${projectId}/characters`,
    method: 'post',
    data
  })
}

export function getCharacterDetail(id) {
  return request({
    url: `/characters/${id}`,
    method: 'get'
  })
}

export function updateCharacter(id, data) {
  return request({
    url: `/characters/${id}`,
    method: 'put',
    data
  })
}

export function deleteCharacter(id) {
  return request({
    url: `/characters/${id}`,
    method: 'delete'
  })
}

export function generateCharacterImage(id) {
  return request({
    url: `/characters/${id}/generate`,
    method: 'post'
  })
}

export function getCharacterImages(id) {
  return request({
    url: `/characters/${id}/images`,
    method: 'get'
  })
}
