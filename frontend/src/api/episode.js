import request from '@/utils/request'

/**
 * 创建分集
 */
export function createEpisode(projectId, data) {
  return request({
    url: `/projects/${projectId}/episodes`,
    method: 'post',
    data
  })
}

/**
 * 获取分集列表
 */
export function getEpisodes(projectId) {
  return request({
    url: `/projects/${projectId}/episodes`,
    method: 'get'
  })
}

/**
 * 获取分集详情
 */
export function getEpisode(id) {
  return request({
    url: `/episodes/${id}`,
    method: 'get'
  })
}

/**
 * 更新分集
 */
export function updateEpisode(id, data) {
  return request({
    url: `/episodes/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除分集
 */
export function deleteEpisode(id) {
  return request({
    url: `/episodes/${id}`,
    method: 'delete'
  })
}

/**
 * 分集排序
 */
export function reorderEpisode(id, newNumber) {
  return request({
    url: `/episodes/${id}/reorder`,
    method: 'put',
    data: { newNumber }
  })
}
