# Better Admin — Phase 2 API Contract 设计（OpenAPI 方案）

> 本文档是 Phase 2（NestJS + PostgreSQL）的 **API Contract 设计方案**。
> 本阶段**只做方案对齐，不编写 yaml 文件与业务代码**；落地实现在后续步骤。
>
> 定位：本文档定义「Contract 怎么组织、有哪些端点、统一结构、错误码、权限约定」。
> 真源文件：`nest/openapi/openapi.yaml`（后续按本方案生成）。
> 关联：
> - `nest/docs/database-design.md`（Single Source of Schema）
> - `docs/requirements.md` §8（API 返回结构）、§10（模块）
> - `AGENTS.md` 第 6 节（OpenAPI 为 Contract 唯一事实来源）

---

> **文档状态：已落地并随实现持续更新（非立项提案）**。本文件是 API Contract 的**设计说明**，契约真源是 `openapi/openapi.yaml`；
> 文中若残留 Phase 2 立项期的提案口吻（如「仅方案，未开发」「建议 yaml 结构 `version: 1.0.0`」），均为历史记录，按 AGENTS §13 不回改，
> 实际状态以本文件 §9 变更记录与 openapi.yaml 为准。（2026-09-22 标注，见 `docs/launch-audit.md` #55）


## 0. Contract 真源策略（来自 AGENTS.md 第 6 节）

- **OpenAPI 是 API Contract 唯一事实来源（Single Source of Truth）**。
- 采用 **文档优先（Contract-First）**：先定义 `nest/openapi/openapi.yaml`，NestJS 代码按它实现。
- `@nestjs/swagger` 仅用于：开发期从代码生成 OpenAPI 文档（JSON 出口 `/docs-json`，UI 由 Scalar API Reference 在 `/docs` 承载）供联调，**并定期与 `openapi.yaml` 核对一致性**；yaml 为权威，代码偏差以 yaml 为准修正。
- React / Vue 前端请求、Next.js / Nuxt 自有 Server API 均需遵循同一 Contract。

---

## 1. 全局约定

### 1.1 路由前缀与版本

- 所有接口前缀：`/api`（与 requirements §8 示例一致）。
- 初版不加版本号（`/api/...`）；若后续破坏性变更再引入 `/api/v1`。

### 1.2 统一成功响应

> **风格定调（已与用户确认，维持 requirements.md §8.1 流派 A，不改动）：**
> 成功响应**只包裹 `{data}` / `{data, pagination}`**，**不**返回业务 `code`、`msg` 等冗余信封字段。
> 业务状态由 **HTTP 状态码**表达（200=成功，401/403/404/409 等见 §1.5 / §4）；错误结构见 §1.3。
> 成功提示文案（如「删除成功」）由**前端按操作类型自行给出**，后端不在成功响应中回传 `msg`；
> 个别写操作确需后端确认文案时，在 `data` 内局部带 `message` 字段，**不污染全局信封**。
> 禁止采用「HTTP 永远 200 + 业务 code 包裹」的流派 B——其与 requirements 既定契约冲突，且破坏跨技术栈一致性。

**单对象：**
```json
{ "data": { } }
```

**列表（带分页）：**
```json
{
  "data": [ ],
  "pagination": { "page": 1, "pageSize": 20, "total": 100 }
}
```

**分页参数（query）：** `page`(默认 1)、`pageSize`(默认 10，可选 10/20/30/40/50)、`search`、`sort`、`order`。

### 1.3 统一错误响应

```json
{ "code": "USER_NOT_FOUND", "message": "用户不存在" }
```

- `code`：大写蛇形枚举（见 §4 错误码清单）。
- `message`：中文可读信息（可经前端 i18n 映射，但后端直接给中文，前端不强行翻译）。

### 1.4 字段命名

- 请求/响应字段 **camelCase**（与 DB snake_case 解耦，见 database-design.md 约定）。
- 时间字段统一 ISO8601 字符串（如 `2026-08-21T10:00:00.000Z`）。

### 1.5 认证

- `POST /api/auth/login`、`POST /api/auth/refresh` 无需鉴权。
- 其余接口需在 `Authorization: Bearer <accessToken>` 头携带 JWT。
- 无/无效 token → `401 UNAUTHORIZED`。
- 权限不足 → `403 FORBIDDEN`。

---

## 2. 权限与 Contract 的绑定约定

RBAC 采用位掩码（见 database-design.md §1）。API Contract 层面约定：

- 每个**写操作 / 敏感读操作**在 OpenAPI 的 `operationId` 或 `x-permission` 扩展字段标注所需权限位，例如：
  ```yaml
  x-permission: ADD        # 对应 PERMISSIONS.ADD
  ```
- 后端 `@Permissions('ADD')` 装饰器读取该约定，做位掩码 `&` 校验。
- Contract 中列出每个端点所需权限，前端据此预判按钮可用性（与 `menus.permissions` 同源）。
- `PERMISSIONS` 枚举（真源 `src/db/schema/permissions.enum.ts`，与 database-design.md §1.2 一致）含：`SEARCH`(1) / `ADD`(2) / `EDIT`(4) / `DELETE`(8) / `BATCH_DELETE`(16) / `ADD_CHILD`(32) / `RESET`(64) / `RESET_PASSWORD`(128) / `GRANT`(256) / `EXPORT`(512)，共 **10 个权限点**（v0.3 移除 `SETTINGS_UPDATE`、新增 `RESET_PASSWORD`；`RESET` 为前端「重置」按钮显隐位，`RESET_PASSWORD` 守卫重置密码端点；v0.5 新增 `GRANT` 守卫 `PUT /roles/:id/menus`，原为 EDIT；契约 v1.7.1 新增 `EXPORT`，为通讯录 Excel 导出的**前端按钮门控位、无独立端点**，故不出现在 §3 端点清单的 `x-permission` 列，仅人员通讯录菜单声明该位）。

---

## 3. 端点清单（按模块）

