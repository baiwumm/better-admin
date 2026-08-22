import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AppTitle } from './app-title'
import { adaptMenuTreeToSidebar } from './data/sidebar-adapter'
import { sidebarData } from './data/sidebar-data'
import { useMenus } from './hooks/use-menus'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { data: menuTree } = useMenus()
  const storeUser = useAuthStore((state) => state.user)

  // 优先使用后端菜单树；加载中 / 失败时回退静态菜单，保证侧边栏始终可用
  const navGroups = useMemo(() => {
    if (menuTree && menuTree.length > 0) {
      return adaptMenuTreeToSidebar(menuTree)
    }
    return sidebarData.navGroups
  }, [menuTree])

  const user = storeUser
    ? { name: storeUser.displayName, email: storeUser.username, avatar: '' }
    : sidebarData.user

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
