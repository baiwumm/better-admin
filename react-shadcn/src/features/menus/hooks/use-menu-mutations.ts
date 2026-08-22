import { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { type ApiEnvelope, type ApiError, type MenuNode } from '@/lib/api-types'
import { useMenus } from '@/components/layout/hooks/use-menus'

export interface MenuCreateInput {
  label: string
  icon: string
  to?: string
  parentId?: string
  sort?: number
  keepAlive?: boolean
  hideInMenu?: boolean
  enabled?: boolean
  defaultOpen?: boolean
  target?: '_self' | '_blank'
  permissions?: string
}

export interface MenuUpdateInput {
  label?: string
  icon?: string
  to?: string | null
  parentId?: string | null
  sort?: number
  keepAlive?: boolean
  hideInMenu?: boolean
  enabled?: boolean
  defaultOpen?: boolean
  target?: '_self' | '_blank'
  permissions?: string
}

export interface AddChildInput {
  label: string
  icon: string
  to?: string
  sort?: number
  permissions?: string
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiError | undefined
    if (data?.message) return data.message
  }
  return fallback
}

function useInvalidateMenus() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['menus'] })
    queryClient.invalidateQueries({ queryKey: ['role-menus'] })
  }
}

export const useCreateMenu = () => {
  const invalidate = useInvalidateMenus()
  return useMutation({
    mutationFn: (input: MenuCreateInput) =>
      apiClient.post('/menus', input) as Promise<ApiEnvelope<MenuNode>>,
    onSuccess: () => {
      invalidate()
      toast.success('菜单创建成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '创建失败'))
    },
  })
}

export const useUpdateMenu = () => {
  const invalidate = useInvalidateMenus()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MenuUpdateInput }) =>
      apiClient.put(`/menus/${id}`, input) as Promise<ApiEnvelope<MenuNode>>,
    onSuccess: () => {
      invalidate()
      toast.success('菜单更新成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '更新失败'))
    },
  })
}

export const useDeleteMenu = () => {
  const invalidate = useInvalidateMenus()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/menus/${id}`),
    onSuccess: () => {
      invalidate()
      toast.success('菜单删除成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '删除失败'))
    },
  })
}

export const useAddChildMenu = () => {
  const invalidate = useInvalidateMenus()
  return useMutation({
    mutationFn: ({
      parentId,
      input,
    }: {
      parentId: string
      input: AddChildInput
    }) =>
      apiClient.post(`/menus/${parentId}/add-child`, input) as Promise<
        ApiEnvelope<MenuNode>
      >,
    onSuccess: () => {
      invalidate()
      toast.success('子菜单创建成功')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, '创建失败'))
    },
  })
}

export { useMenus }