> 以下为每个模块的端点、方法、权限位（`x-permission`）。响应结构遵循 §1.2/§1.3。
>
> **规模实测（2026-09-22，逐 path 统计 `openapi/openapi.yaml` v1.14.0）：48 条路径 / 77 个 path+method 操作**；
> 本节 §3.1–§3.16 合计 77 行端点，与之一一对应（§3.7 Settings 已随契约 v1.3 移除，0 端点）。
> 早期版本本节只覆盖到日志模块，我的账户 / 组织中心 / 公告 / 站内信 / Stats / 系统探针为后补小节（对应契约 v1.5.0 → v1.14.0，见 §9 各「**补录**」行）。

### 3.1 认证 `auth`
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 无 | 登录，返回 access/refresh token + 用户信息 |
| POST | `/api/auth/logout` | 无* | 登出（强制鉴权，服务端记录登出日志） |
| POST | `/api/auth/refresh` | 无 | 用 refreshToken 换新 accessToken |
| POST | `/api/auth/demo-login` | 无 | 演示快捷登录（契约 v1.10.0，`kind: admin\|random` 两级随机；`DEMO_MODE` 关闭时 404，响应复用 `LoginResponse`） |
| GET | `/api/auth/me` | 需登录 | 当前用户信息 + 角色 + 权限位聚合 |

> *登出接口**强制鉴权**（须携带 Token）：服务端据此在 `logs` 表记录 `type=login, action=logout` 的登出日志，返回 **204 No Content**（无响应体）；前端同时清除本地 Token。这与「记录操作者身份」的审计需求一致，且符合 REST 注销类操作惯例（无业务数据回传）。

### 3.2 权限字典 `permissions`
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/permissions` | 需登录 | 返回 `PERMISSIONS` 全量枚举（value/label/bits/icon） |

### 3.3 用户 `users`
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/users` | SEARCH | 列表（分页 + search + status 过滤） |
| GET | `/api/users/:id` | SEARCH | 详情 |
| POST | `/api/users` | ADD | 创建 |
| PUT | `/api/users/:id` | EDIT | 编辑 |
| DELETE | `/api/users/:id` | DELETE | 删除（软删） |
| DELETE | `/api/users?ids=id1,id2` | BATCH_DELETE | 批量删除（逗号分隔 ID；若 URL 超长降级为 `POST /api/users/batch-delete` 传 ids 数组，初版统一用 DELETE+Query） |
| POST | `/api/users/:id/reset-password` | RESET_PASSWORD | 重置密码（初版由 `RESET` 位覆盖，契约 v1.3 起独立为 `RESET_PASSWORD`(128)；v1.8.0 起新密码须 8-20 位且不含用户名，否则 400 `PASSWORD_CONTAINS_USERNAME` / `PASSWORD_SAME_AS_OLD`） |
| PUT | `/api/users/:id/status` | EDIT | 启用/停用 |

### 3.4 角色 `roles`
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/roles` | SEARCH | 列表（分页 + search） |
| GET | `/api/roles/:id` | SEARCH | 详情 |
| POST | `/api/roles` | ADD | 创建 |
| PUT | `/api/roles/:id` | EDIT | 编辑 |
| DELETE | `/api/roles/:id` | DELETE | 删除 |
| GET | `/api/roles/:id/users` | SEARCH | 角色关联用户名单分页（契约 v1.13.0，在职且未删除，响应 `DirectoryEntry[]`，过滤口径同 `/org/posts/:id/members`） |
| GET | `/api/roles/:id/menus` | SEARCH | 该角色菜单授权（含每菜单 permissions 位） |
| PUT | `/api/roles/:id/menus` | GRANT | 更新角色菜单授权（role_menus.permissions 位；初版 EDIT，契约 v1.4.4 起收敛为 `GRANT`(256)） |

### 3.5 菜单 `menus`
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/menus` | NONE（仅登录） | 菜单树（可见性按当前用户角色关联过滤，登录态下附 userPermissions 实际位） |
| GET | `/api/menus/tree` | SEARCH | 管理用全量菜单树（不做角色可见性过滤，含停用 / 隐藏节点；契约 v1.3 新增，支持 search 模糊与 order 排序方向） |
| GET | `/api/menus/:id` | SEARCH | 详情 |
| POST | `/api/menus` | ADD | 创建（支持 parentId 子树） |
| PUT | `/api/menus/:id` | EDIT | 编辑 |
| DELETE | `/api/menus/:id` | DELETE | 删除 |
| POST | `/api/menus/:id/add-child` | ADD_CHILD | 新增子级 |

### 3.6 字典 `dict`
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/dict/types` | SEARCH | 字典类型列表 |
| GET | `/api/dict/types/:code` | SEARCH | 字典类型详情 |
| GET | `/api/dict/types/:code/items` | SEARCH | 某字典项列表（支持 ?lang 仅前端用，后端返回 label + i18nKey） |
| POST | `/api/dict/types` | ADD | 创建字典类型 |
| PUT | `/api/dict/types/:code` | EDIT | 编辑 |
| DELETE | `/api/dict/types/:code` | DELETE | 删除 |
| POST | `/api/dict/types/:code/items` | ADD | 新增字典项 |
| PUT | `/api/dict/items/:id` | EDIT | 编辑字典项 |
| DELETE | `/api/dict/items/:id` | DELETE | 删除字典项 |

### 3.7 系统设置 `settings` — 已移除（v0.3）
> `/api/settings` 系列端点与 `SETTINGS_UPDATE` 权限位已随契约 v1.3 整体移除
> （详见 database-design.md §2.8 / 变更记录）。

### 3.8 日志 `logs`
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/logs` | SEARCH | 列表（分页 + ?type 过滤 operation/login/api/error；契约 v1.4.8 起附操作人摘要 username / displayName / email / avatar） |
| GET | `/api/logs/:id` | SEARCH | 详情 |
| DELETE | `/api/logs/:id` | DELETE | 删除单条 |
| DELETE | `/api/logs?ids=id1,id2` | BATCH_DELETE | 批量删除（契约 v1.4.8，与 `/api/users?ids=` 同口径；任一 ID 无效整体 400 `INVALID_OPERATION`，日志无软删） |

> 日志为只读为主；写操作由系统在业务动作时自动插入，不提供手动创建端点。

