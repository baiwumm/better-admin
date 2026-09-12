import type { MenuNode } from '@/lib/api-types'

import { CONSOLE_MENU_NODE, fetchMenusFromApi } from '@/lib/menu-seed'

export { CONSOLE_MENU_NODE }

/**
 * 获取「当前用户可见」的菜单树（权限过滤后，供侧边栏与菜单路由守卫使用）。
 *
 * 数据来源：后端 GET /api/menus（返回 MenuNode[]，含 userPermissions）。
 * 前端合并固定「控制台」节点到最前（保证每个登录用户都有、不受接口控制）。
 *
 * ⚠️ M0 现状：服务端仅实现认证 4 端点（nuxt-plan.md M0 范围），/menus 属于
 * M1（menus-service 移植）。当前 fetchMenusFromApi 检测到接口不可用时回退
 * 静态种子菜单（menu-seed.ts，结构与 DB seed 菜单树一致），保证布局骨架、
 * 路由守卫第③层（菜单权限判定）与命令面板在 M0 可用；M1 端点就绪后自动切换。
 */
export async function fetchMenus(): Promise<MenuNode[]> {
  const backendMenus = await fetchMenusFromApi()

  return [CONSOLE_MENU_NODE, ...backendMenus]
}
