# 上线前审计台账（2026-09-22）

> 四端功能对齐后，对 `docs/`、`AGENTS.md`、`apps/website`、各端代码与配置做的一次全量盘点结果。
> **本文件是本次审计的处置台账**：逐条编号、按优先级排序、记录处置状态与结论。
> 状态图例：⬜ 待处理 · 🔧 处理中 · ✅ 已修复 · 🚫 需用户拍板 · ⏸️ 延后（登记不修）· 📋 上线环节执行（非代码）

## 优先级定义

| 级别 | 判据 |
| --- | --- |
| **P0** | 线上会真实出事：功能必挂、鉴权可破、数据可被污染、冷启动拖垮演示 |
| **P1** | 契约与真源失真、对外门面错误、上线前置文件缺失 |
| **P2** | 内部文档陈旧、表述自相矛盾、结构与规范不符 |
| **P3** | 技术债与已知差异，登记后上线再议 |

---

## P0 · 线上会出事（4 条）

| # | 状态 | 事项 | 证据 | 处置 |
| --- | --- | --- | --- | --- |
| 1 | ✅ | Nuxt 缺 `GET /logs/{id}` + `DELETE /logs/{id}`，日志单条删除运行时必 404；`findLog` 成死代码 | `apps/nuxt/server/api/` 只有 `logs.get.ts` / `logs.delete.ts`；调用方 `app/features/logs/log-api.ts:30` ← `LogsPage.vue:326`；契约 `openapi.yaml:3792`；Nest `logs.controller.ts` 有 `@Get(':id')` / `@Delete(':id')` | 已补 `server/api/logs/[id].get.ts` + `[id].delete.ts`（照 `roles/[id].*` 端内范式，SEARCH / DELETE 位分别对应）；服务层 `findLog` / `removeLog` 原已存在，直接接线。验证：eslint 0 error、`nuxt build` 通过、产物 `.output/server/chunks/routes/api/logs/_id_.{get,delete}.mjs` 注册为 `/api/logs/:id`。feature-matrix「日志管理」Nuxt 行 ✅ 自此名副其实 |
| 2 | ✅ | `GET /api/health` 全仓不存在，但已被当作 Render 保活前置条件（免费层 15 分钟休眠 / 冷启动 30–50 秒） | `apps/nest/src` 14 个 controller 无 health；`openapi.yaml` 47 路径无 health；`AGENTS.md` §17 ①；`docs/vue-plan.md:202` 误称「已上线」 | 已新增 `src/modules/health/health.controller.ts`（无 AuthGuard、不触库）挂入 AppModule；契约升 **v1.14.0** 补录 `/health`（`security: []` + `x-permission: NONE` + 新增 System tag）。附带必要修正：LoggingInterceptor 显式跳过 `/api/health`——否则每次探活落一行 api 日志、且让「零依赖」端点重新依赖数据库。验证：`tsc --noEmit` 与 `nest build` 均通过、产物含 `dist/modules/health/health.controller.js`。**实机 curl 未做**：Nest 进程带日志清理 cron 且连四端共用线上库，启动验证留到上线环节（连同 §17 ① 的 UptimeRobot / CF Worker Cron 配置）。vue-plan `:202` 的错误表述随 #22 一并改 |
| 42 | ✅ | ⚠️ JWT 密钥存在可预测明文兜底，线上漏配即任何人可伪造登录态；Next/Nuxt 同类代码为显式抛错 | `apps/nest/src/auth/auth.module.ts:14`、`strategies/jwt.strategy.ts:25`：`process.env.JWT_SECRET ?? 'better-admin-secret'` | 已改：`src/config/env.ts` 成为密钥与 TTL 的唯一取值源——`getJwtSecret()` 无兜底、缺失或纯空白即抛错（与 Next/Nuxt 同口径）；auth.module / jwt.strategy / auth.service 五处签发校验点全部改接。附带修掉两处同源缺陷：① `JWT_EXPIRES_IN` 在 auth.module 兜底 `7d`、auth.service 兜底 `1h`、env.ts 兜底 `7d`，现统一为 **1h**（= 原实际生效值，行为无变化，但消除「任何省略 expiresIn 的 sign 就发 7 天令牌」的地雷）；② **`JWT_REFRESH_SECRET` 空串不回退**——`'' ?? x` 仍是 `''`，而 `.env.example` 恰是 `JWT_REFRESH_SECRET=` 空值写法，照模板配置就会把空串当密钥传给 jsonwebtoken；现归一「空串/纯空白 = 未设置」并回退 JWT_SECRET，模板注释同步说明。验证：`tsc --noEmit` + `nest build` + eslint 全绿，并对 `dist/config/env` 实测五种取值（未设置→抛、纯空白→抛、空串回退、TTL 默认 1h、记住我档 30d/1d） |
| 43 | ✅ | ⚠️ 一次性脚本无环境守卫，直连共用线上库写弱口令账号 `testadmin / test123`（绑 admin 角色）；另一脚本同库改 `role_menus` | `apps/nest/scripts/create-test-user.ts:12-28`、`verify-rbac-scenario.ts`；四端共用同库（AGENTS §5） | 已按端内 `demo-reset.ts` 的既有安全阀口径给两个脚本加 `--confirm` 闸门：执行前打印目标库 host、未带 `--confirm` 即拒绝并 `exit 1`，角色缺失时同样拒绝（原代码 `adminRole[0].id` 会直接 TypeError）。**为何不用 `NODE_ENV` / host 判断**：实测 `DATABASE_URL` 直指 Supabase pooler（`aws-0-ap-southeast-1.pooler.supabase.com:6543`），本仓库 dev 与线上本就是同一个库，无法据此区分，只能靠显式确认。附带：`verify-rbac-scenario.ts` 清掉一处既有未使用 import（`userRoles`）——该 error 从未被 CI 发现的原因是 **`"lint": "eslint \"{src,apps,libs,test}/**/*.ts\""` 根本不覆盖 `scripts/`**（已记入 #46）。验证：两脚本 eslint 0 error，实跑不带 `--confirm` 均拒绝且退出码为 1。**是否直接删除这两个已失效脚本（其菜单标签口径早于契约 v1.3 移除 Settings）留待你确认** |

