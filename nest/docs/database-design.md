# Better Admin — Phase 2 数据库设计（Single Source of Schema）

> 本文档是 Phase 2（NestJS + PostgreSQL）的**数据库 Schema 单一事实来源（Single Source of Schema）**。
> 本阶段**只做方案与文档对齐，不编写业务代码**；落地实现在后续「Contract → 工程 → 模块」步骤进行。
>
> 关联文档：
> - `docs/requirements.md`（业务需求，第 10 章模块清单）
> - `docs/ui-spec.md`（UI 规范）
> - `AGENTS.md`（开发规则，第 5/6/8/18 节硬性约束）
>
> 优先级：用户当前需求 > `requirements.md` > `AGENTS.md` > `ui-spec.md` > 现有代码 > 框架最佳实践。

---

## 0. 设计原则（来自 AGENTS.md 硬性约束）

1. **统一数据库**：所有技术栈（React/Vue/Next/Nuxt/Nest）共用同一套 PostgreSQL Schema，禁止维护不同的数据库结构。
2. **ORM**：NestJS 使用 **Drizzle ORM**；Schema 定义文件即 Single Source，后续全栈版本复用同一字段设计。
3. **Supabase 仅作托管**：不使用 Supabase Auth / RLS / Edge Functions / Storage；连接信息仅存在于服务端环境变量。
4. **RBAC 服务端强制校验**：用户 ↔ 角色 ↔ 权限、菜单关联权限；服务端必须做授权校验，不只依赖前端路由守卫。
5. **API Contract 优先**：OpenAPI 为 Contract 唯一事实来源，本文档的表结构需与后续 OpenAPI 对齐。
6. **一致性**：字段命名、数据类型、业务规则跨技术栈保持一致；本文档定义后，其他技术栈不得另起炉灶。

---

## 1. 权限模型：位掩码（Bitmask）方案

### 1.1 核心思想

权限点不是「数据库行 + 关联表」，而是**编译期常量枚举 + 整型位掩码**：

- `PERMISSIONS`：后端代码中的全量操作枚举，每个操作占一个 bit（`1 << n`）。
- `menus.permissions`：整型（bigint），声明**该菜单上有哪些按钮/操作可用**（全量位）。
- `role_menus.permissions`：整型（bigint），声明**某角色在该菜单上实际被授予哪些位**（子集）。
- **用户最终权限** = 其所有角色在该菜单的 `role_menus.permissions` 做 OR 聚合。
- **前端判定**：`(userBits & PERM_BITS['ADD']) !== 0` → 按钮显隐。
- **后端判定**：`@Permissions('ADD')` 守卫用同一 bit 做 `&` 校验（服务端强制）。
- **超级管理员全量位（重要）**：预置 `super_admin` 角色的权限位**禁止硬编码为具体数值（如 127）**。应使用全 1 掩码表示「拥有全部权限」——在 bigint 语义下即 `9223372036854775807`（所有 bit 置 1 的正数；等价于有符号视角的 `-1`，但为避免 JavaScript 位运算负号陷阱，统一以正数 `9223372036854775807` 存储与判定）。**校验规则**：若用户聚合位等于该全量值，则直接通过任何 `&` 位校验，不再逐 bit 比对。如此一来，后续新增权限点（`1 << 7`、`1 << 8`……）时，超级管理员无需改数据即自动拥有新权限，避免出现「新增权限点后超管权限反而缩水」的退化问题。

### 1.2 `PERMISSIONS` 枚举（初版，后续可扩展）

> 初版锁定以下 7 个；新增权限点沿用 `1 << n` 扩展（bigint 支持 63 位，余量充足）。
> 该枚举定义在后端代码，经 `GET /api/permissions` 接口下发，前端不写死。

