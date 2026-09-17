# 演示站路线图 — 演示上线准备 + Dashboard 概览 + Playground 演示场

> 本文档是「演示上线准备」「Dashboard 概览页」「Playground 演示场」三大功能块的唯一计划清单。
> 结论性进度记录写入 [`progress.md`](progress.md)；规则性约束一律引用 [`AGENTS.md`](../AGENTS.md) 与 [`ui-spec.md`](ui-spec.md)，不在本文重复。

---

## 1. 背景与定位

- 项目定位为**演示项目**（上线后谁都可以登录），在主体业务（用户 / 角色 / 权限 / 菜单 / 字典 / 日志 / 组织中心）之外需要补三类能力：
  1. **演示上线准备**：线上数据重置为逼真的 faker 数据集、全站只读守卫、快捷登录、日志降噪——这是公开上线的前提，也为 Dashboard 提供有时间分布的真实数据；
  2. **Dashboard 概览页**：当前四端首页均为占位（React 空壳 div、Next 同款空壳、Vue / Nuxt `PlaceholderPage`），既完成既有待办，又作为全栈能力的门面；
  3. **Playground 演示场**：纯前端静态组件演示（rare-ui 组件集 + number-flow 等），体现「同一套产品多套技术栈」的技术广度。
- 参考原型：旧项目 `better-nuxt/app/pages/playground`（auto-animate / charts / count-to(number-flow, smart-ticker) / draggable / file-viewer / lightbox / qrcode / spinner / swiper）；**演示组件来源（2026-09-14 菜单定稿）**：[rare-ui](https://rareui.com)（MIT，shadcn registry，React 源码 vendor 进仓库，Vue / Nuxt 端按其视觉重写）+ `@number-flow`（官方 React / Vue 双包）。
- **UI 基准**：React 是 UI Source of Truth，本计划所有页面先在 React 端定稿，Next / Vue 随后对齐（`AGENTS.md` §7）。

---

## 2. 启动门槛（Gate，硬性）与总顺序

> Gate-1 / Gate-2 只约束 Phase 0 与 Phase C；Playground 为纯前端静态演示，不等 Gate（口径调整详见本节末 2026-09-14 说明）：

- [x] **Gate-1**：Nuxt 端与 React 基准**功能全部对齐**（`docs/feature-matrix.md` 中 Nuxt 列全部 ✅；口径为现有业务功能对齐，不含本计划三块，避免循环依赖）。**2026-09-16 达成**——Nuxt 26/27（仅剩 Dashboard，属 Phase C 豁免项），同日 logs 模块源码缺失 P0 修复（提交 `60546ab`）后，干净 clone 下 `typecheck` / `build` 恢复可过。
- [x] **Gate-2**：Nuxt 端**冒烟测试通过**（登录 / 菜单加载 / 各模块列表与 CRUD / 权限边界 / 登出，见 §9.4 冒烟清单口径）。**2026-09-16 用户实测通过——Gate 全部达成，Phase 0 可启动（执行清单 §3.6）。**

**总顺序（2026-09-14 重排）**：**Phase A + Phase B Playground 不等 Gate、立即启动**（纯前端静态演示，无数据依赖，与 Nuxt 收尾并发；四端同步推进）；Gate 达成后按 **Phase 0 演示上线准备 → Phase C Dashboard** 推进。每个 Phase 完成后按 `AGENTS.md` §10 提交并更新 `progress.md`。

> **Gate 口径调整（2026-09-14）**：Gate-1 / Gate-2 只约束 Phase 0 与 Phase C——faker 重置会动真实共用库、Dashboard 依赖 faker 数据集，二者必须等 Nuxt 功能全对齐 + 冒烟通过；Playground 为静态演示不在此列。Phase 0 排在 Dashboard 之前的原因不变：Dashboard 的趋势图与 KPI 环比依赖有时间分布的日志 / 用户数据，用 faker 数据集开发才看得到真实效果。**Phase 0 全部工作（含 faker 重置脚本的开发与验证）一律在 Gate 达成后启动**；本地与线上共用同一 Supabase 库，脚本验证即一次真实重置，跑完可继续开发，Gate 后再洗一次并开启 `DEMO_MODE`。

---

## 3. Phase 0 — 演示上线准备（优先于 Dashboard）

### 3.1 演示数据重置与生成（faker）

- **脚本**：`apps/nest/scripts/demo-reset.ts`，命令 `pnpm db:demo-reset --confirm`；**安全阀**：必须显式携带 `--confirm`，执行前打印目标数据库 host 与将删除的行数预估；幂等（先清后生），**固定 faker seed**，重复执行产出完全一致的数据集，便于截图 / 文档 / 四端对比稳定。`DEMO_MODE` 是线上运行时只读开关，与脚本执行解耦。
- **执行语义与时机**（本地与线上共用同一 Supabase 库，重置即两端同时生效）：
  - 重置会清空 refresh_tokens，**全端会话同时失效**，重置后需重新登录（快捷登录下成本极低）；
  - 数据写入用**事务包裹**保证原子性（头像上传是网络 IO 放事务外：先传文件，事务内落 URL），清空到生成的中间态对外基本不可见；
  - 定位是**日常可重跑的「洗数据」命令**而非一次性脚本：开发期写操作弄脏数据后，随时重跑即恢复标准演示数据集；
  - 批量插入按 50~100 条分批（Supabase 连接池限制）。
- **依赖**：`@faker-js/faker`（devDependency，`zh_CN` locale）；不用 `drizzle-seed`（中文数据失真）。
- **清理范围与顺序**（按外键依赖）：真实日志 → refresh_tokens → notifications / notices → user_roles（非超管）→ users（非超管，**含 `deletedAt` 非空的软删除用户，一并物理清除**，delete 不加软删过滤）→ posts → depts → roles（非超管）。**保留**：`super_admin` 角色、内置 `admin` 用户（**密码哈希原样保留，脚本不得重设**；2026-09-17 拍板：其余绑定 super_admin 的测试账号 test2 / test3 视为残留一并清理，脚本以 `username = 'admin'` 为唯一保留判据，admin 缺失或未绑定 super_admin 时拒绝执行）、菜单、字典（`settings` 表已随契约 v1.3 移除，不再列入）。
- **生成规模与逼真度设计**：

| 数据 | 规模 | 逼真要点 |
| --- | --- | --- |
| 组织树 | 30~50 节点 | 公司 → 中心 / 事业群 → 部门 → 小组，名称贴合真实企业 |
| 岗位 | 20~30 | 与部门匹配（技术总监属研发中心、HR 专员属人力部等） |
| 用户 | 100~200 | `zh_CN` 姓名、性别、手机 / 邮箱格式合规、入职时间分布近 1~3 年、**统一演示密码 `demo1234`**（脚本常量；满足契约 v1.8.0 策略：8~20 位 ASCII、含字母与数字、不含用户名；仅供服务端 demo-login 使用，前端不暴露） |
| 演示角色 | 5 个 | 比例 系统管理员 5% / 部门主管 10% / HR 专员 5% / 普通员工 70% / 访客 10%；权限矩阵见下表（2026-09-15 拍板默认版） |
| 公告 | 30~50 | 富文本正文、不同范围 / 状态 / 发布时间 |
| 日志 | 500~1000 | login / operation / api / error 四类，**时间分布近 30 天**，打 `seed` 标记（见 §3.4 永久布景） |

- **演示角色权限矩阵**（菜单可见性 + 按钮位；`super_admin` 不在此列，保持既有全量位）：

| 角色 | 可见范围 | 按钮位 |
| --- | --- | --- |
| 系统管理员 | 除超管保护项外全部菜单（设置全套 + 组织中心全套 + 演示场） | 全部按钮位（受只读守卫拦截，仅用于展示按钮可见性） |
| 部门主管 | 组织中心全套 + 设置只读（用户 / 角色 / 菜单 / 字典 / 日志页面可见） | 组织中心增删改位；设置页面无按钮位 |
| HR 专员 | 用户管理 + 组织中心（组织 / 岗位 / 通讯录 / 公告） | 用户与组织中心增删改位 |
| 普通员工 | 公告 / 站内信 / 通讯录 / 架构图谱 / 演示场 | 无按钮位（纯查看） |
| 访客 | 最小集：公告 / 站内信 | 无按钮位 |

- **头像**：脚本在**服务端下载真人风格头像后转存 Supabase Storage `avatars` bucket**（脚本持密钥、浏览器不接触，符合 `AGENTS.md` §5 豁免规则），头像 URL 落库为自家 Storage 域名，无外链依赖。来源选逼真的真人照片风格（faker `image.personPortrait({ sex })` 或同等真人风格数据集），**性别与用户性别字段匹配**；单张下载失败回退空头像走首字。**Storage 文件名用确定性命名**（如 `demo/0012.jpg`，按 seed 序号），重置时同名覆盖——用户主键是 nanoid 每次重置都会变，文件名若跟主键走会在 Storage 累积垃圾文件。

### 3.2 只读守卫（服务端权威 + 前端识别）

- **Nest**：全局 `DemoReadonlyGuard`，`DEMO_MODE=true` 启用；默认拦截**所有非 GET** 请求；白名单用 `@DemoAllowed()` 装饰器标在 handler 上（不维护路径表）：
  - `POST /auth/login`、`/auth/refresh`、`/auth/logout`、`/auth/demo-login`
  - `POST /notifications/:id/read`、`/notifications/read-all`（只改当前用户自身已读状态）
- 拦截统一返回 **403 `{ code: 'DEMO_READONLY', message: '演示环境，禁止修改数据' }`**，前端按 code 映射 i18n 文案。
- **超管双保险**：用户层面 `reset-password` / `status` / `DELETE` 对 `super_admin` 目标永久拦截（与角色层面既有 `SUPER_ADMIN_ROLE_PROTECTED` 对齐，缺则补齐），与 `DEMO_MODE` 无关。
- **前端 React / Vue**：请求拦截器**只识别响应中的 `DEMO_READONLY`** 弹统一 toast，**不预拦、不隐藏写按钮**——访客可打开新建 / 编辑表单、看到校验，点提交时才被拦，把只读代价降到最低；规则只在后端一处维护。
- **Next / Nuxt**（独立全栈）：各自在 route handler 层实现同名逻辑，共用 `DEMO_MODE` 变量名与 `DEMO_READONLY` 错误码（Nuxt 随 Phase 0 一并实现，不再仅记录）。
- **不做演示横幅**，`/auth/me` 不增加 `demoMode` 字段，页面与平时系统一致，操作被拦时的提示即足够。

### 3.3 快捷登录

- 登录页**移除 GitHub / Google 占位按钮**（当前仅 toast「开发中」），替换为「管理员」「随机用户」两个快捷登录按钮。
- 契约新增 **`POST /auth/demo-login { kind: 'admin' | 'random' }`**，服务端直接签发（响应结构同 `/auth/login`），前端不接触任何密码；`DEMO_MODE` 关闭时返回 404，本地开发无感。
- **admin**：从「系统管理员」演示角色的用户中随机一人。
- **random**：两级随机——先从其余演示角色池随机一个角色，再从该角色关联用户中随机一人；保证每个角色被登录概率均等、每个用户都有机会登录，登录日志的操作人与角色多样。
- **超管永不进任何快捷池**，只能通过用户名密码登录，密码仅项目所有者持有。
- 登录成功 toast 沿用系统既有行为，文案可带「姓名 · 角色」帮助访客识别当前身份（可选）。

### 3.4 日志降噪与增长治理

> 现状：`LoggingInterceptor` 每个 HTTP 请求写一条 `type=api` 日志（`LOG_API_ENABLED` 默认开）；`HttpExceptionFilter` 每个异常写一条 `type=error`；`login` / `operation` 由各 service 手动写；`log-cleanup.service` 每日 03:00 统一保留 30 天（`LOG_RETENTION_DAYS`）。

- [ ] `LoggingInterceptor` 增加 `LOG_API_SKIP_GET` 开关：演示环境 **GET 不记 api 日志**，非 GET 照记（只剩白名单与被拦请求，量极小）；本地开发保持全记。
- [ ] `HttpExceptionFilter` 对 `DEMO_READONLY` **不写 error 日志**（否则访客乱点删除即刷库）。
- [ ] `login` 日志保留，是 Dashboard 趋势图的活数据；30 天滚动可控。
- [ ] `log-cleanup` **跳过带 `seed` 标记的日志**（faker 日志作为永久「布景」保留），真实日志按 `LOG_RETENTION_DAYS` 滚动。
- [ ] refresh_tokens 过期清理：确认现有机制，缺则补一条 cron。

### 3.5 契约与环境变量

- **OpenAPI v1.9.0 → v1.10.0**（v1.9.0 已被 super_admin 绑定不变量守卫占用，2026-09-12）：新增 `POST /auth/demo-login`；通用错误响应登记 `DEMO_READONLY`（403）。Dashboard 的 `stats` 契约顺延为 v1.11.0（§4.3）。
- **环境变量**：`DEMO_MODE`（默认 false）、`LOG_API_SKIP_GET`（默认 false）、`LOG_RETENTION_DAYS`（已有）；各端 `.env.example` 登记（`AGENTS.md` §9）。

### 3.6 执行清单（Gate 达成后启动；每完成一项打钩，进度记录写 `progress.md`）

> 依赖关系：Step 1 与 Step 2 无依赖可并行；Step 3 依赖 Step 1 的契约与 Step 2 跑出的演示角色数据；Step 4~7 依赖 Step 3 的 demo-login 与错误码；Step 8 收尾。总量级约 4~6 个工作日。

**Step 1 — OpenAPI 契约 v1.10.0**（半天）**——2026-09-17 完成（`d7b7bb3`）**

- [x] `POST /auth/demo-login` 请求体 `{ kind: 'admin' | 'random' }`、响应复用 `/auth/login` 结构、`DEMO_MODE` 关闭时 404
- [x] 通用错误响应登记 403 `DEMO_READONLY`
- [x] 契约变更记录（`openapi.yaml` 头部 changelog）+ 四端影响评估

**Step 2 — faker 重置脚本 `apps/nest/scripts/demo-reset.ts`**（1~2 天，与 Step 1 并行）**——2026-09-17 完成（`1e5d48f`）**

- [x] 安装 `@faker-js/faker`（devDependency，锁版 10.6.0）
- [x] 骨架：`--confirm` 安全阀（打印目标库 host + 将删行数预估）、固定 seed、分批插入（100 条/批）、数据写入事务包裹
- [x] 清理逻辑：按 §3.1 顺序物理删除（含软删除用户）；保留超管（密码哈希不动）/ `super_admin` / 菜单 / 字典
- [x] 生成：组织树 → 岗位 → 5 个演示角色 + 权限矩阵写入 `role_menus` → 用户（按比例分配角色、密码 `demo1234`）→ 公告 → 日志（四类、近 30 天、`seed` 标记）
- [x] 头像：下载真人照片（性别匹配）→ 转存 Storage `demo/00xx.jpg`（同名覆盖）→ 事务内落 URL；单张失败回退空头像
- [x] `package.json` 加 `db:demo-reset` 脚本命令
- [x] 验证：在共用库跑一遍（即一次真实重置），逐模块页面看数据观感（**页面观感留用户 GUI**）；超管原密码可登录；重跑一次确认数据集一致（11 表指纹一致）

**Step 3 — Nest 服务端改造**（1 天）**——2026-09-17 完成（`4147654`）**

- [x] `DemoReadonlyGuard` 全局注册（`DEMO_MODE=true` 启用，默认拦所有非 GET）+ `@DemoAllowed()` 装饰器
- [x] 白名单标注：auth `login` / `refresh` / `logout` / `demo-login`；notifications `:id/read` / `read-all`
- [x] `HttpExceptionFilter`：`DEMO_READONLY` 不写 error 日志
- [x] `LoggingInterceptor`：`LOG_API_SKIP_GET` 开关，GET 不记 api 日志
- [x] `demo-login` 端点：admin = 系统管理员角色随机一人；random = 其余四角色两级随机；超管永不进池
- [x] 超管双保险：users `reset-password` / `status` / `DELETE` 对 `super_admin` 目标永久拦截（v1.4.6 已有，经代码确认覆盖）
- [x] `log-cleanup` 跳过 `seed` 标记日志
- [x] refresh_tokens 过期清理：确认现有缺失，补 `RefreshTokenCleanupService` cron（每日 03:30）
- [x] `.env.example` 登记 `DEMO_MODE` / `LOG_API_SKIP_GET`
- [x] 验证：本地开 `DEMO_MODE`，curl 逐条过白名单放行 / 其余非 GET 全拦 / 超管保护 / 登录-刷新-退出链路完整；**e2e 测试未补齐**——项目无测试基建，备案 `code-review-backlog.md`

**Step 4 — React 端**（半天）

- [ ] 登录页移除 GitHub / Google 占位按钮 → 「管理员」「随机用户」两按钮（调 demo-login）
- [ ] 请求拦截器识别 `DEMO_READONLY` → 统一 toast（i18n 键 zh-CN / en）
- [ ] 登录成功 toast 带「姓名 · 角色」（可选）
- [ ] 验证：两种 kind 登录成功；写表单可打开、校验可见、提交被拦 toast

**Step 5 — Vue 端**（半天，与 Step 4 同构平移）

- [ ] 登录页两按钮 + 拦截器 toast + i18n
- [ ] 验证同 Step 4

**Step 6 — Next 端**（1 天，独立全栈）

- [ ] server API：`demo-login` route handler + 只读拦截（共用 `DEMO_MODE` / `DEMO_READONLY`）+ 白名单
- [ ] 登录页两按钮 + 拦截器 toast + i18n；`.env.example` 登记
- [ ] 验证同 Step 3 + Step 4

**Step 7 — Nuxt 端**（1 天，与 Step 6 同构）

- [ ] server API 同名实现 + 登录页 + toast + i18n；`.env.example` 登记
- [ ] 验证同 Step 6

**Step 8 — 统一验收与上线**

- [ ] §9.2 验收清单逐项过（curl 直拦、脚本幂等、头像全自家域名、GET 不记日志、拦截不写 error 日志）
- [ ] `feature-matrix.md` 新增演示模式行（快捷登录 / 只读守卫，四端状态）
- [ ] 执行 `demo-reset` 洗数据 → 各端线上环境配 `DEMO_MODE=true` → 上线
- [ ] `progress.md` 置顶记录 + `AGENTS.md` §19 指针同步

---

## 4. Phase C — Dashboard 概览页

> **启动条件：Phase 0（演示上线准备）完成后启动**——趋势图与 KPI 环比依赖有时间分布的 faker 数据集（§2 总顺序、§4.3 数据底座）。

### 4.1 设计目标：高级感视觉基准

> 总要求：**高大上、逼真、有高级感**。参照 Vercel / Linear / shadcn 一系的克制式高级感——靠**排版层级、留白、渐变与微动效**取胜，不堆砌装饰。以下为可验收的设计基准，四端共用。

**布局骨架**（Dashboard 模式，对应 `ui-spec.md` §1.2）：

```text
┌──────────────────────────────────────────────────────────────┐
│  页头行：欢迎语（时段问候 + 用户名）        [时间范围切换 Tabs] │
├──────────────────────────────────────────────────────────────┤
│  KPI 行（4 张统计卡，等宽网格）                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │图标徽标  │ │ 图标徽标 │ │ 图标徽标 │ │ 图标徽标 │             │
│  │大数字⤴   │ │大数字⤴  │ │大数字⤴  │ │大数字⤴  │  ← Number Flow│
│  │+12.5%▁▂▃│ │-2.1%▂▃▅ │ │...sparkline│ │        │             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
├──────────────────────────────────────────────────────────────┤
│  主图表（占 2/3）：近 7/30 日登录趋势 渐变面积图               │
│  副卡片（占 1/3）：角色占比 环形图 / 组织构成                   │
├──────────────────────────────────────────────────────────────┤
│  最近动态（1/2）：操作日志流（图标 + 人 + 动作 + 时间）         │
│  最新公告（1/2）：公告列表（标题 + 时间 + 已读状态）            │
└──────────────────────────────────────────────────────────────┘
```

**视觉语言拆解（四端统一遵循）**：

1. **KPI 统计卡**：大号数字排版（`text-3xl` 级、tabular-nums），数字**滚动动画**（Number Flow）；左上角图标徽标（主色 10% 透明度底 + 主色图标）；右上角环比 badge（涨/跌配色取语义色 token）；卡片底部内嵌**迷你 sparkline**（纯 Recharts 微型图，无坐标轴）。
2. **主趋势图**：Recharts AreaChart，面积使用主色**垂直渐变**（主色 → 透明），线宽 2、平滑曲线（`monotone`），网格线用 `--divider` 级弱色，悬浮 Tooltip 跟随并带毛玻璃背景（backdrop-blur + 半透明 surface 色）。
3. **微交互**：卡片 hover 阴影微升（既有 shadow token）；区块**入场 stagger 动画**（透明度 + 位移，React 端遵循 `vercel-react-view-transitions`，不引入第三方动画库）；数字滚动仅在数据到达后触发一次。
4. **加载态**：整页 Skeleton 骨架（布局与真实内容一致，杜绝跳变）；图表区骨架为等高灰色块。
5. **深浅色模式**：两套模式均需逐像素过一遍；深色下可给主图表区极弱的主色光晕（主色 5%~8% 透明度径向渐变），克制使用，不新增任何色值。
6. **硬性约束**：全部使用现有项目级 Design Tokens（`apps/react/src/styles/theme.css` oklch 变量、radius 10px、既有 shadow / spacing），**禁止新增颜色 / 圆角 / 阴影 / 字体**（`AGENTS.md` §7.3）；Vue 端不移植 token，用 Nuxt UI 默认体系实现同等视觉（`AGENTS.md` §21）。
7. **逼真数据口径**：数字全部来自真实接口聚合（§4.3），不用假数据硬编码；接口未就绪前前端以 Skeleton 呈现。数据底座即 Phase 0 的 faker 数据集。

### 4.2 页面内容规划

| 区块 | 内容 | 数据来源 |
| --- | --- | --- |
| KPI 1 | 用户总数 + 今日新增 + sparkline（近 7 日新增） | `users` 聚合 |
| KPI 2 | 今日登录次数 + 环比昨日 + sparkline | `logs`（登录类型）聚合 |
| KPI 3 | 累计操作日志 + 今日 + sparkline | `logs` 聚合 |
| KPI 4 | 组织规模（部门 / 岗位数） | `org` 聚合 |
| 主图表 | 近 7 / 30 日登录趋势面积图（Tabs 切换范围） | `logs` 按日聚合 |
| 副图 1 | 角色占比环形图（各角色成员数） | `user_roles` 聚合 |
| 副图 2 | 最新公告（3~5 条：标题 + 时间） | `notices` |
| 动态流 | 最近操作日志（8~10 条：操作人 + 动作 + 时间） | `logs` |

### 4.3 数据契约（OpenAPI 先行）

- 契约版本 v1.10.0 → **v1.11.0**，先更新 [`apps/nest/openapi/openapi.yaml`](../apps/nest/openapi/openapi.yaml) 再实现（`AGENTS.md` §6）。
- 新增（草案，字段以契约定稿为准）：
  - `GET /stats/overview` — 一次返回 KPI 计数、登录趋势序列（按 `?days=7|30`）、角色占比、最新公告、最近日志。**只读聚合接口**，鉴权为「任意已登录用户」，不要求按钮位权限；敏感字段（手机号 / 邮箱 / IP）不出现在响应中。
- 四端影响评估：React（消费方）、Next（独立 server API 同名对齐）、Vue（消费方）、Nuxt（消费方，随 Phase C 对齐）；Nest（实现方）。
- 若 `logs` 表登录事件粒度不足以支撑按日趋势，在契约定稿前确认落库口径，**不得**为图表临时改业务表结构。

### 4.4 实施顺序

1. [ ] OpenAPI v1.11.0 契约定稿（`stats/overview`）
2. [ ] Nest `stats` 模块（只读 service + e2e 测试）
3. [ ] React Dashboard（设计定稿基准版；`recharts` 按 §7 评审，`@number-flow/react` 已随 Phase A/B 引入直接复用）
4. [ ] Next 端对齐（server API 同名实现 + 页面复刻）
5. [ ] Vue 端对齐（Nuxt UI v4 + Recharts Vue 等价方案）
6. [ ] Nuxt 端对齐（Nuxt 端最后一块功能，随 Phase C 一并补齐）
7. [ ] 四端深浅色 / 响应式逐项过检 → `feature-matrix.md` 更新 → `progress.md` 记录

---

## 5. Phase A — Playground 骨架：菜单脚本 + 四端占位

### 5.0 实施步骤（四步，2026-09-14 拍板；全部完成，2026-09-14 ~ 09-16。实施细节见 progress.md 对应条目）

1. [x] **菜单录入脚本**（2026-09-14）：`apps/nest/scripts/migrate-menus-add-playground.ts` 幂等录入 §5.1 菜单树 10 节点（项目首个三级菜单；整棵树 + super_admin 授权一个事务落库；全部节点 `permissions = 0`，super_admin 补录全量位，其余角色由「角色管理」按需勾选）。**实施中根治的服务端问题**：`buildAllowedMenuIds` 原 `role_menus.permissions != 0` 过滤导致 0 位页面对普通角色不可见——经用户拍板改为「有 role_menus 关联记录即可见」（Nest / Next / Nuxt 三端同步移除，`database-design.md` §1.5 v0.10；线上「异常页」三子页同获修复，备案见 `code-review-backlog.md`）。
2. [x] **四端文件占位**（2026-09-14）：四端 `/playground/*` 路由与 7 页占位（统一渲染 `PlaceholderPage`）+ i18n 键（`menu.playground.*` 10 键 + `features.playground.placeholder`）四端 zh-CN / en 同步；Vue / Nuxt `MENU_REQUIRED_PATHS` + `ROUTE_TITLE_KEYS`、Next `route-title.ts` 登记（React / Next 菜单门卫为「非登录白名单即受控」，无需登记）。`PlaygroundIntro` 信息卡骨架顺延为步骤 3 首项（React 端定稿，避免四端先铺再返工）。**验收（2026-09-15，React 端 GUI 冒烟）**：角色授权可见性、三级菜单展示、7 个占位页均正常。
3. [x] **React 基准开发**（UI Source of Truth，2026-09-15）：`PlaygroundIntro` + `meta.ts` / `registry.ts` 机制（§5.2）——版本经 `packageVersion()` 从 `package.json` JSON import 读取、参数类型收敛为 `keyof typeof pkg.dependencies`（登记未安装的包编译期即报错）；页面骨架 / 控件抽成 `demo-section.tsx` + `demo-controls.tsx` 供七页复用；rare-ui 六组件按 §6 清单 vendor（`cn` 导入改 `@heroui/react`，移除 `"use client"`，shadcn / 硬编码色替换为项目 token，github-activity 增补 i18n 出口），未初始化 shadcn 基建；依赖按 §7 锁版安装。七页全部实现，i18n 116 键（React + Next 语言包同步）。GUI 冒烟发现并修复 HeroUI 全局 `.tag` 类与 prism token 撞名（机制沉淀 `mechanisms.md` §27）与无边框区浮动按钮裁切两项。
4. [x] **逐端对齐**（2026-09-15 ~ 09-16）：**Next**（2026-09-15）——`features/playground/` 自 React 端整体平移：vendor 六组件与客户端 tsx 加回文件顶部 `"use client"`，7 个 `meta.ts` 的 `source` 指向 `apps/next/`，`PlaygroundIntro` 的 `usedIn` 跳转改 `next/navigation`；`motion` / `prism-react-renderer` / `@number-flow/react` 三依赖同版锁入；构建产物核实 motion / prism 均隔离在演示页按需 chunk，未进首屏大包；page.tsx 保持服务端组件导出 `generateRouteMetadata`。**Vue / Nuxt**（2026-09-16）——按 React 视觉以 Nuxt UI 内置组件 + 自定义组件重写（组件优先级见 `AGENTS.md` §21）：高亮 `prismjs` 直渲染（自实现 prism-react-renderer 的 normalizeTokens 语义逐行渲染），动画一律 CSS transition / `<Transition>` / `<TransitionGroup>` FLIP / Canvas RAF 等效（**motion-v 评审结论：不引入**），`useDemoActive` 组合式统一 keepAlive 暂停；引入 `clsx` + `tailwind-merge`（新增 `cn` 工具）与 `@number-flow/vue`；Nuxt 端自 Vue 平移，canvas 三页 `<ClientOnly>` 包裹。两端 lint / test 全绿，GUI 冒烟 7 页 + 深浅色 + keepAlive 通过，**用户本地 GUI 验证通过**（Next 端 GUI 冒烟经用户本地复核通过（2026-09-16）；Nuxt typecheck / build 原受 logs P0 阻塞，2026-09-16 修复后解除）。

### 5.1 菜单树（含三级菜单，共用库单点数据、四端自动一致）

```text
演示场 / Playground（一级目录，lucide FlaskConical）
├── 代码块 / Code Block    （二级页面  /playground/code-block）
├── 数字动画 / Count To（二级目录）
│   ├── Number Flow        （三级页面  /playground/count-to/number-flow）
│   └── Animated Counter   （三级页面  /playground/count-to/animated-counter）
├── Ai Kit（二级目录）
│   ├── Fluid Orb          （三级页面  /playground/ai-kit/fluid-orb）
│   ├── Grid Reveal        （三级页面  /playground/ai-kit/grid-reveal）
│   └── Matrix Orb         （三级页面  /playground/ai-kit/matrix-orb）
├── GitHub Activity         （二级页面  /playground/github-activity）
└── 主题切换动画 / Theme Switch Animation（二级页面  /playground/theme-switch-animation）
```

- 页面节点 `keepAlive` 开启、目录节点关闭（演示页纯静态、无写库副作用）；三级菜单同时作为侧边栏深层级渲染的真实演示。图标（lucide kebab-case，已核对同时存在于 lucide-react 1.x 与 @iconify-json/lucide）：演示场 `flask-conical` / 代码块 `square-code` / 数字动画 `hash` / Number Flow `arrow-up-1-0` / Animated Counter `tally-5` / Ai Kit `sparkles` / Fluid Orb `orbit` / Grid Reveal `grid-2x2` / Matrix Orb `atom` / GitHub Activity `calendar-days`（lucide-react 1.x 已移除品牌图标 `github`，改用热力图语义）/ 主题切换动画 `sun-moon`（2026-09-16 追加，sort 4 排 GitHub Activity 之后，经 `apps/nest/scripts/migrate-menus-add-theme-switch-animation.ts` 幂等录入）。
- 三级菜单验证点：**展开态四端已代码级核实递归渲染**——React / Next `SidebarGroup → MenuLevel` 递归、Vue / Nuxt `toNavLeaf` 递归映射 + Nuxt UI 4.11 `NavigationMenu` vertical 模式经 `ReuseItemTemplate(level + 1)` 递归渲染子级手风琴；**折叠态**（React / Next 折叠菜单；Nuxt UI 折叠态 `UPopover` 仅平铺一层子项）、面包屑、命令面板搜索已经用户 GUI 实测过检通过（2026-09-16），四端一致。
- [x] 演示页通用规范（四端已随 Phase B 落地）：React 路由 `src/routes/_authenticated/playground/<demo>.tsx`（三级页为 `playground/count-to/<demo>.tsx`）、实现 `src/features/playground/<demo-name>/`，其余三端按各自路由约定建同名路径；页首固定 `PlaygroundIntro` 信息卡（规范见 §5.2）；开启 `keepAlive`；i18n 全量跟进；Nuxt 端 canvas / 动画组件以 `<ClientOnly>` 包裹防 SSR 水合报错。

### 5.2 页首信息卡 `PlaygroundIntro` 规范（四端统一）

> 每个演示页顶部固定一张信息卡，由**一个共享组件 + 一份元数据**驱动，页面本身不手写任何说明文案或链接。

**元数据类型**（每个演示目录下就近维护 `meta.ts`，`features/playground/registry.ts` 汇总导出，供未来索引页复用）：

```ts
type DemoPackage = {
  name: string;     // npm 包名，如 "@number-flow/react"
  version: string;  // 从各端 package.json 自动读取（JSON import），禁止手写
  github: string;   // 仓库地址（需手填，无法从包名推导）
  docs?: string;    // 官方文档 / 官网（可选）
  npm?: string;     // 缺省由包名推导 https://www.npmjs.com/package/<name>
};

type DemoMeta = {
  titleKey: string;        // i18n：演示标题
  descriptionKey: string;  // i18n：这个演示展示什么
  scenarioKey: string;     // i18n：主要用于什么业务场景
  usedIn?: { labelKey: string; to: string }[]; // 项目内已使用该能力的业务页，可点击跳转
  packages: DemoPackage[]; // 零依赖演示传空数组 → 显示「零新依赖 · 复用 xxx」标签
  source: string;          // 仓库内源码路径，渲染为 GitHub 文件链接
};
```

**展示结构**（React 用 HeroUI Card 定稿，Next 同构复用，Vue 用 Nuxt UI `UCard` + `UBadge` + `UButton` 复刻）：

| 区域 | 内容 |
| --- | --- |
| 标题区 | 标题 + 描述 + 「主要场景」一段（均 i18n） |
| 依赖区 | 每个包一枚 Chip：`包名@版本` + 三个图标外链（npm / GitHub / Docs，`noopener` 新窗口）；零依赖显示「零新依赖」标签并列出复用的现有包 |
| 关联区 | 「查看源码」GitHub 文件链接；「项目内使用」跳转按钮（如 Number Flow → Dashboard KPI 数字滚动，Phase C 完成后回填 `usedIn`，把演示与真实业务串起来） |

**硬性约束**：

- 版本号一律来自各端 `package.json` 自动读取，避免手写漂移；npm 地址由包名推导，只有 GitHub / Docs 需手填。
- 仓库地址与分支放常量（或公开环境变量），源码链接由 `source` 相对路径拼接。
- 文案全部走 i18n key，禁止硬编码中英文；深浅色过检与其他页面同口径。
- 依赖信息与 §7 依赖评审清单**一一对应**：评审新增一个包，对应演示页的 `meta.ts` 同步登记。

## 6. Phase B — Playground 演示页实现（React 基准 → 逐端对齐）

> **Phase B 已全部完成**（2026-09-15 React 基准 → 2026-09-16 三端对齐，含追加的主题切换动画页，共 8 页；实施记录见 §5.0 步骤 3-4 与 progress.md）。本节表格保留为「来源 / 依赖 / 对齐方案」对照记录。
>
> 依赖一次性评审通过后实施（清单见 §7），不零散添加。rare-ui 为 MIT 协议 shadcn registry：**React / Next 直接 vendor 其组件源码**（`cn` 导入改 `@heroui/react`，见 §5.0 步骤 3）；**Vue / Nuxt 无对应实现，按 React 视觉以 Nuxt UI + 自定义组件重写**（`AGENTS.md` §21），动画以 CSS 等效实现（motion-v 经评审**不引入**，§7），验收以「四端交互一致」为准。

| 演示页 | 来源 / 新依赖（React · Next） | Vue · Nuxt 对齐方案 | 内容 |
| --- | --- | --- | --- |
| 代码块 | rare-ui `code-block`（`motion` + `prism-react-renderer`） | 自定义重写，高亮用 `prismjs` 直渲染（`prism-react-renderer` 为 React 专属渲染器） | 多语言语法高亮 + 主题切换 / 复制 |
| 数字动画 › Number Flow（三级页） | `@number-flow/react` | `@number-flow/vue`（官方 Vue 包） | 活动 / 倒计时 / 计数输入 / 滑块联动（与 Dashboard KPI 共用同一依赖） |
| 数字动画 › Animated Counter（三级页） | rare-ui `animated-counter`（`motion`） | 自定义重写（CSS / TransitionGroup FLIP / RAF 等效） | 数字滚动计数动画 |
| Ai Kit › Fluid Orb（三级页） | rare-ui `fluid-orb`（**已核对 2026-09-15**：原生 WebGL 片元着色器，零 npm 依赖，无 three.js 等重依赖） | 按源码移植 canvas 实现 | 流体光球视觉演示 |
| Ai Kit › Grid Reveal（三级页） | rare-ui `grid-reveal` | 自定义重写 | 网格揭示动画 |
| Ai Kit › Matrix Orb（三级页） | rare-ui `matrix-orb` | 自定义重写 | 矩阵光球动画 |
| GitHub Activity | rare-ui `github-activity`（`motion`） | 自定义重写 | 贡献热力图（静态数据，不连外部 API） |
| 主题切换动画（2026-09-16 追加，非 rare-ui 清单） | `theme-switch-animation`（第三方库 `/react` 子导出，View Transitions 蒙版揭示） | 官方 `/vue` 子导出（getter 对象传参）+ `/nuxt` 模块自动导入 | 13 种蒙版揭示主题切换动画演示：类型清单 / 时长 / 缓动选择 / 方向类型 / 重置 |

- **旧清单整体移除（2026-09-14 拍板）**：Smart Ticker / 拖拽 / 富文本 / 加载态集 / 轮播 / 列表自动动画 / 图片 Lightbox / 二维码不再纳入——拖拽（`@dnd-kit`）、富文本（`@tiptap`）业务功能已上线无需重复演示，其余不再计划。
- 旧项目 `file-viewer`（Excel/PDF/Word viewer）**不做**：重依赖且偏离 Admin 场景（原决策保留）。
- 实施约束：rare-ui 源码内的 shadcn 语义类（`bg-background` / `text-muted-foreground` 等）须替换为各端项目 token（React / Next 用 HeroUI token 体系），保证深浅色跟随；动画组件在 keepAlive 后台须暂停（`onDeactivated` / 等效机制），切回恢复；全部演示不产生写库副作用、不暴露敏感数据。

## 7. 依赖评审清单（`AGENTS.md` §18 不擅自引入依赖）

| 包 | 阶段 | 理由 | 引入影响 |
| --- | --- | --- | --- |
| `@faker-js/faker` | Phase 0（devDependency）**——已引入 10.6.0（2026-09-17）** | 演示数据生成，`zh_CN` locale；仅脚本使用，不进运行时。**注意 zh_CN 无分性别名字库**（`firstName(sex)` 静默回退通用列表），脚本内置分性别名字池补齐 | 无运行时影响 |
| `pinyin-pro` | Phase 0（devDependency）**——已引入 3.29.4（2026-09-17）** | 演示用户名中国化：中文姓名 → 拼音账号（`surname` 模式处理姓氏多音字，如曾 → zeng）；纯 JS 零依赖 MIT，仅 `demo-reset.ts` 使用，不进运行时。替代方案（手工维护姓名拼音映射表）覆盖不全且维护成本更高，故引入 | 无运行时影响 |
| `motion` | Phase A/B（React / Next）**——React / Next 已引入 13.2.0（2026-09-15）** | rare-ui 全部组件的动画底座；**仅限 Playground 演示组件内部使用，不进业务代码**——`AGENTS.md` §20 路由 / 主题过渡动画仍走 View Transition API，不因此破例 | 中（按需 tree-shake；实测落在演示页按需共享包 122KB，首屏不受影响） |
| `prism-react-renderer` | Phase A/B（React / Next）**——React / Next 已引入 2.4.1（2026-09-15）** | code-block 语法高亮，较 shiki 轻量；内置 tsx / css / json / sql / python / yaml 等，**不含 bash**（未知语言降级为纯文本） | 轻 |
| `@number-flow/react` | Phase A/B（先行，Playground 引入）**——React / Next 已引入 0.6.2（2026-09-15）** | KPI 数字滚动点睛，约 10KB；Dashboard（Phase C）直接复用，依赖评审一次过 | 轻 |
| `@number-flow/vue` | Phase A/B（Vue / Nuxt）**——两端已引入 0.5.2（2026-09-16）** | Number Flow 官方 Vue 包（0.5.x，已核实存在），免重写 | 轻 |
| `clsx` + `tailwind-merge` | Phase A/B（Vue / Nuxt）**——两端已引入 2.1.1 / 3.7.0（2026-09-16）** | 各端新增约 3 行 `cn` 工具函数（React / Next 用 `@heroui/react` 导出的 `cn`，无需安装；`@nuxt/ui` v4 已核实**不**向业务代码导出 `cn`）；合计约 8KB，shadcn 生态事实标准 | 轻 |
| `prismjs`（+ `@types/prismjs` dev） | Phase A/B（Vue / Nuxt）**——两端已引入 1.30.0（2026-09-16）** | 代码块高亮：`prism-react-renderer` 为 React 专属渲染器，Vue 侧用 prism 核心直接 tokenize 后逐行渲染；语言按需注册（tsx / css / json / sql / python / bash），`Prism.manual` 关闭自动高亮 | 轻（Vue 端实测落在 code-block 按需 chunk 约 56KB，index 不含） |
| `motion-v` | Phase A/B（Vue / Nuxt）**——已评审：不引入（2026-09-16）** | rare-ui 动画重写候选（Motion 官方 Vue 版）；对齐时逐页评估，全部以 CSS transition / `<Transition>` / `<TransitionGroup>` FLIP / Canvas RAF 等效满足（唯一未复刻的是 github-activity 头像 `layoutId` 共享元素飞行，降级为淡入淡出） | 无 |
| `theme-switch-animation` | Phase B 追加（React / Next / Vue / Nuxt 四端）**——四端已引入 0.1.0（2026-09-16）** | 主题切换蒙版揭示动画库（作者 baiwumm，MIT）；React / Next 用 `/react`，Vue 用 `/vue`，Nuxt 用 `/nuxt` 模块自动导入；与项目既有 View Transition 路由 / 主题过渡并存（演示页内由库独占编排权，store 走 `applyThemeModeInstant` 让渡） | 轻（各端独立分包约 22 kB） |
| `recharts` | Phase C | Dashboard 图表（`AGENTS.md` §19 已定 Recharts）；Next / Vue / Nuxt 端各自对齐等价方案 | 图表类标准选择，体积可按需 tree-shake |

> 已移除（2026-09-14 随旧清单）：`@tombcato/smart-ticker`、`swiper`、`@formkit/auto-animate`、`yet-another-react-lightbox`、`qrcode`。
> rare-ui 组件源码（MIT）以 vendor 形式进仓库（React / Next），**不是 npm 依赖**；Vue / Nuxt 端按源码重写，同样不入依赖。
> 评审通过后按子项目分别记录于各端 package.json 并锁版本（`AGENTS.md` §15）。

## 8. 一致性同步清单

- [ ] `docs/feature-matrix.md`：新增演示模式（快捷登录 / 只读守卫）、Dashboard、Playground 相关行，随各端完成度更新 ✅/❌。
- [ ] `docs/ui-spec.md` §1.3：Dashboard 状态「占位」→「已实现」；登录页快捷登录、Playground 模式补充。
- [ ] `docs/progress.md`：每 Phase 完成置顶记录。
- [ ] `AGENTS.md` §19：当前待办指针同步。
- [ ] 契约 v1.10.0（demo-login / `DEMO_READONLY`）与 v1.11.0（stats）变更记录：`apps/nest/openapi/openapi.yaml` + `docs/progress.md`。
- [ ] 各端 `.env.example`：`DEMO_MODE`、`LOG_API_SKIP_GET` 登记。

## 9. 验收标准

> 按 §2 总顺序（执行顺序）排列：Playground → 演示上线准备 → Dashboard；§9.4 为 Gate-2 冒烟口径。

### 9.1 Playground（Phase A / B）

> **2026-09-16 逐项验收通过（用户 GUI 实测；Phase A/B 全部完成）。**

- [x] 菜单接入 RBAC：与其他菜单同流程——录入脚本写入 + 「角色管理」关联授权后才可见；未授权角色不可见且路由不可达；`super_admin` 经聚合位自然全量可见。
- [x] 三级菜单（演示场 › 数字动画 › Number Flow / Animated Counter；演示场 › Ai Kit › Fluid Orb 等）在侧边栏展开态与折叠态、面包屑、命令面板搜索中均正确渲染与高亮；路由直达时祖先分组自动展开；**四端一致**。
- [x] 每页 `PlaygroundIntro` 信息卡符合 §5.2 规范（元数据齐全、版本自动读取、npm / GitHub / Docs 外链可达、「项目内使用」跳转正确）；i18n 无硬编码文案；深浅色过检；四端信息卡结构一致。
- [x] keepAlive 保活下切走页面动画暂停、切回恢复；Nuxt 端无 SSR 水合报错。
- [x] 全部演示不产生写库副作用（写操作仅前端本地状态）；不暴露敏感数据。

### 9.2 演示上线准备（Phase 0）

- [ ] 线上任意演示账号无法完成任何增删改，**curl 直连接口同样被拦**（服务端权威）；登录 / 刷新 / 退出 / 站内信已读正常。
- [ ] 前端被拦时统一 toast「演示环境，禁止修改数据」（i18n），写按钮与表单可正常打开、校验可见。
- [ ] 超管不出现在任何快捷登录池；仅用户名密码可登录；重置脚本执行后超管密码哈希未变。
- [ ] 「管理员」登录到系统管理员角色用户；「随机用户」多次登录能覆盖全部演示角色。
- [ ] 全部头像来自自家 Supabase Storage 域名，无外链；性别与头像匹配。
- [ ] `demo-reset` 幂等：重复执行数据集一致；未带 `--confirm` 拒绝执行。
- [ ] 日志：GET 不产生 api 日志；`DEMO_READONLY` 拦截不产生 error 日志；30 天后 seed 布景日志仍在，真实日志正常滚动。

### 9.3 Dashboard（Phase C）

- [ ] 四端视觉与交互一致（布局 / 图表类型 / 微动效 / 深浅色 / 响应式断点）。
- [ ] 所有数字来自 `stats` 接口真实聚合；接口挂掉时整页 Skeleton + 错误重试，不白屏。
- [ ] 无任何敏感字段（手机号 / 邮箱 / IP）出现在概览接口响应与页面中。
- [ ] React 端遵循 `vercel-react-best-practices`（数据获取、渲染性能）；动画遵循 `vercel-react-view-transitions`。

### 9.4 冒烟测试口径（Gate-2 引用）

登录 → 菜单按角色渲染 → 用户 / 角色 / 菜单 / 字典 / 日志列表加载与基本 CRUD → 组织中心（部门 / 岗位 / 通讯录 / 公告 / 图谱）→ 我的账户 → 权限边界（无权限路由 403、按钮隐藏）→ 登出。
