import {
  Bell,
  GitBranchPlus,
  KeyRound,
  LayoutDashboard,
  ListX,
  Menu,
  Monitor,
  Palette,
  PencilLine,
  Plus,
  RotateCcw,
  ScrollText,
  Search,
  Settings,
  Settings2,
  Shield,
  Trash2,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/**
 * 后端菜单 icon 字段为字符串（如 "lucide:users"、"i-lucide-list-x"），
 * 此处映射为 lucide-react 组件；未匹配的 icon 回退为 Menu 图标。
 */
const iconMap: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'settings-2': Settings2,
  settings: Settings,
  users: Users,
  shield: Shield,
  'key-round': KeyRound,
  menu: Menu,
  'scroll-text': ScrollText,
  search: Search,
  plus: Plus,
  'pencil-line': PencilLine,
  'trash-2': Trash2,
  'list-x': ListX,
  'git-branch-plus': GitBranchPlus,
  'rotate-ccw': RotateCcw,
  user: Users,
  'user-cog': Users,
  wrench: Wrench,
  palette: Palette,
  bell: Bell,
  monitor: Monitor,
}

export function getMenuIcon(icon: string | null | undefined): LucideIcon {
  if (!icon) return Menu
  const name = icon.replace(/^lucide:/, '').replace(/^i-lucide-/, '')
  return iconMap[name] ?? Menu
}