### 3.9 我的账户 `account`（契约 v1.5.0）
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/account/profile` | 需登录 | 当前用户账户详情（v1.5.2 起含个人链接三字段 website / githubUsername / xUsername） |
| PUT | `/api/account/profile` | 需登录 | 改基本信息（displayName / phone / tags；phone 自契约 v1.8.1 收紧为 11 位大陆手机号） |
| PUT | `/api/account/email` | 需登录 | 改邮箱，须 currentPassword 确认；冲突 409 `EMAIL_EXISTS`、密码不符 400 `CURRENT_PASSWORD_INCORRECT` |
| PUT | `/api/account/password` | 需登录 | 改密码，须 currentPassword；成功后 tokenVersion+1 全端强制下线（v1.8.0 起与旧密码相同返回 400 `PASSWORD_SAME_AS_OLD`） |
| POST | `/api/account/avatar` | 需登录 | 头像上传（multipart，服务端中转写入 Supabase Storage bucket `avatars`；≤2MB，webp/png/jpeg） |
| DELETE | `/api/account/avatar` | 需登录 | 删除头像（契约 v1.5.1；置空 users.avatar 并尽力删 Storage 对象） |

> 本模块为自助接口：仅 `AuthGuard`、**不走 `PermissionsGuard`**（yaml 中 `x-permission: NONE`），故无按钮位。

### 3.10 组织管理 `depts`（契约 v1.6.0）
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/org/depts/tree` | SEARCH | 组织树全量（未删除；停用由前端置灰；上级选择 / 公告范围 / 通讯录筛选复用） |
| GET | `/api/org/depts` | SEARCH | 组织列表分页（传 parentId 只返回直接下级） |
| POST | `/api/org/depts` | ADD | 新增组织 |
| PATCH | `/api/org/depts/sort` | EDIT | 拖拽排序（同级调序 / 跨级移动，items ≤200；整批校验，任一 ID 无效即全回滚） |
| GET | `/api/org/depts/:id` | SEARCH | 组织详情 |
| PUT | `/api/org/depts/:id` | EDIT | 编辑组织 |
| DELETE | `/api/org/depts/:id` | DELETE | 删除（软删；三级校验按序阻断 `DEPT_HAS_CHILDREN` / `DEPT_HAS_POSTS` / `DEPT_HAS_ACTIVE_USERS`） |

### 3.11 岗位管理 `posts`（契约 v1.6.0）
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/org/posts` | SEARCH | 岗位列表分页 |
| POST | `/api/org/posts` | ADD | 新增岗位 |
| GET | `/api/org/posts/:id` | SEARCH | 岗位详情 |
| PUT | `/api/org/posts/:id` | EDIT | 编辑岗位 |
| DELETE | `/api/org/posts/:id` | DELETE | 删除（软删，同步清理 user_posts；在职人数 > 0 时 409 `POST_HAS_ACTIVE_USERS`） |
| GET | `/api/org/posts/:id/members` | SEARCH | 岗位在职人员名单（在职人数穿透，过滤 employed 且未删除） |

### 3.12 人员通讯录 `directory`（契约 v1.6.0）
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/org/directory` | SEARCH | 全员视图分页（组织筛选递归含下级；employmentStatus 缺省 employed；Excel 导出由 `EXPORT`(512) 位前端门控，**无独立端点**） |

### 3.13 公告 `notices`（契约 v1.7.0）
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/notices` | SEARCH | 管理列表分页（含草稿 / 撤回，实时已读人数与已读率） |
| POST | `/api/notices` | ADD | 发布公告（范围 dept/post/user 取并集、只存记录不展开；publishTime 未来 → draft 定时发布） |
| GET | `/api/notices/mine` | 需登录 | 我的公告（全员消费端：可见范围内已发布，置顶在前 → 排序列 → createdAt 降序） |
| GET | `/api/notices/:id` | 需登录 | 详情（进详情自动记首次已读，唯一约束幂等；范围外且无 SEARCH 位 403 `NOTICE_NOT_VISIBLE`） |
| PUT | `/api/notices/:id` | EDIT | 编辑（须发布人本人或 super_admin，否则 403 `NOTICE_NOT_PUBLISHER`；withdrawn 409 `NOTICE_NOT_PUBLISHED`） |
| DELETE | `/api/notices/:id` | DELETE | 删除（软删，同上发布人保护） |
| POST | `/api/notices/:id/withdraw` | EDIT | 撤回（仅已发布，否则 409 `NOTICE_NOT_PUBLISHED`） |
| GET | `/api/notices/:id/read-stats` | SEARCH | 已读 / 未读人员名单分页（?status=read\|unread） |
| POST | `/api/notices/:id/remind` | EDIT | 一键催办（写站内信；24h 防频 409 `NOTICE_REMIND_TOO_FREQUENT`、无未读 409 `NOTICE_NO_UNREAD`） |

### 3.14 站内信 `notifications`（契约 v1.7.0）
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/notifications` | 需登录 | 当前用户通知列表分页（铃铛面板） |
| GET | `/api/notifications/unread-count` | 需登录 | 未读数（红点轮询） |
| POST | `/api/notifications/read-all` | 需登录 | 全部已读 |
| POST | `/api/notifications/:id/read` | 需登录 | 单条已读 |

> §3.13 的 `/notices/mine`、`/notices/:id` 与本章 4 个端点在 yaml 中**不写 `x-permission`**（消费接口，仅 `AuthGuard`）；DEMO_MODE 下 read-all 与单条 read 在只读守卫白名单内（§9 契约 v1.10.0）。

### 3.15 Dashboard 概览 `stats`（契约 v1.11.0）
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/stats/overview` | NONE（仅登录） | 只读聚合，任意已登录用户（不走 PermissionsGuard）：KPI 计数 + 近 7 日迷你序列 + 登录趋势 + 角色占比 + 最新公告 ≤5 + 最近操作日志 ≤10；**v1.12.0 起无查询参数**，7/30 区间由前端本地截取 |

### 3.16 系统探针 `system`（契约 v1.14.0）
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/health` | NONE（`security: []`，免鉴权） | 存活探针：无数据库访问、不写 api 日志，供 Render 免费层保活定时器每 5-10 分钟 ping；NestJS 部署专用，Next / Nuxt 不做对等实现（背景见仓库根 `docs/launch-audit.md` #2） |

---

## 4. 错误码清单（全局）

> 初版错误码（大写蛇形）。后续按模块补充，统一登记在此，禁止散落。

