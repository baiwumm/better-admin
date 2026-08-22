import { type MenuNode } from '@/lib/api-types'
import { type NavGroup, type NavItem } from '../types'
import { getMenuIcon } from './menu-icon-map'

/**
 * 将后端菜单树（/api/menus）适配为 Sidebar 的 NavGroup 结构。
 *
 * 可见性规则（database-design.md §1.5，RBAC 角色关联过滤）：
 * - 后端已在 GET /api/menus 中按「用户角色关联的 menu_id 集合」过滤，
 *   未关联的菜单节点不会出现在返回树中，前端无需再做角色级过滤；
 * - 前端仅过滤 hideInMenu / enabled=false 的节点；
 * - 按 sort 排序；
 * - 有子级的节点渲染为分组（collapsible），叶子渲染为链接项。
 */
function isVisible(node: MenuNode): boolean {
  if (node.hideInMenu || !node.enabled) return false
  // 已登录可见：后端返回的树即代表该用户角色关联的可见菜单
  return true
}

/**
 * 判断当前用户是否「无任何可见菜单」（如未被分配任何角色）。
 * 空树 → 侧边栏应显示无权限空状态，而不是回退静态菜单。
 */
export function hasNoVisibleMenu(nodes: MenuNode[] | undefined): boolean {
  if (!nodes) return false // 加载中 / 未返回，不算无权限
  return filterTree(nodes).length === 0
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
