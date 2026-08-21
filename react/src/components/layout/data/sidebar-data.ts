import {
  LayoutDashboard,
  KeyRound,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: '管理员',
    email: 'admin@better-admin.local',
    avatar: '',
  },
  navGroups: [
    {
      title: '概览',
      items: [
        {
          title: '仪表盘',
          url: '/',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: '系统管理',
      items: [
        {
          title: '用户管理',
          url: '/users',
          icon: Users,
        },
        {
          title: '角色管理',
          url: '/roles',
          icon: ShieldCheck,
        },
        {
          title: '权限管理',
          url: '/permissions',
          icon: KeyRound,
        },
        {
          title: '菜单管理',
          url: '/menus',
          icon: Menu,
        },
        {
          title: '日志',
          url: '/logs',
          icon: ScrollText,
        },
      ],
    },
    {
      title: '系统设置',
      items: [
        {
          title: '系统设置',
          url: '/settings',
          icon: Settings,
        },
      ],
    },
  ],
}