| code | HTTP | 含义 |
| --- | --- | --- |
| UNAUTHORIZED | 401 | 未登录或 token 无效 |
| TOKEN_EXPIRED | 401 | accessToken 过期 |
| FORBIDDEN | 403 | 无权限（位掩码校验失败） |
| VALIDATION_ERROR | 400 | 请求参数校验失败（zod） |
| USER_NOT_FOUND | 404 | 用户不存在 |
| ROLE_NOT_FOUND | 404 | 角色不存在 |
| MENU_NOT_FOUND | 404 | 菜单不存在 |
| DICT_TYPE_NOT_FOUND | 404 | 字典类型不存在 |
| SETTING_NOT_FOUND | 404 | ~~设置项不存在~~ —— 已废止（契约 v1.3 随 Settings 模块移除，实现不再返回该码；保留此行仅为追溯，见 §3.7） |
| LOG_NOT_FOUND | 404 | 日志不存在 |
| USERNAME_EXISTS | 409 | 用户名已存在 |
| EMAIL_EXISTS | 409 | 邮箱已存在 |
| INVALID_CREDENTIALS | 401 | 用户名或密码错误（含软删除用户命中失败） |
| USER_DISABLED | 401 | 登录鉴权加固（v1.4.7）：停用用户拒绝新登录 |
| REFRESH_TOKEN_INVALID | 401 | refreshToken 无效 |
| INVALID_OPERATION | 400 | 批量删除时部分 ID 无效、或跨租户/越权操作等业务拒绝 |
| SELF_OPERATION_FORBIDDEN | 400 | 用户写操作保护（v1.4.6）：不能操作当前登录用户本人 |
| ADMIN_USER_PROTECTED | 403 | 用户写操作保护（v1.4.6）：内置 admin 用户不可删除/停用/重置密码 |
| SUPER_ADMIN_USER_PROTECTED | 403 | 用户写操作保护（v1.4.6）：super_admin 绑定用户不可删除/停用/重置密码（操作者同为超管豁免） |
| SUPER_ADMIN_ROLE_BINDING_PROTECTED | 403 | super_admin 角色绑定保护（v1.4.6）：非超管操作者不可为用户绑定/移除 super_admin 角色 |
| SUPER_ADMIN_LAST_PROTECTED | 403 | super_admin 绑定不变量（v1.9.0）：`PUT /users/{id}` 将移除最后一个启用中且未删除的超管绑定时拒绝（归零后无自助恢复手段） |
| CURRENT_PASSWORD_INCORRECT | 400 | 我的账户（v1.5.0）：改邮箱 / 改密码时当前密码确认失败 |
| AVATAR_FILE_INVALID | 400 | 头像上传（v1.5.0）：未提供文件或类型非法（仅 webp / png / jpeg） |
| AVATAR_FILE_TOO_LARGE | 400 | 头像上传（v1.5.0）：文件超过 2MB |
| AVATAR_UPLOAD_FAILED | 500 | 头像上传（v1.5.0）：Supabase Storage 写入失败 |
| PASSWORD_CONTAINS_USERNAME | 400 | 密码策略（v1.8.0）：新密码包含用户名（用户名 ≥3 位时做不区分大小写的包含检查） |
| PASSWORD_SAME_AS_OLD | 400 | 密码策略（v1.8.0）：新密码与当前密码相同（bcrypt 比对；`PUT /account/password` 原「相同则静默成功」行为废止） |
| ROLE_IN_USE | 409 | 角色仍关联用户，无法删除 |
| ROLE_CODE_EXISTS | 409 | 角色 code 已存在（v1.7.1 补录登记，实现已有） |
| ROLE_NAME_EXISTS | 409 | 角色名称已存在（v1.7.1 补录登记，实现已有） |
| SUPER_ADMIN_ROLE_PROTECTED | 403 | 系统内置角色保护（v1.4.3）：super_admin 授权不可修改 / 角色不可删除 / 不可停用 |
| MENU_TO_INVALID | 400 | 菜单路由路径格式非法（须以 / 或 https:// 开头） |
| MENU_TO_EXISTS | 409 | 菜单路由路径已存在（to 非空时全局唯一） |
| MENU_PARENT_INVALID | 400 | 父菜单不合法（不存在 / 移动到自身或自身下级） |
| MENU_HAS_CHILDREN | 409 | 存在子菜单，无法删除 |
| DICT_ITEM_NOT_FOUND | 404 | 字典项不存在 |
| DICT_TYPE_CODE_EXISTS | 409 | 字典类型 code 已存在（v1.7.1 补录登记，实现已有） |
| DICT_TYPE_IN_USE | 409 | 字典类型仍被字典项引用，无法删除（v1.4.1 补录） |
| DICT_ITEM_VALUE_EXISTS | 409 | 同字典类型下 value 已存在 |
| DICT_ITEM_LABEL_EXISTS | 409 | 同字典类型下 label 已存在（v0.9 起 label 亦唯一） |
| DEPT_NOT_FOUND | 404 | 组织不存在（v1.6.0） |
| DEPT_PARENT_INVALID | 400 | 上级组织不合法（不存在 / 已停用 / 移动到自身或自身后代下，v1.6.0） |
| DEPT_NAME_EXISTS | 409 | 组织名称已存在（未删除记录间唯一，v1.6.0） |
| DEPT_CODE_EXISTS | 409 | 组织编码已存在（未删除记录间唯一，v1.6.0） |
| DEPT_HAS_CHILDREN | 409 | 组织删除三级校验第 1 步：存在下级组织（v1.6.0） |
| DEPT_HAS_POSTS | 409 | 组织删除三级校验第 2 步：存在岗位（v1.6.0） |
| DEPT_HAS_ACTIVE_USERS | 409 | 组织删除三级校验第 3 步：存在在职人员（v1.6.0） |
| POST_NOT_FOUND | 404 | 岗位不存在（v1.6.0） |
| POST_NAME_EXISTS | 409 | 同一组织下岗位名称已存在（v1.6.0） |
| POST_HAS_ACTIVE_USERS | 409 | 岗位下存在在职人员，无法删除（v1.6.0） |
| NOTICE_NOT_FOUND | 404 | 公告不存在（v1.7.0） |
| NOTICE_NOT_VISIBLE | 403 | 公告详情可见性校验失败：不在发布范围内且无管理权限（v1.7.0） |
| NOTICE_NOT_PUBLISHER | 403 | 公告编辑 / 删除 / 撤回 / 催办要求发布人本人或 super_admin（v1.7.0） |
| NOTICE_NOT_PUBLISHED | 409 | 已撤回公告不可编辑 / 非已发布状态不可撤回（v1.7.0） |
| NOTICE_REMIND_TOO_FREQUENT | 409 | 催办 24 小时防频（v1.7.0） |
| NOTICE_NO_UNREAD | 409 | 催办无未读人员（v1.7.0） |
| NOT_FOUND | 404 | 资源不存在（通用；契约 v1.10.0：`DEMO_MODE` 关闭时 `POST /auth/demo-login` 亦返回此码） |
| DEMO_USER_NOT_AVAILABLE | 404 | 演示模式（v1.10.0）：demo-login 候选池为空（对应演示角色下无可用用户） |
| DEMO_READONLY | 403 | 演示模式（v1.10.0）：**全局语义**——`DEMO_MODE=true` 时只读守卫先于鉴权拦所有非 GET 请求（白名单见 §9 v1.0.6 行）；因各写端点不再逐个声明，故只登记于此 |

