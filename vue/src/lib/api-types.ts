/**
 * 与 NestJS API（openapi.yaml）对齐的响应类型（M0 子集：认证 / 菜单 / 权限）。
 * 字段命名保持 camelCase，与 Contract 一致；后续模块类型随 M1+ 平移补充。
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
  /** 用户邮箱（契约 v1.4.8：前端统一用户信息展示，侧边栏次行） */
  email: string;
  /** 头像 URL（契约 v1.5.0：侧边栏 / 我的账户展示） */
  avatar: string | null;
  /** 电话（契约 v1.5.0） */
  phone: string | null;
  /** 个人标签（契约 v1.5.0，用户在「我的账户」自助维护） */
  tags: string[];
  /** 个人网站裸域名（契约 v1.5.3 只读；展示前缀 https:// 由前端拼接） */
  website: string | null;
  /** GitHub 用户名裸值（契约 v1.5.3 只读） */
  githubUsername: string | null;
  /** X（Twitter）用户名裸值（契约 v1.5.3 只读） */
  xUsername: string | null;
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

/** 刷新响应（v1.2：refreshToken 轮换，旧 token 作废） */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
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

/** 列表通用查询参数（后端各 QueryDTO 均含 page/pageSize，多数含 search） */
export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  [key: string]: unknown;
}
