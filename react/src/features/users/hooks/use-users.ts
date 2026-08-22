import { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import {
  type ApiError,
  type ApiListEnvelope,
  type ApiEnvelope,
} from '@/lib/api-types'
import {
  type User,
  type UserCreateInput,
  type UserUpdateInput,
} from '../data/schema'

export interface UserListParams {
  page: number
  pageSize: number
  search?: string
  status?: 'active' | 'disabled'
  sort?: string
  order?: 'asc' | 'desc'
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiError | undefined
    if (data?.message) return data.message
  }
  return fallback
}

/** 用户列表（服务端分页 + 搜索 + 状态过滤） */
export const useUsers = (params: UserListParams) => {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const response = (await apiClient.get('/users', {
        params,
      })) as ApiListEnvelope<User>
      return response
    },
  })
}

/** 创建用户 */
export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UserCreateInput) => {
      const payload = {
        username: input.username,
        displayName: input.displayName,
        email: input.email,
        password: input.password,
        status: input.status,
      }
      return apiClient.post('/users', payload) as Promise<ApiEnvelope<User>>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('用户创建成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '创建失败'))
    },
  })
}

/** 编辑用户 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserUpdateInput }) =>
      apiClient.put(`/users/${id}`, input) as Promise<ApiEnvelope<User>>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('用户更新成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '更新失败'))
    },
  })
}

/** 删除单个用户 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('用户删除成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '删除失败'))
    },
  })
}

/** 批量删除用户（DELETE /users?ids=id1,id2） */
export const useBatchDeleteUsers = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiClient.delete('/users', { params: { ids: ids.join(',') } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('批量删除成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '批量删除失败'))
    },
  })
}

/** 重置用户密码 */
export const useResetPassword = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      apiClient.post(`/users/${id}/reset-password`, { newPassword }) as Promise<
        ApiEnvelope<null>
      >,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('密码重置成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '密码重置失败'))
    },
  })
}

/** 启用 / 停用用户 */
export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: 'active' | 'disabled'
    }) =>
      apiClient.put(`/users/${id}/status`, { status }) as Promise<
        ApiEnvelope<User>
      >,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('用户状态更新成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '状态更新失败'))
    },
  })
}

/** 批量启用 / 停用用户（后端无批量状态接口，逐用户调用 /users/:id/status） */
export const useBatchUpdateUserStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      items: { id: string; status: 'active' | 'disabled' }[]
    ) => {
      await Promise.all(
        items.map(({ id, status }) =>
          apiClient.put(`/users/${id}/status`, { status })
        )
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('批量状态更新成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '批量状态更新失败'))
    },
  })
}
