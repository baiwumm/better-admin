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

/* ---------------------------------------------------------------------------
 * 业务实体类型（与 openapi.yaml 各模块 schema 对齐；M1：用户/角色/组织中心）
 * ------------------------------------------------------------------------- */

/** 用户状态（users.status） */
export type UserStatus = "active" | "disabled";

/** 用户角色摘要（users 响应内嵌的 roles 数组项） */
export interface UserRoleSummary {
  id: string;
  name: string;
  code: string;
}

/** 在职状态（契约 v1.6.0；存量 NULL 按 employed 输出） */
export type EmploymentStatus = "employed" | "resigned";

/** 组织/岗位通用状态 */
export type DeptStatus = "enabled" | "disabled";

/** 岗位类别 */
export type PostCategory = string;

/** 用户岗位摘要（user_posts → posts 联查，主岗在前；契约 v1.6.0） */
export interface UserPostSummary {
  id: string;
  name: string;
  /** 是否主岗 */
  isMain: boolean;
  /** 所属组织完整路径 */
  deptPath?: string;
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
  /** 所属组织 ID / 名称（契约 v1.6.0 组织中心，可空） */
  deptId: string | null;
  deptName: string | null;
  /** 工号（契约 v1.6.0，可空） */
  employeeNo: string | null;
  /** 入职日期（契约 v1.6.0，YYYY-MM-DD，可空） */
  entryDate: string | null;
  /** 在职状态（契约 v1.6.0；存量 NULL 按 employed 输出，与账号启停 status 正交） */
  employmentStatus: EmploymentStatus;
  /** 性别（契约 v1.6.0 阶段 2 补充；male 男 / female 女，null = 未设置） */
  gender: "male" | "female" | null;
  /** 关联岗位（user_posts → posts 联查，主岗在前；契约 v1.6.0） */
  posts: UserPostSummary[];
}

/** 角色（/roles） */
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

/** 组织树节点（GET /org/depts/tree，含停用组织） */
export interface DeptTreeNode {
  id: string;
  parentId: string | null;
  name: string;
  code: string | null;
  /** 负责人用户 ID（契约 v1.6.0 补充；编辑弹窗回显负责人需要） */
  leaderId: string | null;
  leaderName: string | null;
  /** 负责人头像 URL（契约 v1.7.0：图谱卡片展示用） */
  leaderAvatar: string | null;
  sort: number;
  status: DeptStatus;
  children: DeptTreeNode[];
}

/** 岗位（/org/posts） */
export interface Post {
  id: string;
  deptId: string;
  /** 所属组织完整路径，如「集团/技术研发中心/前端开发部」 */
  deptPath: string;
  name: string;
  category: PostCategory;
  /** 岗位职级（P1-P10 / M1-M5），空串表示未设置 */
  rank: string;
  status: DeptStatus;
  /** 在职人数（穿透查看入口） */
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 创建用户请求体 */
export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  displayName: string;
  status?: UserStatus;
  roleIds: string[];
  /** 所属组织（null = 无组织；须存在且启用） */
  deptId?: string | null;
  employeeNo?: string | null;
  /** 入职日期（YYYY-MM-DD） */
  entryDate?: string | null;
  employmentStatus?: EmploymentStatus | null;
  /** 性别（null = 未设置） */
  gender?: "male" | "female" | null;
  /** 关联岗位（user_posts 全量替换；须存在且启用，最多 20 个） */
  postIds?: string[];
  /** 主岗（须在 postIds 中） */
  mainPostId?: string | null;
}

/* ---------------------------------------------------------------------------
 * 角色模块（/roles）
 * ------------------------------------------------------------------------- */

/** 角色创建/编辑载荷（code 创建后锁定，UpdateRoleInput 不含 code） */
export interface SaveRoleInput {
  name: string;
  code: string;
  description?: string;
  enabled: boolean;
  sort?: number;
}

/** 角色-菜单授权记录（位掩码字符串：该角色在此菜单的实际授权位） */
export interface RoleMenuGrant {
  menuId: string;
  permissions: string;
}

/** 角色菜单授权载荷（GET / PUT /roles/:id/menus） */
export interface RoleMenusPayload {
  roleId: string;
  menus: RoleMenuGrant[];
}

/** 更新用户请求体（契约 v1.4.4：不含 username/password——
 * 用户名创建后锁定，改密走 POST /users/:id/reset-password）。
 * roleIds 传数组（含空数组）为全量替换语义，缺省表示不修改。
 * v1.6.0：deptId/employeeNo/entryDate/employmentStatus 为
 * 「undefined 不修改 / null 清空」语义；postIds 同 roleIds 全量替换。
 */
export interface UpdateUserInput {
  email?: string;
  displayName?: string;
  avatar?: string | null;
  status?: UserStatus;
  roleIds?: string[];
  deptId?: string | null;
  employeeNo?: string | null;
  entryDate?: string | null;
  employmentStatus?: EmploymentStatus | null;
  /** 性别（undefined 不修改 / null 清空为未设置） */
  gender?: "male" | "female" | null;
  postIds?: string[];
  mainPostId?: string | null;
}
