import request from '@/utils/request'

/**
 * 用户注册
 */
export function register(data) {
  return request({
    url: '/auth/register',
    method: 'post',
    data
  })
}

/**
 * 用户登录
 */
export function login(data) {
  return request({
    url: '/auth/login',
    method: 'post',
    data
  })
}

/**
 * 用户登出
 */
export function logout() {
  return request({
    url: '/auth/logout',
    method: 'post'
  })
}

/**
 * 获取用户资料
 */
export function getProfile() {
  return request({
    url: '/auth/profile',
    method: 'get'
  })
}

/**
 * 更新用户资料
 */
export function updateProfile(data) {
  return request({
    url: '/auth/profile',
    method: 'put',
    data
  })
}

/**
 * 修改密码
 */
export function changePassword(data) {
  return request({
    url: '/auth/password',
    method: 'put',
    data
  })
}

/**
 * 发送邮箱验证邮件
 */
export function sendVerificationEmail() {
  return request({
    url: '/auth/send-verification-email',
    method: 'post'
  })
}

/**
 * 验证邮箱
 */
export function verifyEmail(data) {
  return request({
    url: '/auth/verify-email',
    method: 'post',
    data
  })
}

/**
 * 请求密码重置
 */
export function forgotPassword(data) {
  return request({
    url: '/auth/forgot-password',
    method: 'post',
    data
  })
}

/**
 * 重置密码
 */
export function resetPassword(data) {
  return request({
    url: '/auth/reset-password',
    method: 'post',
    data
  })
}
