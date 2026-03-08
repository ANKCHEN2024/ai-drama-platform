import request from '@/utils/request'

/**
 * 创建分镜
 */
export function createScene(episodeId, data) {
  return request({
    url: `/episodes/${episodeId}/scenes`,
    method: 'post',
    data
  })
}

/**
 * 获取分镜列表
 */
export function getScenes(episodeId) {
  return request({
    url: `/episodes/${episodeId}/scenes`,
    method: 'get'
  })
}

/**
 * 获取分镜详情
 */
export function getScene(id) {
  return request({
    url: `/scenes/${id}`,
    method: 'get'
  })
}

/**
 * 更新分镜
 */
export function updateScene(id, data) {
  return request({
    url: `/scenes/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除分镜
 */
export function deleteScene(id) {
  return request({
    url: `/scenes/${id}`,
    method: 'delete'
  })
}

/**
 * 分镜排序
 */
export function reorderScene(id, newNumber) {
  return request({
    url: `/scenes/${id}/reorder`,
    method: 'put',
    data: { newNumber }
  })
}