| value | label | bits（十进制） | icon | 含义 |
| --- | --- | --- | --- | --- |
| SEARCH | search | 1 | lucide:search | 查询 |
| ADD | add | 2 | lucide:plus | 新增 |
| EDIT | edit | 4 | lucide:pencil-line | 编辑 |
| DELETE | delete | 8 | lucide:trash-2 | 删除 |
| BATCH_DELETE | batchDelete | 16 | i-lucide-list-x | 批量删除 |
| ADD_CHILD | addChild | 32 | lucide:git-branch-plus | 新增子级 |
| RESET | reset | 64 | lucide:rotate-ccw | 重置（前端「重置」按钮显隐，纯前端位） |
| RESET_PASSWORD | resetPassword | 128 | lucide:key-round | 重置密码（守卫 `POST /users/:id/reset-password`） |

### 1.3 权限判定链路

```text
menus.permissions  (该菜单有哪些按钮)
        │
role_menus.permissions  (某角色在该菜单授权了哪些位，子集)
        │
用户最终位 = OR(该用户所有角色在此菜单的 role_menus.permissions)
        │
前端: (userBits & PERM_BITS[op]) !== 0  → 按钮显隐
后端: @Permissions(op) 守卫同 bit 校验   → 接口授权
```

### 1.4 与「权限管理」模块的关系

- 权限点（操作类型）是**极稳定的基础设施**，定义在后端代码枚举中，不提供运行时「新增权限点」UI。
- 「权限管理」模块定位：查看全量 `PERMISSIONS` 字典 + 角色分配（编辑 `role_menus.permissions` 位）。
- 日常「分配权限」全在数据库位里改，即时生效，零重新打包。

### 1.5 菜单树权限填充的性能约束（实现规范）

`GET /api/menus` 接口需返回树形菜单结构，并在每个 `MenuNode` 中附带 `userPermissions` 字段（当前登录用户在该菜单的实际授权位，见 openapi-design.md §5）。

**实现规范（基于角色关联过滤）**：

1. 服务端在 `GET /api/menus` 中，首先获取当前用户的所有角色（通过 `user_roles`）。
2. 查询 `role_menus` 表，获取这些角色关联的所有 `menu_id`（去重），作为「直接授权菜单集合」。
3. **若用户为超级管理员（权限位 = 全量掩码 `9223372036854775807`），跳过此过滤，返回完整菜单树。**
4. 对于普通用户，将「直接授权菜单集合」向上追溯父级（`parent_id`），将祖先节点也纳入可见范围（保证树形结构完整）。
5. 最终仅查询 `menus` 表中 `id` 落在此集合内的记录，再组装为树形结构。**未关联的菜单节点不应出现在返回树中**（即角色未授权的菜单对用户不可见）。
6. 对树中每个节点，仍需通过一次性预加载 `role_menus.permissions` 聚合（O(1) Map 映射）填充 `userPermissions` 字段，用于前端按钮级权限判断。
7. **性能硬性约束**：仍保持常数次数据库查询（查用户角色 → 查 `role_menus` → 查 `menus`），严禁对每个菜单节点逐条查询权限（N+1）。

**与旧实现的关键差异**：旧逻辑返回全量菜单树、对未关联节点标 `userPermissions = 0`，且前端将「未声明按钮位的菜单（`permissions = 0`）」视为已登录即可见，导致 `role_menus` 的角色关联对菜单「可见性」完全失效。新规范下菜单可见性由角色关联决定：**菜单不在用户角色授权的 `role_menus` 集合（含祖先链）中，就不会出现在返回树里**，前端无法看到。此修正使「菜单即权限视图」符合标准 RBAC（用户 → 角色 → 菜单关联）。

若后续引入 Redis 缓存，亦需保持此「批量预加载 + 集合过滤」逻辑不变，不得退化为逐节点查询。

---

## 2. 表清单（9 张，无 i18n 表）

