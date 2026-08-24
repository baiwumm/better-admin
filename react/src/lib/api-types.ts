/**
 * 与 NestJS API（openapi.yaml v1.1.0）对齐的响应类型。
 * 字段命名保持 camelCase，与 Contract 一致；当前阶段为 Mock 数据，
 * 接入后端后直接复用同一套类型。
 */

/** 统一响应体（后端全局拦截器：{data}） */
export interface ApiEnvelope<T> {
  data: T;
}

/** 列表响应体（后端全局拦截器：{data, pagination}） */
export interface ApiListEnvelope<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

/** 后端错误响应：{code, message} */
export interface ApiError {
  code: string;
  message: string;
}

/** 认证用户（/auth/login、/auth/me 返回） */
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  /**
   * bigint 位掩码（超级管理员全量为 9223372036854775807）。
   * 契约定义为 integer，但实际传输中常以字符串形式下发（避免精度丢失）；
   * 故前端兼容 string | number，解析时统一归一化为 string（见 permission.ts）。
   */
  permissions: string | number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** 菜单节点（/menus 树，路由层的导航数据源） */
export interface MenuNode {
  id: string;
  label: string;
  i18nKey?: string | null;
  icon: string;
  to?: string | null;
  parentId?: string | null;
  sort: number;
  keepAlive: boolean;
  hideInMenu: boolean;
  enabled: boolean;
  defaultOpen: boolean;
  target: "_self" | "_blank";
  /** bigint 位掩码字符串（该菜单所需权限集） */
  permissions: string;
  /** 当前登录用户在此菜单的实际授权位（登录态返回；null 表示未下发） */
  userPermissions?: string | null;
  children?: MenuNode[];
}

/** 权限点（/permissions） */
export interface PermissionItem {
  value: string;
  label: string;
  bits: number;
  icon: string;
}
