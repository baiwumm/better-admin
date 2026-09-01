/**
 * 与 NestJS API（openapi.yaml v1.2.0）对齐的响应类型。
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

/* ---------------------------------------------------------------------------
 * 业务实体类型（与 openapi.yaml v1.2.0 各模块 schema 对齐）
 * ------------------------------------------------------------------------- */

/** 列表通用查询参数（后端各 QueryDTO 均含 page/pageSize，多数含 search） */
export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  [key: string]: unknown;
}

/** 用户状态（users.status） */
export type UserStatus = "active" | "disabled";

/** 用户角色摘要（users 响应内嵌的 roles 数组项） */
export interface UserRoleSummary {
  id: string;
  name: string;
  code: string;
}

/** 用户实体（/users） */
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string | null;
  status: UserStatus;
  tokenVersion: number;
  roles: UserRoleSummary[];
  createdAt: string;
  updatedAt: string;
  /** 最近一次登录成功时间（契约 v1.5.0；从未登录为 null） */
  lastLoginAt: string | null;
  /** 个人网站裸域名（契约 v1.5.2 只读；展示前缀 https:// 由前端拼接） */
  website: string | null;
  /** GitHub 用户名裸值（契约 v1.5.2 只读） */
  githubUsername: string | null;
  /** X（Twitter）用户名裸值（契约 v1.5.2 只读） */
  xUsername: string | null;
}

/** 创建用户请求体（契约 v1.4.4：username 创建后不可变更） */
export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  displayName: string;
  status?: UserStatus;
  roleIds: string[];
}

/** 更新用户请求体（契约 v1.4.4：不含 username/password——
 * 用户名创建后锁定，改密走 POST /users/:id/reset-password）。
 * roleIds 传数组（含空数组）为全量替换语义，缺省表示不修改。
 */
export interface UpdateUserInput {
  email?: string;
  displayName?: string;
  avatar?: string | null;
  status?: UserStatus;
  roleIds?: string[];
}

/* ---------------------------------------------------------------------------
 * 我的账户（契约 v1.5.0，/account/* 自助接口）
 * ------------------------------------------------------------------------- */

/** 我的账户详情（GET /account/profile） */
export interface AccountProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string | null;
  phone: string | null;
  /** 个人标签（自助维护，最多 10 个、每个 ≤20 字符，服务端去重） */
  tags: string[];
  /** 个人网站裸域名（契约 v1.5.2，如 baiwumm.com，不带协议；展示前缀由前端拼接） */
  website: string | null;
  /** GitHub 用户名裸值（契约 v1.5.2；展示前缀 https://github.com/ 由前端拼接） */
  githubUsername: string | null;
  /** X（Twitter）用户名裸值（契约 v1.5.2；展示前缀 https://x.com/ 由前端拼接） */
  xUsername: string | null;
  status: UserStatus;
  roles: UserRoleSummary[];
  createdAt: string;
  updatedAt: string;
  /** 最近一次登录成功时间（从未登录为 null） */
  lastLoginAt: string | null;
}

/** PUT /account/profile 请求体（字段缺省表示不修改） */
export interface UpdateAccountProfileInput {
  displayName?: string;
  /** null 表示清空 */
  phone?: string | null;
  /** 全量替换（空数组清空） */
  tags?: string[];
  /** 个人网站裸域名（null 清空；提交时服务端自动剥 http(s):// 前缀） */
  website?: string | null;
  /** GitHub 用户名裸值（null 清空；服务端自动剥主页前缀） */
  githubUsername?: string | null;
  /** X 用户名裸值（null 清空；服务端自动剥主页前缀） */
  xUsername?: string | null;
}

/** PUT /account/email 请求体（需当前密码确认） */
export interface UpdateAccountEmailInput {
  email: string;
  currentPassword: string;
}

/** PUT /account/password 请求体（成功后全端强制下线，需重新登录） */
export interface UpdateAccountPasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** 角色实体（/roles） */
export interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
  enabled: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

/** 创建/更新角色请求体 */
export interface SaveRoleInput {
  name: string;
  code: string;
  description?: string;
  enabled: boolean;
  sort?: number;
}

/** 角色菜单授权项（PUT /roles/:id/menus 请求体与 GET 响应共用结构） */
export interface RoleMenuGrant {
  menuId: string;
  /** bigint 位掩码字符串：该角色在此菜单的实际授权位 */
  permissions: string;
}

/** 角色菜单授权响应/请求载荷 */
export interface RoleMenusPayload {
  roleId: string;
  menus: RoleMenuGrant[];
}

/** 字典类型（/dict/types） */
export interface DictType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 字典项（/dict/types/:code/items；后端视图不含时间字段） */
export interface DictItem {
  id: string;
  typeCode: string;
  value: string;
  label: string;
  i18nKey: string | null;
  sort: number;
  enabled: boolean;
}

/** 日志类型（logs.type，对应页面 4 个 Tab） */
export type LogType = "operation" | "login" | "api" | "error";

/** 日志实体（/logs，列表与详情同构；v1.4.8 起带操作人摘要） */
export interface Log {
  id: string;
  type: LogType;
  userId: string | null;
  /** 操作人摘要（left join users；用户不存在时为 null） */
  username: string | null;
  displayName: string | null;
  email: string | null;
  avatar: string | null;
  action: string;
  ip: string | null;
  userAgent: string | null;
  detail: unknown;
  createdAt: string;
}