---

## P1 · 契约真源与对外门面失真（11 条）

| # | 状态 | 事项 | 证据 | 处置 |
| --- | --- | --- | --- | --- |
| 11 | ✅ | 对外文档站整片陈旧：仍写「四端 26/27、唯一缺口 Dashboard、Phase 0/C 未启动、Playground 7 页、契约 v1.10/v1.11」 | `apps/website/content/index.mdx:56`；`content/progress/feature-matrix.mdx:18-24`；`content/progress/roadmap.mdx:19-43`；`components/docs/diagrams.tsx:786,813,821,834-842`；`components/landing/faq.tsx:46`；`components/landing/stacks.tsx:95-111` | 已按现状重写：矩阵图与文案改 **29/29 = 100%**（分母提为 `MATRIX_DONE/MATRIX_TOTAL` 常量并注真源），虚线框改列「两处有意保留的架构差异」；路线图四阶段全 ✅（Gate 标「已过」）+ 新增契约版本表与上线清单；`index.mdx` 状态行 + Card 描述、`faq.tsx`、`stacks.tsx` 三处硬编码同步。**顺带发现并修掉 `content/architecture/api.mdx` 端点缺口**：原表恰好 44 行 = 44 条路径，漏了 `/auth/demo-login`(v1.10)、`/roles/{id}/users`(v1.13)、`/stats/overview`(v1.11)、`/health`(v1.14) 四个已实现端点，`/users` 与 `/logs` 两行还漏标批量 `DELETE ?ids=`；已补第 5 个 Tab 与 4 行、计数改 **48 路径 / 77 操作**（python 解析 yaml 实测）。验证：`next build` 通过、20 个静态页生成。**未做**：「17 张表」断言需先修后端设计文档（新增 #50），本轮不动 |
| 14 | ✅ | Vue 端图表口径过期：已迁 Unovis，文档仍写「零依赖手写内联 SVG」 | 迁移提交 `7164b26`/`7169e7b`（2026-09-20），代码 `apps/vue/src/components/chart/AreaChart.vue`、`DonutChart.vue`；未回写处 `docs/feature-matrix.md:33`、`AGENTS.md` §19 | 已三处同步：feature-matrix Dashboard 行 Vue 段改写为 Unovis 事实（并连带修正过时计数——用例 106→**101**、chart-geometry 11→**6** 例，KPI sparkline 仍手写 SVG 三端同口径）；AGENTS §19 两处（当前待办的 Vue 段 + Nuxt 段的「Vue 端维持手写 SVG」）；`progress.md` 置顶补记该迁移（§13 更新触发此前漏执行）。**遗留待复跑**：该行「环形 6 扇区 / 3 条 sparkline 描边取色」两项 DOM 实测为手写时期所做，已在本条与 #32 标注，Unovis 版未复跑 |
| 15 | ✅ | `docs/feature-matrix.md` 自相矛盾：统计表 React/Next/Nuxt 各缺 1 项，与同文件全 ✅ 的表格及「27 项 100%」注脚冲突 | `:77-80` ↔ `:33` 全 ✅、`:84-85` | **根因不止统计表**：按行实测矩阵数据行为 **29 行**（核心 10 + 组织 8 + 基础设施 11），旧「27 项」口径自 2026-09-11 起未随新增「演示模式」「Playground 演示场」两行更新——即该文件历史上同一分母已第三次失真（23→27→29）。已改：统计表四端 29/0/100%、口径注重写并加了「新增行必须同步改分母」的硬性提醒、两条「27 项全部完成」注脚、AGENTS §19「27/27」→29/29（含校正说明）。**连带影响 #11**：文档站须用的正确分母是 29，不是 27 |
| 18 | ⬜ | Shadcn 幽灵条款：文档承诺「Hero UI 主 + Shadcn 补充」，实际两端无该目录无该依赖，与 AGENTS §7.2「不含 Shadcn 组件」冲突 | `requirements.md:105/453/469`、`ui-spec.md:570/596/641-644`；实测 `apps/react|next` 无 `src/components/ui/`、无 cmdk/shadcn 依赖 | 🚫 需拍板：正式作废该条款，还是补实现（本文按作废处理，待确认） |
| 19 | ⬜ | `ui-spec.md` §8 圆角刻度停在 shadcn 时代 10/14px，HeroUI Card 实测 24px | `docs/ui-spec.md:328-342`；`progress.md:242` 已登记 | 按 HeroUI 实测值重写刻度 |
| 20 | ⬜ | `ui-spec.md` §「现状」整段仍是 shadcn-admin 旧形态，Cookie / 文件 / 依赖均不存在，且已有 empty-content / error-content / DataTable 骨架 | `docs/ui-spec.md:143,154,207,441,462,486,570` | 按 HeroUI 现状重写 |
| 21 | ⬜ | `nuxt-plan.md` 六处陈旧（契约 v1.9.0、26/27、直出标题 M5 评估、`icon.clientBundle` 已被判误、图表 Recharts 共评审、登录口径待统一） | `:6/:233/:310`、`:4/:309`、`:174`、`:183`（↔ `mechanisms.md:883`）、`:300`、`:65` | 逐条刷新或标存档 |
| 22 | ⬜ | `vue-plan.md` 陈旧：契约 v1.7.0；`:202` 称 health「已上线」为假 | `:4/:20`、`:202` | 刷新版本；该句随 #2 一并改 |
| 24 | ⬜ | `plan-dashboard-playground.md` 完成勾选未回填 + 多处陈旧现状 + `usedIn` 待回填 | `:91-95`、`:160-163`、`:235-238`；`:12/:23/:347/:359/:362`；`:302` | 核勾与刷新；§9.2/§9.3 线上口径项转 ⏸️ 上线环节 |
| 44 | ⬜ | `CORS_ORIGINS` 未被模板纳管（AGENTS §9 要求）；且 §17 ③「四端域名」口径可能本身过宽——Next/Nuxt 不消费 Nest | `apps/nest/main.ts:22-33` 缺省含 localhost×5 + react/vue；`.env.example` 无该变量 | 补 `.env.example`；🚫 白名单范围需确认 |
| 45 | ⬜ | CI 从未验证任何一端构建；`clean-logs.yml` 以生产库写权限长期挂在 GitHub Secrets | `.github/workflows/` 仅 `check-locales.yml`（只装 apps/next）+ `clean-logs.yml`（cron 直连生产 DELETE） | 挂四端 + website 的 lint/test/build 矩阵；clean-logs 改只读凭据或停用一侧 |

