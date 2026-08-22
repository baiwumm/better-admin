import { useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { type MenuNode } from '@/lib/api-types'
import { useMenus } from './use-menus'

/**
 * 收集菜单树中所有可达路径（每个节点的 to，过滤空值）。
 */
function collectPaths(nodes: MenuNode[], acc: Set<string> = new Set()): Set<string> {
  for (const node of nodes) {
    if (node.to) acc.add(node.to)
    if (node.children?.length) collectPaths(node.children, acc)
  }
  return acc
}

/**
 * 菜单路由守卫：
 * 菜单加载完成后，若当前 URL 不在用户可见菜单树的可达路径内（且非 /errors 白名单），
 * 重定向到 401 未授权页。
 *
 * - 菜单加载中：不校验（避免误跳，侧边栏此时显示骨架）。
 * - 加载失败：不跳转（空态由侧边栏展示，避免循环重定向）。
 */
export function useMenuRouteGuard() {
  const { data: menuTree, isLoading, isError } = useMenus()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading || isError || !menuTree) return

    // 错误页 / 未授权页等白名单
    if (pathname.startsWith('/errors')) return

    const allowedPaths = collectPaths(menuTree)
    if (!allowedPaths.has(pathname)) {
      void navigate({ to: '/errors/$error', params: { error: 'unauthorized' } })
    }
  }, [menuTree, isLoading, isError, pathname, navigate])
}