/**
 * 与 nest/openapi/openapi.yaml (v1.1.0) 对齐的 API 响应类型。
 * 所有字段命名保持 camelCase，与 Contract 一致。
 */

/** 统一响应体（后端全局拦截器：{data} 或 {data, pagination}） */
export interface ApiEnvelope<T> {
  data: T
}

export interface ApiListEnvelope<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

/** 后端错误响应：{code, message} */
export interface ApiError {
  code: string
  message: string
}

/** 认证用户（/auth/login、/auth/me 返回） */
export interface AuthUser {
  id: string
  username: string
  displayName: string
  roles: string[]
  /** bigint 位掩码字符串（超级管理员为 9223372036854775807） */
  permissions: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

/** 角色（/roles） */
export interface Role {
  id: string
  name: string
  code: string
  description: string | null
  enabled: boolean
  sort: number
  createdAt: string
  updatedAt: string
}

/** 角色 - 菜单授权项（/roles/:id/menus） */
export interface RoleMenuPermission {
  menuId: string
  permissions: string
}

export interface RoleMenusResponse {
  roleId: string
  menus: RoleMenuPermission[]
}

/** 更新角色 - 菜单授权请求体（PUT /roles/:id/menus） */
export interface RoleMenusUpdateRequest {
  menus: RoleMenuPermission[]
}

/** 菜单节点（/menus 树） */
export interface MenuNode {
  id: string
  label: string
  i18nKey?: string | null
  icon: string
  to?: string | null
  parentId?: string | null
  sort: number
  keepAlive: boolean
  hideInMenu: boolean
  enabled: boolean
  defaultOpen: boolean
  target: '_self' | '_blank'
  /** bigint 位掩码字符串 */
  permissions: string
  /** 当前登录用户在此菜单的实际授权位（登录态返回） */
  userPermissions?: string | null
  children?: MenuNode[]
}

/** 权限点（/permissions） */
export interface PermissionItem {
  value: string
  label: string
  bits: number
  icon: string
}

/** 系统设置项（/settings） */
export interface Setting {
  key: string
  value: string | number | boolean | Record<string, unknown> | null
  group: 'basic' | 'user' | 'theme' | 'system'
  description: string | null
}

/** 日志（/logs） */
export interface Log {
  id: string
  type: 'operation' | 'login' | 'api' | 'error'
  userId: string | null
  action: string
  ip: string | null
  userAgent: string | null
  detail: Record<string, unknown> | null
  createdAt: string
}