---

## P2 · 内部文档陈旧与规范不符（14 条）

| # | 状态 | 事项 | 证据 | 处置 |
| --- | --- | --- | --- | --- |
| 6 | ⬜ | 契约设计说明断更 5 个版本（v1.9.0→v1.13.0 只写进 yaml description）；变更记录行序非倒序 | `apps/nest/docs/openapi-design.md` §9 末条停在 v1.7.1（2026-09-09）；`database-design.md` 末行 v0.10 与 v0.6/v0.9 乱序 | 补录变更表、修行序（AGENTS §13 双文件先行）。**附带实测扩大范围**：§3「端点清单（按模块）」只写到 3.8 日志，**组织中心 / 公告 / 站内信 / Stats / v1.13.0 角色关联用户 / v1.14.0 `/health` 全部缺失**；§2 权限点仍写「共 9 个」而 EXPORT(512) 已在 v1.7.1 引入 |
| 7 | ⬜ | 契约冒烟脚本落后：只 20 个只读 GET，未含最近两次契约变更新端点，缺 8 个详情 GET；依赖 admin 密码未接 demo-login → 全量 diff 跑不动 | `apps/nuxt/scripts/contract-diff.mjs:116-137`、`:16-17`；AGENTS.md 路径误记为根 `scripts/` | 扩清单 + 凭据注入；AGENTS 路径改正 |
| 8 | ⬜ | 端点计数失真：「44 契约路径全覆盖」实为 47 path / 76 method | `openapi.yaml`；实测 Nest 76/76、Next 76/76、Nuxt 74/76（缺口=#1） | 改计数（#1 修复后为 76/76） |
| 9 | ⬜ | `super_admin` 的 role_menus 仅 24/28（缺 exception 三页 + 主题切换动画页），靠 -1n 全量位免检掩盖 | `progress.md:352` | 补授权数据（幂等脚本）或明确接受 |
| 12 | ⬜ | AGENTS §19 称文档站内容「由 `docs/` 真源自动同步」，实为手写 MDX、无同步脚本 | `apps/website/content/**`；根 `scripts/` 仅 `sync-versions.mjs` | 改表述，或立项同步机制（🚫 二选一需拍板） |
| 13 | ⬜ | website 版本停在 0.1.0，被 `sync-versions.mjs` 排除，且脚本注释与硬编码列表不符 | `apps/website/package.json`；`scripts/sync-versions.mjs:16-22` | 纳入 SUB_PROJECTS |
| 16 | ✅ | AGENTS §19 现状标记失效：「改动未提交」早已入库；Vue 端模块行的 Playground 页数仍写 9 页 | 实测 `git status --porcelain`（含 `-uall`）为空；`playground` 实为 10 页（见本页 feature-matrix 行与 #15 行数实测） | 已改：§19 两处「改动未提交」→「改动已入库」（保留仍然为真的「待 GUI 走查 / 审核」）；Vue 端模块行的「Playground 演示场（9 页…）」改为 10 页并补第 10 页组织架构树。progress.md 内 7 处同类「未提交」表述按 §13「历史记录永不回改」原则不动 |
| 17 | ⬜ | `requirements.md` 多处陈旧/自相矛盾（契约 v1.9.0、Dashboard 未实现、个人链接"后续"、Phase 6 待决策、目录树无 `apps/`、「可选 Workspace」） | `:564`、`:574/:602/:613`、`:628`、`:826`、`:73-82`、`:81` | 逐条刷新（Workspace 一条与 §3 明文一致，属错误表述） |
| 23 | ⬜ | `docs/react.md` 技术栈表 HeroUI 写 3.2.4，实际 3.2.6（表头自注「记录于 2026-08-30」） | `:33`；`apps/react/package.json` | 刷新版本 |
| 46 | ⬜ | 测试面真实缺口：`apps/next` / `apps/nest` 无 `test` 脚本（Next 0 测试文件）；website 无 lint/test/typecheck；Nest 测试基建备案仍成立。**另发现 lint 覆盖盲区**：Nest 的 `"lint": "eslint \"{src,apps,libs,test}/**/*.ts\""` 不含 `scripts/`，该目录下的 error 永远跑不到（#43 顺手修的那处未使用 import 就是这么漏掉的） | 各 `package.json`；`docs/code-review-backlog.md:33-37`；`apps/nest/package.json:22` | 🚫 立项需拍板（引入框架属架构级）。lint  glob 扩到 `scripts/` 属低风险，可与 #45 CI 挂接一并做 |
| 47 | ⬜ | `/settings` 直连四端行为不一致（占位页 / 空 div / 404）；两个 `placeholder-page.tsx` 已无引用成死文件 | Vue `pages/(authenticated)/settings/index.vue:6`、Nuxt 同、React `routes/_authenticated/settings/index.tsx:5`、Next 无 `settings/page.tsx`；死文件 `apps/react|next/src/components/common/placeholder-page.tsx` | 🚫 统一口径需拍板；死文件可直接删 |
| 48 | ⬜ | gitignore 口子：Next 只忽略 `.env*.local`（裸 `.env` 不被忽略）、Nest 不覆盖 `.env.production`、website 的 `.env*` 连 `.env.example` 一起吃掉 | `apps/next/.gitignore:28`、`apps/nest/.gitignore`、`apps/website/.gitignore:20` | 统一 `.env*` + `!.env.example` |
| 49 | ⬜ | 孤儿脚本未挂 npm script | `apps/nuxt/scripts/check-locales.mjs`、`clean-logs.mjs`；react/next `scan-stale-tokens.cjs` | 挂 script 或删除 |
| 31 | ⬜ | 契约外遗留口径：`GET /logs` search 仅匹配 action、旧权限位值清理脚本未出 | `progress.md:1636/:1774` | 登记，随下次契约变更处理 |
| 50 | ⬜ | **表数量真源失真**（修 #11 时发现）：schema 实报 **18** 张 `pgTable`，而 `database-design.md` §2 标题写「17 张」——其 17 个小节里含 `2.8 settings`（标注"已移除"却仍在 `src/db/schema/settings.schema.ts` 建表），且 **`refresh_tokens` 表（契约 v1.2 起托管 refreshToken）没有小节** | `grep pgTable` 计 18；`apps/nest/docs/database-design.md:97` 与其 §2 小节列表；`src/db/schema/settings.schema.ts:13` | 核清 settings 表是"保留但停用"还是"该删"，补 `refresh_tokens` 小节，重算表数；之后再回头定文档站「17 张表」文案（`content/architecture/database.mdx:3`、`index.mdx:66`、`diagrams.tsx:297,328`） |
| 51 | 🚫 | 文档站 `theme-switch-animation` 仍锁 **0.1.0**，四端应用已升 0.2.0 | `apps/website/package.json`；`components/theme-toggle.tsx:36` 只用 `CIRCLE_BLUR`（不在 0.2.0 移除的 LTR/RTL/TTB/BTT 之列，升级无破坏面） | 升 0.2.0 需同步补 `apps/website/pnpm-workspace.yaml` 供应链白名单（mechanisms §35）并重跑 frozen 校验，属依赖变更——待你确认是否随本轮做 |

