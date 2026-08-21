import { Menu } from 'lucide-react'
import { PlaceholderPage } from '@/components/layout/placeholder-page'

export function MenusPage() {
  return (
    <PlaceholderPage
      title='菜单管理'
      description='维护系统菜单结构，支持菜单排序与权限关联。'
      icon={Menu}
    />
  )
}