> 通用约定：
> - 所有表主键 `id` 为 `text`（与参考模型一致，实现简单、无 uuid 生成依赖）。
> - **主键生成策略**：所有 `text` 类型主键由**服务端强制使用 `nanoid(12)` 生成**（如 `const id = nanoid(12)`），确保高并发下的唯一性与无序性。**禁止前端传入 id，禁止依赖数据库自增/序列**。需引入 `nanoid` 依赖（属必要基础设施）。
> - 位掩码字段类型为 **bigint**（63 位余量）。
> - 业务表带 `created_at` / `updated_at`（timestamptz）；软删除用 `deleted_at`（nullable），日志除外。
> - 数据库层字段 snake_case；API 响应统一 camelCase（与 Contract 一致）。
> - `i18n_key` 字段为可空，存翻译键；`label` 为中文兜底，前端按 key 映射英文（见 §5）。

### 2.1 `users`（用户）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | text | PK | 用户 ID（服务端 `nanoid(12)` 生成） |
| username | varchar(50) | NOT NULL | 登录名（部分唯一索引，见下） |
| email | varchar(255) | NOT NULL | 邮箱（部分唯一索引，见下） |
| password_hash | varchar(255) | NOT NULL | bcrypt 哈希，禁止明文 |
| display_name | varchar(100) | NOT NULL | 展示名 |
| avatar | varchar(512) | NULL | 头像 URL |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | `active` / `disabled`（收进字典 `user_status`） |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |
| deleted_at | timestamptz | NULL | 软删除 |

> **软删除与唯一索引冲突解决**：由于采用软删除，若 `username` / `email` 使用普通 `UNIQUE` 约束，已删除记录仍会占用该唯一值，导致同名/同邮箱用户无法重建。改为**部分唯一索引（Partial Index）**：仅对未删除记录（`deleted_at IS NULL`）施加唯一约束，已软删记录可释放用户名/邮箱供复用。
>
> ```sql
> CREATE UNIQUE INDEX users_username_unique_active ON users (username) WHERE deleted_at IS NULL;
> CREATE UNIQUE INDEX users_email_unique_active ON users (email) WHERE deleted_at IS NULL;
> ```
>
> Drizzle 中对应写法（以 username 为例）：
> ```ts
> uniqueIndex('users_username_unique_active')
>   .on(table.username)
>   .where(sql`${table.deletedAt} is null`)
> ```

### 2.2 `roles`（角色）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | text | PK | 角色 ID |
| name | varchar(50) | NOT NULL, UNIQUE | 显示名，如「超级管理员」 |
| code | varchar(50) | NOT NULL, UNIQUE | 程序用，如 `super_admin` |
| description | varchar(255) | NULL | 描述 |
| enabled | boolean | NOT NULL, DEFAULT true | 是否启用 |
| sort | int | NOT NULL, DEFAULT 0 | 排序 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

### 2.3 `menus`（菜单树 + 按钮位掩码）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | text | PK | 菜单 ID |
| label | text | NOT NULL | 菜单名（中文兜底） |
| i18n_key | text | NULL | 翻译键，如 `menu.users`（指向前端 i18n） |
| icon | text | NOT NULL | 图标，如 `lucide:users` |
| to | text | NULL | 路由路径，如 `/users` |
| badge | text | NULL | 徽标文案 |
| parent_id | text | NULL, FK→menus.id (restrict) | 自引用，顶级 NULL（树形） |
| sort | int | NOT NULL, DEFAULT 0 | 排序 |
| keep_alive | boolean | NOT NULL, DEFAULT false | 是否缓存 |
| hide_in_menu | boolean | NOT NULL, DEFAULT false | 是否在菜单隐藏 |
| enabled | boolean | NOT NULL, DEFAULT true | 是否启用 |
| default_open | boolean | NOT NULL, DEFAULT false | 是否默认展开 |
| permissions | bigint | NOT NULL, DEFAULT 0 | **按钮位掩码**（该菜单声明的可用操作） |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

索引：`menus_parent_idx (parent_id)`、`menus_sort_idx (parent_id, sort)`。

