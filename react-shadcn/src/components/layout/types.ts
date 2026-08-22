import { type LinkProps } from '@tanstack/react-router'

type User = {
  name: string
  email: string
  avatar: string
}

type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ElementType
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
  /** 菜单树节点配置的默认展开（仅父级生效） */
  defaultOpen?: boolean
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & {
    url: LinkProps['to'] | (string & {})
    defaultOpen?: boolean
  })[]
  url?: never
  /** 菜单树节点配置的默认展开 */
  defaultOpen?: boolean
}

type NavItem = NavCollapsible | NavLink

/** 侧边栏菜单树（与菜单管理结构一致，直接递归渲染，无分组标题） */
type NavTree = NavItem[]

type NavGroup = {
  title: string
  items: NavItem[]
}

type SidebarData = {
  user: User
  navGroups: NavGroup[]
}

export type { SidebarData, NavGroup, NavItem, NavCollapsible, NavLink, NavTree }
