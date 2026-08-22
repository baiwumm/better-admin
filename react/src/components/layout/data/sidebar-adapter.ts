import { type MenuNode } from '@/lib/api-types'
import { type NavGroup, type NavItem } from '../types'
import { getMenuIcon } from './menu-icon-map'

/**
 * 将后端菜单树（/api/menus）适配为 Sidebar 的 NavGroup 结构。
 * - 过滤 hideInMenu / enabled=false 的节点；
 * - 叶子节点按 userPermissions 判断可见性（未声明权限的菜单默认可见）；
 * - 按 sort 排序；
 * - 有子级的节点渲染为分组（collapsible），叶子渲染为链接项。
 */
function isVisible(node: MenuNode): boolean {
  if (node.hideInMenu || !node.enabled) return false
  const declared = BigInt(node.permissions || '0')
  if (declared === BigInt(0)) return true // 未声明按钮权限的菜单：已登录即可见
  const owned = BigInt(node.userPermissions || '0')
  return owned !== BigInt(0)
}

function filterTree(nodes: MenuNode[]): MenuNode[] {
  return nodes
    .filter((node) => {
      if (node.hideInMenu || !node.enabled) return false
      const filteredChildren = node.children?.length
        ? filterTree(node.children)
        : []
      if (filteredChildren.length > 0) return true
      return isVisible(node)
    })
    .sort((a, b) => a.sort - b.sort)
    .map((node) => ({
      ...node,
      children: node.children?.length ? filterTree(node.children) : [],
    }))
}

function nodeToNavItem(node: MenuNode): NavItem {
  return {
    title: node.label,
    url: node.to || '/',
    icon: getMenuIcon(node.icon),
  }
}

export function adaptMenuTreeToSidebar(nodes: MenuNode[]): NavGroup[] {
  return filterTree(nodes).map((node) => {
    const children = node.children ?? []
    return {
      title: node.label,
      items: children.length
        ? children.map(nodeToNavItem)
        : [nodeToNavItem(node)],
    }
  })
}