### 2.4 `user_roles`（用户 ↔ 角色）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| user_id | text | NOT NULL, FK→users.id (cascade) | |
| role_id | text | NOT NULL, FK→roles.id (cascade) | |
| 联合 PK | (user_id, role_id) | | 多对多桥接 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

索引：`user_roles_user_idx (user_id)`、`user_roles_role_idx (role_id)`。

### 2.5 `role_menus`（角色 ↔ 菜单 + 按钮授权位）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| role_id | text | NOT NULL, FK→roles.id (cascade) | |
| menu_id | text | NOT NULL, FK→menus.id (cascade) | |
| permissions | bigint | NOT NULL, DEFAULT 0 | **授权位子集**（该角色在此菜单的实际权限） |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| 联合 PK | (role_id, menu_id) | | |

索引：`role_menus_role_idx (role_id)`、`role_menus_menu_idx (menu_id)`。

### 2.6 `dict_types`（字典类型）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | text | PK | |
| code | varchar(50) | NOT NULL, UNIQUE | 字典类型码，如 `user_status` |
| name | varchar(100) | NOT NULL | 显示名 |
| description | varchar(255) | NULL | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

### 2.7 `dict_items`（字典项，可翻译）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | text | PK | |
| type_code | varchar(50) | NOT NULL, FK→dict_types.code | 所属字典 |
| value | varchar(100) | NOT NULL | 实际值，如 `active` |
| label | varchar(100) | NOT NULL | 显示文案（中文兜底） |
| i18n_key | text | NULL | 翻译键，如 `dict.user_status.active` |
| sort | int | NOT NULL, DEFAULT 0 | 排序 |
| enabled | boolean | NOT NULL, DEFAULT true | 是否启用 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

唯一约束建议：`(type_code, value)`。

### 2.8 `settings`（系统设置）— 已移除（v0.3）

> settings 表与 `/api/settings` 系列端点已随契约 v1.3 / 本文档 v0.3 **整体移除**
> （系统设置页暂无落地计划，相关接口不再维护）；迁移 `0002_*` 已在真实库
> DROP 该表。原「SETTINGS_UPDATE 独立写权限位」约定一并废止。
> 日志清理若需保留期配置，另行以新配置载体实现，不复用本表。

### 2.9 `logs`（日志）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | text | PK | |
| type | varchar(20) | NOT NULL | `operation`/`login`/`api`/`error`（见 §3） |
| user_id | text | NULL, FK→users.id | 操作用户，匿名可为 NULL |
| action | varchar(100) | NOT NULL | 动作，如 `user.create`/`login.success` |
| ip | varchar(45) | NULL | 客户端 IP |
| user_agent | varchar(512) | NULL | UA |
| detail | jsonb | NULL | 上下文（改前/改后、错误栈等） |
| created_at | timestamptz | NOT NULL, DEFAULT now() | （日志不软删） |

索引：`logs_type_idx (type)`、`logs_created_idx (created_at)`。

> **日志自动清理策略**：日志表只增不删（无软删），长期运行会膨胀。生产环境建议通过 **`pg_cron`**（数据库侧定时任务）或应用层 **`@Cron()`**（NestJS 定时任务）定期清理：保留期原计划读 `settings.system.logRetentionDays`（settings 已于 v0.3 移除，启用时另行引入配置载体），删除 `created_at` 早于 `now() - interval 'N days'` 的过期日志。清理任务本身应记录到 `error`/`operation` 日志以便追溯，避免静默丢失审计数据。

---

## 3. 日志类型定义（`logs.type`）

对应 requirements §10.7 与 ui-spec 的 `/logs` 四 Tabs：