---

## P3 · 技术债与已知差异（登记不修，2 条汇总）

| # | 状态 | 事项 |
| --- | --- | --- |
| 30 | ⏸️ | 交互与可达性近似：sortablejs 无键盘排序（Vue/Nuxt）、`UInputTags` aria 固定、command-menu 拦截 Escape、`@bprogress` 无可挂 aria 容器（待库支持）、自绘树 `role=tree` 暂缓（backlog #3） |
| 39 | ⏸️ | 服务端与缓存近似：权限快照 SPA 会话内不同步、`roleIds` 全量替换 last-write-wins 无乐观锁、accessToken 无黑名单、notices 定时发布惰性触发、Next 无 `type=api` 访问日志、Nuxt 同名 `index` 组件缓存互剪、UModal teleport DOM 残留、`ensureQueryData` 预热未实现、vccs 嵌套 include 的 alias 临时补丁（待 nuxt-charts 上游修）、Next Logo hydration 警告 |

---

## 🚫 需你拍板（8 条，不拍板不动）

| # | 事项 | 出处 |
| --- | --- | --- |
| 25 | Dashboard 两级卡片分层（浅色下会变「凹陷」）——唯一还挂起的设计决策 | `progress.md:242` |
| 18 | Shadcn 补充条款：正式作废，还是补实现 | 见 P1 #18 |
| 44 | Nest CORS 白名单范围（两端 vs 四端） | 见 P1 #44 |
| 26 | Next 登录/刷新响应体是否裁剪双 token（`login/route.ts:13` 注释称守共用契约，砍则破坏 React/Vue 响应形状） | `progress.md:1387` |
| 27 | Nest `phone` 不 trim，是否由 Next 对齐 Nest | `progress.md:889` |
| 28 | 四端 `redirectToSignIn` 带参规则未统一 | `mechanisms.md:907` |
| 29 | Next `/org/notices/[noticeId]` 详情页无 metadata | `mechanisms.md:735` |
| 51 | 文档站 `theme-switch-animation` 是否随四端升 0.2.0（现仍 0.1.0；`components/theme-toggle.tsx:36` 只用了 `CIRCLE_BLUR`，0.2.0 移除的四向擦除类型未被引用，技术上可安全升级，但升级要同步 `pnpm-workspace.yaml` 供应链白名单并触发安装，属依赖变更） | 本页 #51 |
| 30 | 角色矩阵（主管/HR 是否含演示场）+ super_admin 授权数据（关联 #9）；Vue 端是否为组件测试补 vitest plugin-vue；Scalar 白屏是否切自托管 | `plan-phase0-execution.md:146`、`progress.md:118/:402` |

