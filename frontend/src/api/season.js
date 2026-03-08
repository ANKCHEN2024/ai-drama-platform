import request from '@/utils/request'

/**
 * 创建分季
 */
export function createSeason(projectId, data) {
  return request({
    url: `/projects/${projectId}/seasons`,
    method: 'post',
    data
  })
}

/**
 * 获取分季列表
 */
export function getSeasons(projectId) {
  return request({
    url: `/projects/${projectId}/seasons`,
    method: 'get'
  })
}

/**
 * 获取分季详情
 */
export function getSeason(id) {
  return request({
    url: `/seasons/${id}`,
    method: 'get'
  })
}

/**
 * 更新分季
 */
export function updateSeason(id, data) {
  return request({
    url: `/seasons/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除分季
 */
export function deleteSeason(id) {
  return request({
    url: `/seasons/${id}`,
    method: 'delete'
  })
}