| type | 名称 | 触发时机 | 典型 action | user_id | detail |
| --- | --- | --- | --- | --- | --- |
| `operation` | 操作日志 | 业务写操作（用户/角色/菜单/字典/设置增删改） | `user.create` / `role.update` | 有（操作者） | 改前/改后摘要、目标 ID |
| `login` | 登录日志 | 登录成功/失败、登出、token 刷新（单独归类，不与 api 重复） | `login.success` / `login.fail` / `logout` | 成功时有 | IP、UA、失败原因 |
| `api` | API 日志 | 其他关键业务接口调用（不含登录类） | `GET /api/users` | 有/匿名 | 路径、状态码、耗时 |
| `error` | 错误日志 | 未捕获异常、业务异常、权限拒绝(403) | `error.500` / `error.forbidden` | 可有可无 | 错误栈、请求上下文 |

> 说明：`login` 与 `api` 不重叠——登录/登出/刷新归 `login`，`api` 只记其他业务接口。`error` 与 `operation`/`api` 按结果分桶，可并存（一次失败的操作同时记 operation + error）。

---

## 4. 系统设置预置 Key（种子）

| key | group | 说明 | value 示例 |
| --- | --- | --- | --- |
| `site.title` | basic | 站点标题 | `"Better Admin"` |
| `site.logo` | basic | Logo URL | `"/logo.svg"` |
| `site.description` | basic | 站点描述 | `"..."` |
| `user.allowRegister` | user | 是否开放注册 | `false` |
| `user.passwordExpireDays` | user | 密码有效期(天) | `90` |
| `theme.primary` | theme | 主题主色 | `"#..."` |
| `theme.darkMode` | theme | 默认深色模式 | `"system"` |
| `system.logRetentionDays` | system | 日志保留天数 | `90` |

---

## 5. 国际化方案（纯前端，后端只存 key）

> 按用户决策：**撤回数据库 i18n 表**，中英文切换完全由前端 i18n 文件负责。

机制：
1. 后端只在 `menus.i18n_key` / `dict_items.i18n_key` 存**翻译键**，`label` 作中文兜底。
2. 前端建 `zh-CN.json` / `en-US.json`，按 key 映射：`{ "menu.users": "用户管理" / "User Management", "dict.user_status.active": "启用" / "Active" }`。
3. 渲染逻辑：有 `i18n_key` 且当前语言有对应项 → 用翻译；否则回退 `label`。
4. 新增语种（如日文）只加前端 `ja-JP.json`，后端 `i18n_key` 不变，零后端改动。
5. 前端静态 UI 文案（按钮「新增」等）也走同一套前端 i18n，保持一致。

> 代价：翻译内容在前端文件，非后台可在线编辑。Admin 系统中英文固定，可接受；将来若需可视化编辑翻译，再引入 translations 表（属新增能力，非改架构）。

> **字典/菜单 i18n 管理规范（后端协作约束）**：若 `menus` / `dict_items` 提供了 `i18n_key`，**前端将优先使用该 key 到 `zh-CN.json` / `en-US.json` 映射翻译**，`label` 字段仅作为语言包缺失时的中文兜底。因此：
> - 后端人员**不得随意修改已绑定 `i18n_key` 的 `label` 字段值**——改动不会反映到前端（前端读的是 key 对应的语言包），反而会造成「数据库 label 与前端显示不一致」的困惑。
> - 若确需调整某菜单/字典项的显示文案，应**同步修改前端 `zh-CN.json` / `en-US.json` 中对应 key 的条目**，确保中英文一致；数据库 `label` 仅保持与 `zh-CN` 一致即可。
> - 新增带 `i18n_key` 的菜单/字典项时，必须同步在前端语言包登记该 key，否则前端会回退到 `label`（中文），英文环境下显示异常。

---

## 6. 种子数据（Phase 2 初始化）

