import axios from 'axios'

/**
 * 全局 API Client（axios 实例）。
 * - baseURL 来自 VITE_API_BASE_URL，指向 NestJS 后端（/api 前缀）。
 * - 请求拦截器：从 localStorage 注入 accessToken。
 * - 响应拦截器：直接解构返回 response.data（统一响应体 {data, pagination?}），
 *   401 时清除本地 Token 并跳转登录页。
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// 请求拦截器：注入 Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：解构 data + 401 处理
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error?.response?.status === 401) {
      const url: string | undefined = error.config?.url
      // 登录接口 401 表示账号密码错误，交给调用方展示错误信息，不做跳转
      const isLoginRequest =
        typeof url === 'string' && url.includes('/auth/login')
      if (!isLoginRequest) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/sign-in'
      }
    }
    return Promise.reject(error)
  }
)