---

## 📋 上线环节执行（非本轮代码修复）

| # | 事项 | 证据 |
| --- | --- | --- |
| 3 | SPA 直链回退文件缺失：React/Vue 规划 CF Pages，却只有 `apps/react/vercel.json`（Vercel 语义），两端无 `public/_redirects`；Nest 无 `render.yaml` | `apps/react/vercel.json`；`find` 无 `_redirects` |
| 4 | 上线前 admin 默认密码必须改（现 `admin123` 可登录，`.env.example` 亦同值） | `progress.md:1292`、`apps/nest/.env.example` |
| 5 | Vue / Nuxt 品牌图标缺 PNG 组（8 项），`index.html` 无 apple-touch / manifest；与「五端图标由脚本统一生成」表述不符 | `assets/logo/build-assets.py:226-248`（`app_png_targets` 仅 react/next/website）、`:316` |
| 32–39 | GUI 走查回收（okr-tree 画布三端、v1.13.0 关联用户三端、Dashboard 四端像素观感，**Nuxt Dashboard 走查仍见问题但细节未提供**；另含 #14 遗留：Vue 端 Unovis 版两图的 DOM 实测未复跑）；Next/Nuxt 补跑 build；越权实机验证（换未授权角色）；双端契约冒烟（需两端同时在线）；`git tag v0.2.0` 未打；五端部署 + 线上 `DEMO_MODE=true` + **`LOG_API_SKIP_GET` 显式开启（§5 人工清单漏此条）** | `progress.md:11/:22/:203/:509/:1292` |

---

## ✅ 已核实干净（不作为待办，防重复排查）

- Vue / Nuxt `route-access.ts` 两表对 10 条 playground 路径全部登记，与 `(authenticated)/playground/` 下 10 个页面文件一一对应 → mechanisms §34「漏登 = 越权可达」在演示场模块已闭环。
- Nest、Next 端点对契约 76/76 零缺口（唯一缺口见 #1）。
- 工作树完全干净，无未提交改动。
- 根与五端 `package.json` version 一致 0.2.0（website 除外，见 #13）。
- 源码零 `TODO/FIXME/XXX/HACK`、零 `@ts-ignore` / `@ts-expect-error`；24 处 `eslint-disable` 全为行级且合理（12 处 `vue/no-v-html` 正文均过 `sanitizeNoticeHtml` DOMPurify）。
- Nest 日志拦截器只记 method/path/status/耗时/IP/UA，不落请求体，无密码泄漏面。
- Supabase 密钥仅服务端读取，浏览器包无引用（AGENTS §5 合规）。
- 无 mock / 假数据残留；`/playground/*` 占位页已全部替换为真实实现。