---

## 5. 关键数据结构（Contract 层，camelCase）

> 与 database-design.md 表字段映射，此处仅列 Contract 表示。

**User**
```json
{
  "id": "u_1", "username": "admin", "email": "a@b.com",
  "displayName": "管理员", "avatar": null, "status": "active",
  "roles": [ { "id": "r_1", "name": "超级管理员", "code": "super_admin" } ],
  "createdAt": "2026-08-21T10:00:00.000Z",
  "updatedAt": "2026-08-21T10:00:00.000Z"
}
```
> `roles` = 用户关联的角色数组（`user_roles` → `roles` 联查，含 id/name/code）。创建/编辑用户时，请求体携带 `roleIds: string[]`（非必填；编辑时传空数组或不传即清空该用户角色关联）。

**Menu（树节点，含权限位）**
```json
{
  "id": "m_users", "label": "用户管理", "i18nKey": "menu.users",
  "icon": "lucide:users", "to": "/users", "parentId": null,
  "sort": 1, "permissions": 15, "userPermissions": 11,
  "children": [ ]
}
```
> `permissions` = 全量按钮位；`userPermissions` = 当前用户实际授权位（登录态返回）。

**RoleMenu 授权**
```json
{ "menuId": "m_users", "permissions": 11 }
```

**Setting** — 已废止（契约 v1.3）
> 原 `{ "key", "value", "group", "description" }` 结构随 Settings 模块与 `/api/settings` 端点一并移除（见 §3.7），
> 当前契约中**不存在**该 schema；`settings` 表声明的遗留源码口径见 database-design.md §2.8。

**Log**
```json
{
  "id": "l_1", "type": "operation", "userId": "u_1",
  "action": "user.create", "ip": "1.2.3.4", "userAgent": "...",
  "detail": { }, "createdAt": "2026-08-21T10:00:00.000Z"
}
```

**AuthLogin 响应**
```json
{
  "data": {
    "accessToken": "...", "refreshToken": "...",
    "user": { "id": "u_1", "username": "admin", "roles": ["super_admin"], "permissions": 9223372036854775807 }
  }
}
```
> 注：超级管理员使用全 1 掩码（9223372036854775807）代表全量权限，普通管理员/角色为实际位聚合值（详见 database-design.md §1.1）。示例中 permissions 字段仅作示意，实际返回按角色聚合计算。
> `permissions` = 用户全部权限位聚合（整数），前端据此与 `menus.userPermissions` 双重校验。

---

## 6. OpenAPI 文档组织建议

`nest/openapi/openapi.yaml` 建议结构：
```yaml
openapi: 3.0.3
info:
  title: Better Admin API
  version: 1.0.0
servers:
  - url: https://nest.baiwumm.com/api
  - url: http://localhost:3000/api   # 本地
tags:                                # 按模块分 tag
  - name: Auth
  - name: Permissions
  - name: Users
  - name: Roles
  - name: Menus
  - name: Dict
  - name: Logs
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
  schemas:
    Error: { ... }
    Paginated: { ... }
  responses:
    Unauthorized: { ... }
    Forbidden: { ... }
paths:
  /auth/login: { ... }
  # ... 各模块端点
```

- 每个 path item 用 `x-permission` 标注所需位（§2）。
- `security` 全局要求 `bearerAuth`，login/refresh/logout 显式置空。
- API 文档 UI（Scalar API Reference）挂在 `/docs`，OpenAPI JSON 挂在 `/docs-json`（NestJS 启动时均可访问；2026-09-15 起 UI 由 Swagger UI 换为 Scalar，JSON 出口不变）。

---

## 7. 与需求和架构对齐

| requirements / AGENTS | Contract 体现 |
| --- | --- |
| §8.1 统一响应结构 | §1.2 / §1.3 |
| §8 RESTful 设计 | §3 各模块端点 |
| §6 OpenAPI 唯一事实 | §0 文档优先策略 |
| §8(认证) 不用 Supabase Auth | §1.5 JWT Bearer |
| §10 模块全覆盖 | §3 八模块端点 |
| RBAC 服务端强制 | §2 x-permission + §4 FORBIDDEN |
| 四技术栈一致 | 同一 yaml 约束 React/Vue/Next/Nuxt |

---

## 8. 后续步骤（不在此文档执行）

1. 按本方案生成 `nest/openapi/openapi.yaml`（真源文件）。
2. 初始化 NestJS 工程，接入 Drizzle（database-design.md 表）。
3. 实现各模块，代码与 yaml 对齐；Swagger UI `/docs` 核对。
4. 种子 + 迁移；基础测试。
5. 更新 `docs/progress.md` 进度记录，并同步 `AGENTS.md` 当前阶段指针。

---

