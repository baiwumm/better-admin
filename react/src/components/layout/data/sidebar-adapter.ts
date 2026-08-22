import { type MenuNode } from '@/lib/api-types'
import { type NavGroup, type NavItem, type NavTree } from '../types'
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

/**
 * 将后端菜单树直接映射为侧边栏导航树（与菜单管理结构一致）。
 * - 有子级的节点 → 可折叠父级（NavCollapsible），子级递归映射；
 * - 叶子节点 → 链接项（NavLink）；
 * - defaultOpen 取自菜单节点的 defaultOpen 配置（未配置则默认折叠）。
 * 与 adaptMenuTreeToSidebar 不同：本函数保留菜单树的层级，不摊平成分组。
 */
function nodeToNavTreeItem(node: MenuNode): NavItem {
  const children = (node.children ?? []).filter(
    (c) => !c.hideInMenu && c.enabled
  )
  const base = {
    title: node.label,
    icon: getMenuIcon(node.icon),
    defaultOpen: node.defaultOpen,
  }
  if (children.length > 0) {
    return {
      ...base,
      items: children
        .slice()
        .sort((a, b) => a.sort - b.sort)
        .map(nodeToNavTreeItem) as NavItem[],
    }
  }
  return {
    ...base,
    url: node.to || '/',
  }
}

export function adaptMenuTreeToNavItems(nodes: MenuNode[]): NavTree {
  return filterTree(nodes)
    .filter((node) => {
      // 过滤掉「无子级且本身被隐藏/禁用」的孤立节点（filterTree 已处理大部分）
      const children = (node.children ?? []).filter(
        (c) => !c.hideInMenu && c.enabled
      )
      return children.length > 0 || (!node.hideInMenu && node.enabled)
    })
    .map(nodeToNavTreeItem)
}