- **角色**：`super_admin`（权限位 = `9223372036854775807`，即全 1 掩码，代表拥有全部 `PERMISSIONS` 位，详见 §1.1 超级管理员全量位约定）、`admin`。
- **用户**：`admin` / `admin123`（bcrypt 哈希；`SEED_ADMIN_PASSWORD` 环境变量可覆盖，缺省回退 `admin123`），关联 `super_admin`。
- **菜单树**：概览/Dashboard、系统管理（用户/角色/权限/菜单/日志）、系统设置；各自带 `permissions` 按钮位 + `i18n_key`。
- **字典初值**：`user_status`(active/disabled)、`log_type`(operation/login/api/error) 等，带 `i18n_key`。
- **设置**：§4 的 8 个 key。
- 种子脚本与迁移脚本分离，避免在共有库污染；建议在隔离测试库先跑通。

---

## 7. 与 requirements 需求清单对齐

| requirements §10 模块 | 对应表 / 设计 | 状态 |
| --- | --- | --- |
| 10.1 用户管理 | `users` + `user_roles` + 位掩码权限 | 已建模 |
| 10.2 角色管理 | `roles` + `role_menus` + 权限配置 | 已建模 |
| 10.3 权限管理 | `PERMISSIONS` 枚举 + `menus.permissions`/`role_menus.permissions` 位 | 已建模（位掩码方案） |
| 10.4 菜单管理 | `menus`（树形 + 按钮位 + i18n_key） | 已建模 |
| 10.5 Dashboard | 数据统计（后续接口，不在本 Schema） | 后续阶段 |
| 10.6 系统设置 | ~~`settings`~~ | v0.3 移除（含端点与权限位） |
| 10.7 日志 | `logs`（4 类型） | 已建模 |
| 字典管理（用户补充） | `dict_types` + `dict_items` | 已建模 |
| 国际化（用户补充→撤回） | 纯前端 i18n，后端只存 key | 已约定 |

---

## 8. 后续步骤（不在此文档执行）

1. 编写 `nest/openapi/openapi.yaml`（API Contract，覆盖各模块端点、统一响应、错误码、权限装饰器约定）——Single Source of Contract。
2. 初始化 NestJS 工程 + Drizzle 接入（运行时连 6543 pooler，迁移用 5432 直连）。
3. 按 Contract 实现各模块（auth/users/roles/permissions/menus/dict/logs）。
4. 种子脚本 + 迁移脚本。
5. Swagger 文档可访问 + 基础测试。
6. 更新 `AGENTS.md` 阶段状态。

---

## 9. 变更记录

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-28 | v0.4 | 契约 v1.4：`menus.target` 列移除（真实库已 DROP COLUMN），外链打开方式由前端按 `to` 是否外链推导，菜单字段与权限位无其它变化。 |
| 2026-08-21 | v0.1 | Phase 2 数据库设计方案：位掩码 RBAC、9 张表（无 i18n 表）、日志 4 类型、设置预置、字典、纯前端 i18n 约定。仅文档，未开发。 |
| 2026-08-21 | v0.2 | 六项关键改进：超级管理员全量位(`9223372036854775807`)、主键 `nanoid(12)` 强制服务端生成、users 软删部分唯一索引、新增 `SETTINGS_UPDATE` 独立位、日志自动清理策略、字典/菜单 i18n 管理规范。仅文档，未开发。 |
| 2026-08-28 | v0.3 | 新增管理用全量菜单树约定（`GET /api/menus/tree`，契约 v1.3，支持 search 模糊与 order 排序方向）；**移除 `settings` 表/模块与 `SETTINGS_UPDATE` 权限位**；新增 `RESET_PASSWORD`(128) 位守卫重置密码端点（`RESET` 保留为前端「重置」按钮显隐位），权限点共 8 个，真实库已 DROP settings 表；`menus.to` 增加部分唯一索引（NULL 不约束）与格式/唯一校验（MENU_TO_INVALID / MENU_TO_EXISTS）。 |
| 2026-08-21 | v0.3 | 新增 §1.5 菜单树权限填充性能约束（禁止 N+1，O(1) 内存映射法，仅 2 次查询）。仅文档，未开发。 |