## 9. 变更记录

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-21 | v0.1 | Phase 2 API Contract 设计方案：文档优先策略、全局约定、八模块端点+权限位、错误码清单、数据结构、yaml 组织。仅方案，未开发。 |
| 2026-08-21 | v0.2 | 契约优化：批量删改 DELETE /users?ids=、logout 强制鉴权记日志、settings 写接口改 SETTINGS_UPDATE（§2 枚举同步）、新增 INVALID_OPERATION(400) 错误码。与 database-design.md v0.2 对齐。仅方案，未开发。 |
| 2026-08-28 | v0.3 | 契约 v1.3：新增 `GET /api/menus/tree` 管理全量菜单树（SEARCH 位）；移除 Settings 模块全部端点与 `SETTINGS_UPDATE` 权限位；新增 `RESET_PASSWORD` 位并接管重置密码端点守卫；`GET /api/menus/tree` 支持 search/order 参数，`menus.to` 唯一与格式校验（MENU_TO_EXISTS / MENU_TO_INVALID）。与 database-design.md v0.3 对齐。 |
| 2026-08-28 | v0.4 | 契约 v1.4：菜单 `MenuNode` / `MenuCreateRequest` / `MenuUpdateRequest` 移除 `target` 字段（`menus.target` 列删除，外链打开方式由前端按 `to` 是否外链推导）。与 database-design.md v0.4 对齐。 |
| 2026-08-29 | v0.4.1 | 契约 v1.4.1（**补录**，日期取 docs/progress.md 对应条目）：补录 `DELETE /dict/types/{code}` 的 409 声明（`DICT_TYPE_IN_USE`，实现已有、文档漏录）；修复 tags 块因 v1.3 移除 Settings 遗留的重复 `description` 键（此前该 YAML 无法被严格解析器读取）。 |
| 2026-08-30 | v0.4.2 | 契约 v1.4.2 / v1.4.3（**补录**）：v1.4.2 `GET /roles` 新增 `enabled` 状态筛选参数（缺省返回全部）；v1.4.3 系统内置角色保护——`PUT /roles/{id}/menus` 与 `DELETE /roles/{id}` 对 super_admin 返回 403 `SUPER_ADMIN_ROLE_PROTECTED`（其 role_menus 授权即全量权限载体，清空则全后台 403 且无自助恢复手段，设计依据见 AGENTS §19）。 |
| 2026-08-30 | v0.5 | 契约 v1.4.4：新增 `GRANT`(256) 权限点；`PUT /roles/:id/menus` 权限要求由 EDIT 收敛为 GRANT（菜单授权独立位）。与 database-design.md v0.5 对齐。 |
| 2026-08-30 | v0.6 | 契约 v1.4.5：用户关联角色数量上限——`UserCreateRequest` / `UserUpdateRequest` 的 `roleIds` 增加 `maxItems: 5`（超限 400 VALIDATION_ERROR），NestJS DTO `@ArrayMaxSize(5)` 同步。 |
| 2026-08-30 | v0.7 | 契约 v1.4.6：用户写操作保护——`DELETE /users/{id}`、`DELETE /users`、`PUT /users/{id}/status`、`POST /users/{id}/reset-password` 新增 `SELF_OPERATION_FORBIDDEN`(400) / `ADMIN_USER_PROTECTED`(403) / `SUPER_ADMIN_USER_PROTECTED`(403)；`PUT /users/{id}` 补充两个 403（关闭编辑表单停用受保护用户的旁路）。机制结论见 docs/mechanisms.md §5。 |
| 2026-08-30 | v0.8 | 契约 v1.4.7：登录鉴权加固——`POST /auth/login` 新增 `USER_DISABLED`(401)（停用用户拒绝新登录）；用户名查询过滤 `deleted_at`（软删除用户不可登录）；每请求鉴权对软删除/停用用户返回 401；用户软删除时同步清理 `user_roles` 与 `refresh_tokens`。 |
| 2026-08-31 | v0.9 | 契约 v1.4.8：日志模块增强——`Log` schema 新增操作人摘要 `username / displayName / email / avatar`（`GET /logs`、`GET /logs/{id}` left join users，软删除用户仍回显）；新增 `DELETE /logs?ids=` 批量删除（BATCH_DELETE 位，任一 ID 无效整体 400 INVALID_OPERATION）；`LoginResponse.user` 与 `GET /auth/me`（登录/每请求鉴权共用视图）新增 `email` 字段。 |
| 2026-09-01 | v0.9.1 | 契约 v1.5.0（**补录**）：新增 Account 模块（我的账户，自助接口仅 `AuthGuard`、不走 `PermissionsGuard`）——`GET/PUT /account/profile`（displayName / phone / tags，tags 服务端 trim·去空·去重 ≤10×20 字符）、`PUT /account/email`（需 currentPassword，冲突 409 `EMAIL_EXISTS`）、`PUT /account/password`（需 currentPassword，成功后 tokenVersion+1 并清空托管 refreshToken 全端强制下线）、`POST /account/avatar`（multipart，服务端中转写入 Supabase Storage bucket `avatars`，webp/png/jpeg ≤2MB）；`users` 新增 phone / tags / last_login_at；AuthUser 视图新增 avatar / phone / tags，`GET /auth/me` 的 data 契约由 `LoginResponse` 纠偏为 `AuthUser`（实现一直如此）。AGENTS §5 的「Storage 唯一豁免」即源于本版本。 |
| 2026-09-01 | v0.9.2 | 契约 v1.5.1 / v1.5.2 / v1.5.3（**补录**）：v1.5.1 新增 `DELETE /account/avatar`（置空 users.avatar 并尽力删 Storage 对象，失败不阻断）；v1.5.2 `AccountProfile` 与 `PUT /account/profile` 新增个人链接三字段 `website` / `githubUsername` / `xUsername`（存裸值，服务端提交时剥离 `http(s)://` 与平台前缀后校验，展示前缀由前端拼接）；v1.5.3 AuthUser 亦携带三字段（v1.5.2「刻意不加」的决定因侧边栏个人链接子菜单需求翻转）。 |
| 2026-09-01 | v0.9.3 | 契约 v1.6.0（**补录**）：组织中心阶段 1/2——Depts / Posts / Directory 三模块共 14 端点（组织树与分页 CRUD、`PATCH /org/depts/sort` 拖拽排序、岗位 CRUD 与 `/{id}/members` 在职人数穿透、通讯录分页）；DeptTreeNode 补 `leaderId`；`users` 新增 dept_id / employee_no / employment_status / entry_date（迁移 0007）与 gender（迁移 0008）；UserCreateRequest / UserUpdateRequest 补组织与岗位关联（postIds ≤20、mainPostId 须在 postIds 内）；组织/岗位均软删 + 部分唯一索引，删除三级校验 `DEPT_HAS_*`；岗位仅作组织数据、不参与权限聚合。 |
| 2026-09-01 | v0.9.4 | 契约 v1.7.0（**补录**）：组织中心阶段 3——Notices / Notifications 两模块共 13 端点（管理列表 / 发布 / 我的公告 / 详情自动记已读 / 编辑 / 删除 / 撤回 / 已读统计 / 催办 + 铃铛四端点）；发布范围 dept/post/user 取并集、只存范围记录不按人展开，publishTime 未来 → draft 由 `@Cron` 每分钟扫描自动发布；已读率实时统计（total 为 0 时 readRate 为 null）；催办 24h 防频；编辑/删除/撤回/催办要求发布人本人或 super_admin（403 `NOTICE_NOT_PUBLISHER`）；消费端（`/notices/mine`、`/notices/{id}`、notifications 全部）**不写 x-permission**；富文本为 Tiptap HTML，渲染端须消毒。 |
| 2026-09-09 | v1.0 | 契约 v1.7.1 契约对齐补录（以实现为准的文档追认）：POST /roles 与 PUT /roles/{id} 补 409（ROLE_CODE_EXISTS / ROLE_NAME_EXISTS）、PUT /roles/{id} 补 403 SUPER_ADMIN_ROLE_PROTECTED（停用保护）、PUT /roles/{id}/menus 400 补 INVALID_OPERATION、POST /dict/types 补 409 DICT_TYPE_CODE_EXISTS；Role / DictType / DictItem 请求 schema 补字段长度与格式约束（与最近表单校验三端对齐提交同步）、AddChildRequest 补 4 个布尔字段、DeptSortRequest 补 maxItems 200、password minLength 6、email format、移除 DictItemCreateRequest.typeCode 历史冗余字段、修复 AuthUser.tags items 缩进错位；管理端 User 视图补录 lastLoginAt。实现侧同步收紧三处兜底校验：website maxLength 255、notice content 非空、notifications 查询参数 DTO 化。§4 错误码清单补登 v1.4 后各模块全部错误码。 |
| 2026-09-09 | v1.0.1 | 契约 v1.7.2（**补录**）：列表排序口径统一（默认排序行为变更、接口参数不变）——权重型 `sort` 降序（`GET /roles`、`GET /org/depts`、`/org/depts/tree`）；序号型保持升序（`GET /menus`、`/menus/tree`、`/dict/types/{code}/items`，seed 与存量按此口径、翻转需数据迁移）；流水型 createdAt 降序（`GET /logs`、`/notifications`、`/dict/types`、`/org/posts/{id}/members`，末项原为升序）；内容型 `GET /notices` 置顶优先 → 排序列 → createdAt 降序；**全部分页列表统一追加 id 降序兜底**（同秒多条时分页顺序稳定，防重复/丢行）；支持表头排序的接口 sort/order 仅替换主列、次级链固定；用户与账户内嵌 roles 摘要与角色列表同口径。 |
| 2026-09-09 | v1.0.2 | 契约 v1.7.3（**补录**）：用户 / 密码输入长度约束补齐（前后端兜底口径统一）——`UserCreateRequest` 补 username 1-50、displayName 1-50（均 trim 后入库）、email ≤100、password ≤72；`UserUpdateRequest` 补 displayName / email 同规；`ResetPasswordRequest` / `AccountPasswordUpdateRequest` 的 newPassword 补 ≤72（72 为 bcrypt 输入上限，超出部分哈希时被截断忽略）。超限 400 `VALIDATION_ERROR`。 |
| 2026-09-10 | v1.0.3 | 契约 v1.8.0（**补录**）：密码策略收紧（三个设置密码入口口径统一；登录校验不受影响、存量密码静默兼容）——由 6-72 位改为 8-20 位、仅允许 ASCII 可打印（0x21-0x7E，天然排除空白与非 ASCII）、且须同时含字母与数字；新增业务校验 400 `PASSWORD_CONTAINS_USERNAME`（用户名 ≥3 位时不区分大小写做包含检查）与 400 `PASSWORD_SAME_AS_OLD`（bcrypt 比对；`PUT /account/password` 原「相同则静默成功」行为废止，改为明确报错）。 |
| 2026-09-11 | v1.0.4 | 契约 v1.8.1（**补录**）：`AccountProfileUpdateRequest.phone` 由宽松格式（`+` 前缀与数字/空格/短横线，4-20 位）收紧为 `^1[3-9]\d{9}$`（maxLength 20 → 11），仍可传 null 清空；存量宽松值读取不受影响，下次保存须改为标准格式。 |
| 2026-09-12 | v1.0.5 | 契约 v1.9.0（**补录**）：super_admin 绑定不变量——`PUT /users/{id}` 的 roleIds 全量替换若将移除最后一个「启用中且未删除」的超管绑定，返回 403 `SUPER_ADMIN_LAST_PROTECTED`（超管归零后所有加绑请求均被 `SUPER_ADMIN_ROLE_BINDING_PROTECTED` 拒绝、无自助恢复手段；停用用户不计入活跃数）；事务内以 super_admin 角色行 `FOR UPDATE` 串行化并发摘绑；不变量成立后归零不可达（最后一个活跃超管必为操作者本人，本人删/停/重置已被 `SELF_OPERATION_FORBIDDEN` 拦死），超管转移按「先挂后摘」执行；`POST /users` 仅加绑不涉及本守卫；roleIds 并发编辑按 PUT last-write-wins 接受（记录在案）。机制结论见 docs/mechanisms.md §5。 |
| 2026-09-17 | v1.0.6 | 契约 v1.10.0（**补录**）：演示模式（Phase 0 演示上线准备）——新增 `POST /auth/demo-login`（`kind: admin\|random`，免鉴权直接签发演示角色用户会话、前端不接触密码、响应复用 `LoginResponse`；admin 从「系统管理员」角色用户随机一人，random 先等概率选角色再随机选人，super_admin 永不进任何快捷池；`DEMO_MODE` 关闭时 404、候选池为空 404 `DEMO_USER_NOT_AVAILABLE`）；新增全局语义 403 `DEMO_READONLY`（`components.responses.DemoReadonly`：`DEMO_MODE=true` 时全局只读守卫**先于鉴权**拦所有非 GET 请求，白名单仅 login / refresh / logout / demo-login 与 notifications read-all / `{id}/read；为避免逐端点重复声明，各写端点不再单独列出）。配套运行时（不改契约结构）：DEMO_READONLY 不写 error 日志、`LOG_API_SKIP_GET=true` 时 GET 不记 api 日志、log-cleanup 跳过 `detail.seed=true` 的 faker 布景日志、新增 refresh_tokens 过期行每日 03:30 清理。四端影响：React / Vue 消费 + 快捷登录按钮与统一 toast，Next / Nuxt 各自 route handler 同名实现。 |
| 2026-09-18 | v1.0.7 | 契约 v1.11.0（**补录**）：Dashboard 概览（Phase C）——新增 `GET /stats/overview` 只读聚合端点（鉴权为任意已登录用户，仅 `AuthGuard`、`x-permission: NONE`；GET 天然不受 DEMO_READONLY 影响）：一次返回 KPI 计数（用户总数/今日新增、今日登录/昨日环比、累计操作日志/今日、部门与岗位数）、KPI 迷你序列（固定近 7 日）、登录趋势（`?days=7\|30`）、角色占比、最新公告 ≤5、最近操作日志 ≤10；序列 date 为 YYYY-MM-DD 且按 **Asia/Shanghai（UTC+8）日界**聚合、无数据日补 0；敏感字段（手机号 / 邮箱 / IP / UA）一律不出现在响应中，例外为展示所需的公开信息（最近操作日志的操作人 avatar、最新公告的 publisherName / publisherAvatar，对齐日志 v1.4.8 口径，用户已删除或未设置时为 null）。 |
| 2026-09-19 | v1.0.8 | 契约 v1.12.0（**补录**）：Dashboard 取数口径修正（不改聚合逻辑，只改参数归属）——移除 `GET /stats/overview` 的 `days` 查询参数，`loginTrend` 固定返回近 30 日，7 / 30 区间切换下移到前端本地截取（`slice(-days)`）。**动因**：`days` 在 v1.11.0 实现里只作用于 `loginTrend` 一个字段，却是页面级聚合接口的入参，前端拼进 queryKey 后点一下图表 Tabs 就重拉整包数据（服务端白算十余个聚合只为换一条曲线），配 keepPreviousData 续显旧数据时其它区块变化会表现为「只切了图表、KPI 数字却跳」——控件作用域与请求作用域不一致。**等价性**：`lastNDates(30)` 取后 7 项 ≡ `lastNDates(7)`（同 UTC+8 日界、无数据日补 0），数值口径不变。**兼容性**：全局 ValidationPipe 为 `whitelist: true` + `forbidNonWhitelisted: false`，存量客户端继续携带 `?days=` 不 400、被静默忽略。 |
| 2026-09-20 | v1.0.9 | 契约 v1.13.0（**补录**）：角色管理「关联用户」列与名单穿透（对齐公告已读人员 / 岗位在职人数穿透）——`GET /roles` 的 Role 视图新增 `userCount`（关联用户总数，仅在职且未删除）与 `readers`（`RoleReader[]`，最近分配最多 3 个、按 `user_roles.created_at` 倒序；列表接口回填、详情接口不带，形状对齐 `NoticeReader`）；新增 `GET /roles/{id}/users`（`x-permission: SEARCH`，data 为 `DirectoryEntry[]`，过滤口径与 `/org/posts/{id}/members` 一致——未删除且非离职，404 `ROLE_NOT_FOUND`）；列表批量装载复用公告 `loadReadersBatch` 的窗口函数模式（`PARTITION BY role_id`）。 |
| 2026-09-22 | v1.1 | 契约 v1.14.0：新增 `GET /health`（System tag，`security: []` + `x-permission: NONE`）——无鉴权、无数据库访问的存活探针，供 Render 免费层保活外部定时器（15 分钟不活跃即休眠、冷启动 30-50 秒）每 5-10 分钟调用。实现侧配套：全局 `LoggingInterceptor` 显式跳过 `/api/health`，否则探活流量既污染 api 审计日志、又让零依赖端点重新依赖数据库。跨端口径：本端点为 Nest 部署保活专用，Next / Nuxt 自带 server 运行时、平台不休眠，不做对等实现。背景见仓库根 `docs/launch-audit.md` #2。 |
| 2026-09-22 | v1.2 | 本文档断更补录（**不改契约，纯文档修正**，背景见 `docs/launch-audit.md` #6）：① §9 一次性追入自 v1.0 以来的全部契约版本注记，共 15 行（契约 v1.4.1 → v1.13.0，日期取 `docs/progress.md` 对应条目；行内以「补录」标注以与当时记录区分，历史行零改写）。② §3 端点清单补齐 §3.9–§3.16（我的账户 / 组织 / 岗位 / 通讯录 / 公告 / 站内信 / Stats / 系统探针），并回填早期小节漏项（`POST /auth/demo-login`、`GET /menus/tree`、`GET /dict/types/:code`、`DELETE /logs?ids=`、`GET /roles/:id/users`）与三处过时权限位（reset-password 由 `RESET` 改标 `RESET_PASSWORD`、`PUT /roles/:id/menus` 由 `EDIT` 改标 `GRANT`）。③ §2 权限点计数 9 → **10**（补 `EXPORT`(512)，真源 `src/db/schema/permissions.enum.ts`）。④ §3 头注明契约实测规模 **48 条路径 / 77 个 path+method 操作**（v1.14.0 逐 path 统计）。⑤ §4 补登 v1.8.0 / v1.9.0 / v1.10.0 引入却漏登记的错误码（`PASSWORD_CONTAINS_USERNAME` / `PASSWORD_SAME_AS_OLD` / `SUPER_ADMIN_LAST_PROTECTED` / `NOT_FOUND` / `DEMO_USER_NOT_AVAILABLE` / `DEMO_READONLY`），并将 v1.3 已随 Settings 移除的 `SETTING_NOT_FOUND` 标废止；§5 的 `Setting` 结构示例同标废止（yaml 中已无该 schema 与 `/settings` 路径）。 |
