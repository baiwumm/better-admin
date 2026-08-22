import { Outlet } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

/**
 * 系统设置父级布局。
 * 子菜单（个人资料 / 账户 / 外观 / 通知 / 显示）已在主侧边栏直接展示，
 * 此处不再渲染内部 tab 导航，仅提供页面外壳与 Outlet。
 */
export function Settings() {
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed>
        <div className='flex w-full overflow-y-hidden p-1'>
          <Outlet />
        </div>
      </Main>
    </>
  )
}
