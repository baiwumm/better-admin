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

## 0. Contract 真源策略（来自 AGENTS.md 第 6 节）

- **OpenAPI 是 API Contract 唯一事实来源（Single Source of Truth）**。
- 采用 **文档优先（Contract-First）**：先定义 `nest/openapi/openapi.yaml`，NestJS 代码按它实现。
- `@nestjs/swagger` 仅用于：开发期从代码生成 Swagger UI 供联调，**并定期与 `openapi.yaml` 核对一致性**；yaml 为权威，代码偏差以 yaml 为准修正。
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
- `PERMISSIONS` 枚举（与 database-design.md §1.2 一致）含：`SEARCH`(1) / `ADD`(2) / `EDIT`(4) / `DELETE`(8) / `BATCH_DELETE`(16) / `ADD_CHILD`(32) / `RESET`(64) / `RESET_PASSWORD`(128) / `GRANT`(256)，共 **9 个权限点**（v0.3 移除 `SETTINGS_UPDATE`、新增 `RESET_PASSWORD`；`RESET` 为前端「重置」按钮显隐位，`RESET_PASSWORD` 守卫重置密码端点；v0.5 新增 `GRANT` 守卫 `PUT /roles/:id/menus`，原为 EDIT）。

---

## 3. 端点清单（按模块）

> 以下为每个模块的端点、方法、权限位（初版）。响应结构遵循 §1.2/§1.3。

### 3.1 认证 `auth`
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 无 | 登录，返回 access/refresh token + 用户信息 |
| POST | `/api/auth/logout` | 无* | 登出（强制鉴权，服务端记录登出日志） |
| POST | `/api/auth/refresh` | 无 | 用 refreshToken 换新 accessToken |
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
| POST | `/api/users/:id/reset-password` | RESET | 重置密码（初版 RESET 位覆盖） |
| PUT | `/api/users/:id/status` | EDIT | 启用/停用 |

### 3.4 角色 `roles`
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/roles` | SEARCH | 列表（分页 + search） |
| GET | `/api/roles/:id` | SEARCH | 详情 |
| POST | `/api/roles` | ADD | 创建 |
| PUT | `/api/roles/:id` | EDIT | 编辑 |
| DELETE | `/api/roles/:id` | DELETE | 删除 |
| GET | `/api/roles/:id/menus` | SEARCH | 该角色菜单授权（含每菜单 permissions 位） |
| PUT | `/api/roles/:id/menus` | EDIT | 更新角色菜单授权（role_menus.permissions 位） |

### 3.5 菜单 `menus`
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/menus` | NONE（仅登录） | 菜单树（可见性按当前用户角色关联过滤，登录态下附 userPermissions 实际位） |
| GET | `/api/menus/:id` | SEARCH | 详情 |
| POST | `/api/menus` | ADD | 创建（支持 parentId 子树） |
| PUT | `/api/menus/:id` | EDIT | 编辑 |
| DELETE | `/api/menus/:id` | DELETE | 删除 |
| POST | `/api/menus/:id/add-child` | ADD_CHILD | 新增子级 |

### 3.6 字典 `dict`
| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/dict/types` | SEARCH | 字典类型列表 |
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
| GET | `/api/logs` | SEARCH | 列表（分页 + ?type 过滤 operation/login/api/error） |
| GET | `/api/logs/:id` | SEARCH | 详情 |
| DELETE | `/api/logs/:id` | DELETE | 删除单条（可选，初版可仅保留清理策略） |

> 日志为只读为主；写操作由系统在业务动作时自动插入，不提供手动创建端点。

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
| SETTING_NOT_FOUND | 404 | 设置项不存在 |
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

**Setting**
```json
{ "key": "site.title", "value": "Better Admin", "group": "basic", "description": null }
```

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
  - url: https://api.baiwumm.com/api
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
- Swagger UI 挂在 `/docs`（NestJS 启动时可访问）。

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
| 2026-08-30 | v0.5 | 契约 v1.4.4：新增 `GRANT`(256) 权限点；`PUT /roles/:id/menus` 权限要求由 EDIT 收敛为 GRANT（菜单授权独立位）。与 database-design.md v0.5 对齐。 |
| 2026-08-30 | v0.6 | 契约 v1.4.5：用户关联角色数量上限——`UserCreateRequest` / `UserUpdateRequest` 的 `roleIds` 增加 `maxItems: 5`（超限 400 VALIDATION_ERROR），NestJS DTO `@ArrayMaxSize(5)` 同步。 |
| 2026-08-30 | v0.7 | 契约 v1.4.6：用户写操作保护——`DELETE /users/{id}`、`DELETE /users`、`PUT /users/{id}/status`、`POST /users/{id}/reset-password` 新增 `SELF_OPERATION_FORBIDDEN`(400) / `ADMIN_USER_PROTECTED`(403) / `SUPER_ADMIN_USER_PROTECTED`(403)；`PUT /users/{id}` 补充两个 403（关闭编辑表单停用受保护用户的旁路）。机制结论见 docs/mechanisms.md §5。 |
| 2026-08-30 | v0.8 | 契约 v1.4.7：登录鉴权加固——`POST /auth/login` 新增 `USER_DISABLED`(401)（停用用户拒绝新登录）；用户名查询过滤 `deleted_at`（软删除用户不可登录）；每请求鉴权对软删除/停用用户返回 401；用户软删除时同步清理 `user_roles` 与 `refresh_tokens`。 |
| 2026-08-31 | v0.9 | 契约 v1.4.8：日志模块增强——`Log` schema 新增操作人摘要 `username / displayName / email / avatar`（`GET /logs`、`GET /logs/{id}` left join users，软删除用户仍回显）；新增 `DELETE /logs?ids=` 批量删除（BATCH_DELETE 位，任一 ID 无效整体 400 INVALID_OPERATION）；`LoginResponse.user` 与 `GET /auth/me`（登录/每请求鉴权共用视图）新增 `email` 字段。 |
