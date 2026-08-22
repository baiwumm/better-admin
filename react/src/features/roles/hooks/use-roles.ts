import { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import {
  type ApiEnvelope,
  type ApiError,
  type ApiListEnvelope,
  type Role,
  type RoleMenusResponse,
  type RoleMenuPermission,
} from '@/lib/api-types'

export interface RoleListParams {
  page: number
  pageSize: number
  search?: string
}

export interface RoleCreateInput {
  name: string
  code: string
  description?: string
  enabled: boolean
  sort?: number
}

export interface RoleUpdateInput {
  name?: string
  description?: string
  enabled?: boolean
  sort?: number
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiError | undefined
    if (data?.message) return data.message
  }
  return fallback
}

/** 角色列表（服务端分页 + 搜索） */
export const useRoles = (params: RoleListParams) => {
  return useQuery({
    queryKey: ['roles', params],
    queryFn: async () => {
      const response = (await apiClient.get('/roles', {
        params,
      })) as ApiListEnvelope<Role>
      return response
    },
  })
}

/** 创建角色 */
export const useCreateRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RoleCreateInput) =>
      apiClient.post('/roles', input) as Promise<ApiEnvelope<Role>>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success('角色创建成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '创建失败'))
    },
  })
}

/** 编辑角色 */
export const useUpdateRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RoleUpdateInput }) =>
      apiClient.put(`/roles/${id}`, input) as Promise<ApiEnvelope<Role>>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success('角色更新成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '更新失败'))
    },
  })
}

/** 删除角色 */
export const useDeleteRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success('角色删除成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '删除失败'))
    },
  })
}

/** 角色 - 菜单授权列表 */
export const useRoleMenus = (roleId: string | null) => {
  return useQuery({
    queryKey: ['role-menus', roleId],
    enabled: !!roleId,
    queryFn: async () => {
      const response = (await apiClient.get(
        `/roles/${roleId}/menus`
      )) as ApiEnvelope<RoleMenusResponse>
      return response.data
    },
  })
}

/** 更新角色 - 菜单授权 */
export const useUpdateRoleMenus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      roleId,
      menus,
    }: {
      roleId: string
      menus: RoleMenuPermission[]
    }) =>
      apiClient.put(`/roles/${roleId}/menus`, { menus }) as Promise<
        ApiEnvelope<RoleMenusResponse>
      >,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-menus'] })
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('角色授权更新成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '授权更新失败'))
    },
  })
}
