import type { MenuNode } from '@/lib/api-types'

import { fetchApi } from '@/lib/api-client'

/**
 * M0 静态种子菜单（nuxt-plan.md M0 范围说明）：
 * 服务端 /menus 端点属 M1（menus-service 移植），M0 阶段以此静态树驱动
 * 侧边栏 / 守卫菜单权限层 / 命令面板；结构与 nest/src/db/seed.ts 的菜单树
 * 一致（i18nKey / 图标 / 层级），M1 端点就绪后删除本文件并恢复直接调用。
 */

/** 固定「控制台」菜单节点：写死、不受后端菜单接口控制、登录即可访问。
 * 始终位于菜单树最前（见 fetchMenus 合并逻辑），to 指向首页 "/"。 */
export const CONSOLE_MENU_NODE: MenuNode = {
  id: 'console',
  label: '控制台',
  // 渲染层优先按 i18nKey 取词（menu.pageTitle.*），label 仅作无翻译时的回退
  i18nKey: 'menu.pageTitle.console',
  icon: 'layout-dashboard',
  to: '/',
  sort: 0,
  keepAlive: false,
  hideInMenu: false,
  enabled: true,
  defaultOpen: false,
  // 全 1 掩码：任何登录用户都可见（前端兜底，不依赖后端下发）
  permissions: '9223372036854775807',
  userPermissions: '9223372036854775807'
}

/** 全量授权位（超级管理员掩码正数表示），静态菜单所有节点可见。 */
const ALL_BITS = '9223372036854775807'

function leaf(
  id: string,
  i18nKey: string,
  label: string,
  icon: string,
  to: string,
  sort: number
): MenuNode {
  return {
    id,
    label,
    i18nKey,
    icon,
    to,
    sort,
    keepAlive: false,
    hideInMenu: false,
    enabled: true,
    defaultOpen: false,
    permissions: ALL_BITS,
    userPermissions: ALL_BITS
  }
}

function group(
  id: string,
  i18nKey: string,
  label: string,
  icon: string,
  sort: number,
  children: MenuNode[]
): MenuNode {
  return {
    id,
    label,
    i18nKey,
    icon,
    to: null,
    sort,
    keepAlive: false,
    hideInMenu: false,
    enabled: true,
    defaultOpen: true,
    permissions: ALL_BITS,
    // 分组节点自身不声明权限位（与后端 seed 口径一致，见 menu-fetch 教训说明）
    userPermissions: '0',
    children
  }
}

/** 静态种子菜单树（对齐 nest seed 菜单：系统管理 + 组织中心两组）。 */
export const SEED_MENUS: MenuNode[] = [
  group(
    'system',
    'menu.system',
    '系统管理',
    'settings-2',
    1,
    [
      leaf('users', 'menu.users', '用户管理', 'users', '/settings/users', 1),
      leaf('roles', 'menu.roles', '角色管理', 'shield', '/settings/roles', 2),
      leaf(
        'permissions',
        'menu.permissions',
        '权限管理',
        'key-round',
        '/settings/permissions',
        3
      ),
      leaf('menus', 'menu.menus', '菜单管理', 'menu', '/settings/menus', 4),
      leaf('dicts', 'menu.dicts', '字典管理', 'book-text', '/settings/dicts', 5),
      leaf('logs', 'menu.logs', '日志管理', 'scroll-text', '/settings/logs', 6)
    ]
  ),
  group(
    'org',
    'menu.org',
    '组织中心',
    'building-2',
    2,
    [
      leaf('depts', 'menu.depts', '组织管理', 'network', '/org/depts', 1),
      leaf('posts', 'menu.posts', '岗位管理', 'briefcase', '/org/posts', 2),
      leaf(
        'directory',
        'menu.directory',
        '人员通讯录',
        'book-user',
        '/org/directory',
        3
      ),
      leaf(
        'notices',
        'menu.notices',
        '公告管理',
        'megaphone',
        '/org/notices',
        4
      ),
      leaf(
        'org-chart',
        'menu.org-chart',
        '架构图谱',
        'git-fork',
        '/org/chart',
        5
      )
    ]
  )
]

/**
 * M0 菜单获取：尝试 GET /menus（M1 起可用，附带「控制台」合并语义由
 * fetchMenus 承担）；M0 阶段端点不存在（404）时回退静态种子树。
 */
export async function fetchMenusFromApi(): Promise<MenuNode[]> {
  try {
    return await fetchApi<MenuNode[]>('/menus')
  } catch {
    // M0：/menus 未实现（404）或请求失败 → 静态种子菜单兜底
    // （与 Vue 端「菜单加载失败回退控制台」口径一致，仅 M0 期间存在）
    return SEED_MENUS
  }
}
