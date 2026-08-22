import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@/lib/api-client'
import {
  type ApiError,
  type AuthUser,
  type LoginResponse,
} from '@/lib/api-types'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  getMe: () => Promise<void>
  setUser: (user: AuthUser | null) => void
  resetAuth: () => void
}

function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true })
        try {
          const res = (await apiClient.post('/auth/login', {
            username,
            password,
          })) as { data: LoginResponse }
          localStorage.setItem('accessToken', res.data.accessToken)
          localStorage.setItem('refreshToken', res.data.refreshToken)
          set({
            user: res.data.user,
            accessToken: res.data.accessToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          // 登出接口强制鉴权：携带 accessToken 并记录登出日志
          await apiClient.post('/auth/logout')
        } catch (e) {
          // 忽略登出失败（Token 已失效等），仍然清理本地状态
          void e
        }
        clearTokens()
        set({ user: null, accessToken: null, isAuthenticated: false })
        window.location.href = '/sign-in'
      },

      getMe: async () => {
        try {
          const res = (await apiClient.get('/auth/me')) as {
            data: AuthUser
          }
          set({ user: res.data, isAuthenticated: true })
        } catch (error) {
          const err = error as { response?: { data?: ApiError } }
          // 401 由拦截器处理跳转；其他错误静默清除登录态
          if (err.response?.data?.code !== 'UNAUTHORIZED') {
            set({ user: null, isAuthenticated: false })
          }
        }
      },

      setUser: (user) => set({ user }),

      resetAuth: () => {
        clearTokens()
        set({ user: null, accessToken: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
