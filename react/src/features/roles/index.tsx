import { ShieldCheck } from 'lucide-react'
import { PlaceholderPage } from '@/components/layout/placeholder-page'

export function RolesPage() {
  return (
    <PlaceholderPage
      title='角色管理'
      description='管理角色列表并为角色分配权限，是 RBAC 权限模型的核心模块。'
      icon={ShieldCheck}
    />
  )
}
