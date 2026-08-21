import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

/**
 * Header 右侧统一操作区：搜索 / 主题 / 配置 / 用户。
 * 所有业务页面统一使用，避免重复。
 */
export function HeaderActions() {
  return (
    <>
      <Search className='me-auto' />
      <ThemeSwitch />
      <ConfigDrawer />
      <ProfileDropdown />
    </>
  )
}
