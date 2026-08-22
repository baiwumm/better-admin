import { useMemo } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { AppTitle } from './app-title'
import { adaptMenuTreeToSidebar } from './data/sidebar-adapter'
import { sidebarData } from './data/sidebar-data'
import { useMenus } from './hooks/use-menus'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

/** 侧边栏菜单加载骨架屏（表示正在加载权限/菜单） */
function SidebarMenuSkeleton() {
  return (
    <div className='flex flex-col gap-5 px-4 py-6'>
      {Array.from({ length: 2 }).map((_, section) => (
        <div key={section} className='flex flex-col gap-1'>
          {/* 段标题 */}
          <Skeleton className='mb-2 h-3 w-14 rounded-sm' />
          {/* 父级菜单 */}
          <div className='flex items-center gap-2 py-1.5'>
            <Skeleton className='size-4 shrink-0 rounded-sm' />
            <Skeleton className='h-4 w-24 rounded-sm' />
            <Skeleton className='ms-auto size-3 shrink-0 rounded-sm' />
          </div>
          {/* 子菜单（缩进，带左侧引导线） */}
          <div className='mx-3.5 flex flex-col gap-1.5 border-s border-sidebar-border px-2.5 py-1'>
            {Array.from({ length: 4 }).map((_, sub) => (
              <div key={sub} className='flex items-center gap-2 py-0.5'>
                <Skeleton className='size-3 shrink-0 rounded-sm' />
                <Skeleton className='h-3.5 w-3/4 rounded-sm' />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { data: menuTree, isLoading, isError } = useMenus()
  const storeUser = useAuthStore((state) => state.user)

  // 加载中 / 失败 → 骨架或空态（不回退静态菜单，避免泄露未授权菜单）；
  // 加载成功有菜单 → 角色关联菜单；加载成功空树 → 无权限空态。
  const { navGroups, noMenu } = useMemo(() => {
    if (menuTree && menuTree.length > 0) {
      return { navGroups: adaptMenuTreeToSidebar(menuTree), noMenu: false }
    }
    return { navGroups: [], noMenu: true }
  }, [menuTree])

  const user = storeUser
    ? { name: storeUser.displayName, email: storeUser.username, avatar: '' }
    : sidebarData.user

  const renderContent = () => {
    if (isLoading) return <SidebarMenuSkeleton />
    if (isError || noMenu) {
      return (
        <div className='flex flex-col items-center gap-2 px-4 py-10 text-center text-muted-foreground'>
          <ShieldAlert className='size-8' />
          <p className='text-sm'>
            {isError ? '菜单加载失败' : '暂无任何菜单权限'}
          </p>
          <p className='text-xs'>
            {isError
              ? '请刷新重试或联系管理员'
              : '请联系管理员为你分配角色与菜单权限。'}
          </p>
        </div>
      )
    }
    return navGroups.map((props) => <NavGroup key={props.title} {...props} />)
  }

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>{renderContent()}</SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
