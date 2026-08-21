import { KeyRound } from 'lucide-react'
import { PlaceholderPage } from '@/components/layout/placeholder-page'

export function PermissionsPage() {
  return (
    <PlaceholderPage
      title='权限管理'
      description='维护权限点列表，支持权限的创建、编辑、删除与分配。'
      icon={KeyRound}
    />
  )
}
