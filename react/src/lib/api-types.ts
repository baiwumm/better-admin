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

/** 用户关联岗位摘要（契约 v1.6.0） */
export interface UserPostSummary {
  id: string;
  name: string;
  category: PostCategory;
  isMain: boolean;
}

/** 创建用户请求体（契约 v1.4.4：username 创建后不可变更；v1.6.0 组织中心关联字段） */
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

/* ---------------------------------------------------------------------------
 * 组织中心（契约 v1.6.0 阶段 1/2，/org/*）
 * ------------------------------------------------------------------------- */

/** 组织状态（depts.status / posts.status） */
export type DeptStatus = "enabled" | "disabled";

/** 组织实体（/org/depts，含联查摘要） */
export interface Dept {
  id: string;
  parentId: string | null;
  name: string;
  code: string | null;
  leaderId: string | null;
  /** 负责人姓名（left join 未删除 users.display_name） */
  leaderName: string | null;
  /** 同级排序号，数字越大越靠前 */
  sort: number;
  status: DeptStatus;
  childCount: number;
  postCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 组织树节点（/org/depts/tree） */
export interface DeptTreeNode {
  id: string;
  parentId: string | null;
  name: string;
  code: string | null;
  /** 负责人用户 ID（契约 v1.6.0 补充；编辑弹窗回显负责人需要） */
  leaderId: string | null;
  leaderName: string | null;
  sort: number;
  status: DeptStatus;
  children: DeptTreeNode[];
}

/** 创建组织请求体（parentId 为 null 表示顶级组织） */
export interface DeptCreateInput {
  name: string;
  code?: string | null;
  parentId?: string | null;
  leaderId?: string | null;
  sort?: number;
  status?: DeptStatus;
}

/** 更新组织请求体（parentId 语义：缺省不改；null 移为顶级；非 null 移到该组织下） */
export interface DeptUpdateInput {
  name?: string;
  code?: string | null;
  parentId?: string | null;
  leaderId?: string | null;
  sort?: number;
  status?: DeptStatus;
}

/** 拖拽排序单项（PATCH /org/depts/sort） */
export interface DeptSortItem {
  id: string;
  parentId?: string | null;
  sort?: number;
}

/** 岗位类别（posts.category，契约 v1.6.0） */
export type PostCategory = "management" | "professional" | "production";

/** 岗位实体（/org/posts，含所属组织路径与在职人数；契约 v1.6.0） */
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

/** 创建岗位请求体 */
export interface PostCreateInput {
  name: string;
  deptId: string;
  category: PostCategory;
  rank?: string;
  status?: DeptStatus;
}

/** 更新岗位请求体（字段缺省表示不修改） */
export interface PostUpdateInput {
  name?: string;
  deptId?: string;
  category?: PostCategory;
  rank?: string;
  status?: DeptStatus;
}

/** 在职状态（users.employment_status，契约 v1.6.0；与账号启停 status 正交） */
export type EmploymentStatus = "employed" | "resigned";

/** 人员通讯录条目（/org/directory 与 /org/posts/:id/members 共用；契约 v1.6.0） */
export interface DirectoryEntry {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  employeeNo: string | null;
  deptId: string | null;
  /** 所属组织完整路径，如「集团/技术部/前端组」 */
  deptPath: string | null;
  mainPostId: string | null;
  mainPostName: string | null;
  phone: string | null;
  email: string | null;
  /** 入职日期（YYYY-MM-DD，可空） */
  entryDate: string | null;
  employmentStatus: EmploymentStatus;
}

/* ---------------------------------------------------------------------------
 * 公告 + 站内信（契约 v1.7.0 阶段 3，/notices /notifications）
 * ------------------------------------------------------------------------- */

/** 发布范围类型（dept 按组织 / post 按岗位 / user 按具体人员） */
export type NoticeScopeType = "dept" | "post" | "user";

/** 公告状态：draft（含定时未到）/ published / withdrawn（撤回） */
export type NoticeStatus = "draft" | "published" | "withdrawn";

/** 发布范围单项 */
export interface NoticeScope {
  scopeType: NoticeScopeType;
  targetId: string;
  /** 目标展示名（列表与详情接口均回填；目标已删除时为 null） */
  targetName: string | null;
}

/** 公告实体（/notices，管理列表与我的公告共用；契约 v1.7.0） */
export interface Notice {
  id: string;
  title: string;
  /** 富文本内容（Tiptap HTML；列表不含，详情返回） */
  content?: string;
  publisherId: string | null;
  publisherName: string | null;
  /** 发布人邮箱（发布人被删除时为 null） */
  publisherEmail: string | null;
  /** 发布人头像（发布人被删除时为 null） */
  publisherAvatar: string | null;
  isTop: boolean;
  status: NoticeStatus;
  /** 发布时间（定时发布为计划时间） */
  publishTime: string;
  /** 范围目标条数（详情返回；列表为 undefined） */
  scopeCount?: number;
  /** 范围明细（列表接口返回，targetName 已回填；内容不随列表返回） */
  scopes?: NoticeScope[];
  /** 已读人数 */
  readCount: number;
  /** 范围内总人数（去重） */
  totalCount: number;
  /** 已读率 0-100；totalCount 为 0 时 null */
  readRate: number | null;
  createdAt: string;
  updatedAt: string;
}

/** 公告详情（Notice 全字段 + 范围明细） */
export interface NoticeDetail extends Notice {
  scopes: NoticeScope[];
}

/** 创建公告请求体（publishTime 缺省 = 立即发布；未来时间 = 定时草稿） */
export interface NoticeCreateInput {
  title: string;
  content: string;
  scopeTargets: NoticeScope[];
  isTop?: boolean;
  publishTime?: string | null;
}

/** 更新公告请求体（缺省表示不修改；scopeTargets 为全量替换） */
export interface NoticeUpdateInput {
  title?: string;
  content?: string;
  scopeTargets?: NoticeScope[];
  isTop?: boolean;
  publishTime?: string | null;
}

/** 已读/未读名单条目（/notices/:id/read-stats） */
export interface NoticeReadStatEntry {
  userId: string;
  displayName: string;
  username: string;
  avatar: string | null;
  deptPath: string | null;
  mainPostName: string | null;
  employmentStatus: EmploymentStatus;
  /** 首次阅读时间（未读 Tab 为 null） */
  readAt: string | null;
}

/** 站内信通知（/notifications，铃铛数据源） */
export interface AppNotification {
  id: string;
  type: "notice_publish" | "notice_remind" | "system";
  title: string;
  content: string | null;
  /** 点击跳转的前端路由 */
  link: string | null;
  /** 已读时间；null = 未读 */
  readAt: string | null;
  createdAt: string;
}
