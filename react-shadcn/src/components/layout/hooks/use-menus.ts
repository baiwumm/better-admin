import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { type ApiEnvelope, type MenuNode } from '@/lib/api-types'

/**
 * 获取菜单树（GET /api/menus）。
 * 登录态返回每个菜单对应当前用户的 userPermissions（bigint 字符串）。
 */
export const useMenus = () => {
  return useQuery({
    queryKey: ['menus'],
    queryFn: async () => {
      const response = (await apiClient.get('/menus')) as ApiEnvelope<
        MenuNode[]
      >
      return response.data
    },
    staleTime: 60_000,
  })
}
