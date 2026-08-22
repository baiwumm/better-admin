import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { type ApiEnvelope, type PermissionItem } from '@/lib/api-types'

/** 权限点全量字典（只读） */
export const usePermissionItems = () =>
  useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = (await apiClient.get('/permissions')) as ApiEnvelope<
        PermissionItem[]
      >
      return response.data
    },
  })
