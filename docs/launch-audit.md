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
| 2 | ✅ | `GET /api/health` 全仓不存在，但已被当作 Render 保活前置条件（免费层 15 分钟休眠 / 冷启动 30–50 秒） | `apps/nest/src` 14 个 controller 无 health；`openapi.yaml` 47 路径无 health；`AGENTS.md` §17 ①；`docs/vue-plan.md:202` 误称「已上线」 | 已新增 `src/modules/health/health.controller.ts`（无 AuthGuard、不触库）挂入 AppModule；契约升 **v1.14.0** 补录 `/health`（`security: []` + `x-permission: NONE` + 新增 System tag）。附带必要修正：LoggingInterceptor 显式跳过 `/api/health`——否则每次探活落一行 api 日志、且让「零依赖」端点重新依赖数据库。验证：`tsc --noEmit` 与 `nest build` 均通过、产物含 `dist/modules/health/health.controller.js`。**实机已验（同日后续轮次）**：本地起 Nest 后 `GET /api/health` 返回 200 + 正确信封 `{data:{status,uptimeSeconds,timestamp}}`；查库确认**未落 api 日志**——同窗口内 `POST /api/auth/login` 有 2 条 api 日志（正向对照，证明 `LOG_API_ENABLED=true` 确实生效）、`error.401` 2 条，而 health 相关 0 条，跳过逻辑成立。⚠️ 取证纠偏：第一次我用 `detail` 里的 path 字段判空得出「0 条」是**假阴性**——路径存在 `action` 列（值为 `GET /api/health`），`detail` 内无 path。仍待做：§17 ① 的 UptimeRobot / CF Worker Cron 外部定时器配置（属上线环节）。vue-plan `:202` 的错误表述随 #22 一并改 |
| 42 | ✅ | ⚠️ JWT 密钥存在可预测明文兜底，线上漏配即任何人可伪造登录态；Next/Nuxt 同类代码为显式抛错 | `apps/nest/src/auth/auth.module.ts:14`、`strategies/jwt.strategy.ts:25`：`process.env.JWT_SECRET ?? 'better-admin-secret'` | 已改：`src/config/env.ts` 成为密钥与 TTL 的唯一取值源——`getJwtSecret()` 无兜底、缺失或纯空白即抛错（与 Next/Nuxt 同口径）；auth.module / jwt.strategy / auth.service 五处签发校验点全部改接。附带修掉两处同源缺陷：① `JWT_EXPIRES_IN` 在 auth.module 兜底 `7d`、auth.service 兜底 `1h`、env.ts 兜底 `7d`，现统一为 **1h**（= 原实际生效值，行为无变化，但消除「任何省略 expiresIn 的 sign 就发 7 天令牌」的地雷）；② **`JWT_REFRESH_SECRET` 空串不回退**——`'' ?? x` 仍是 `''`，而 `.env.example` 恰是 `JWT_REFRESH_SECRET=` 空值写法，照模板配置就会把空串当密钥传给 jsonwebtoken；现归一「空串/纯空白 = 未设置」并回退 JWT_SECRET，模板注释同步说明。验证：`tsc --noEmit` + `nest build` + eslint 全绿，并对 `dist/config/env` 实测五种取值（未设置→抛、纯空白→抛、空串回退、TTL 默认 1h、记住我档 30d/1d） |
| 43 | ✅ | ⚠️ 一次性脚本无环境守卫，直连共用线上库写弱口令账号 `testadmin / test123`（绑 admin 角色）；另一脚本同库改 `role_menus` | `apps/nest/scripts/create-test-user.ts:12-28`、`verify-rbac-scenario.ts`；四端共用同库（AGENTS §5） | 已按端内 `demo-reset.ts` 的既有安全阀口径给两个脚本加 `--confirm` 闸门：执行前打印目标库 host、未带 `--confirm` 即拒绝并 `exit 1`，角色缺失时同样拒绝（原代码 `adminRole[0].id` 会直接 TypeError）。**为何不用 `NODE_ENV` / host 判断**：实测 `DATABASE_URL` 直指 Supabase pooler（`aws-0-ap-southeast-1.pooler.supabase.com:6543`），本仓库 dev 与线上本就是同一个库，无法据此区分，只能靠显式确认。附带：`verify-rbac-scenario.ts` 清掉一处既有未使用 import（`userRoles`）——该 error 从未被 CI 发现的原因是 **`"lint": "eslint \"{src,apps,libs,test}/**/*.ts\""` 根本不覆盖 `scripts/`**（已记入 #46）。验证：两脚本 eslint 0 error，实跑不带 `--confirm` 均拒绝且退出码为 1。**是否直接删除这两个已失效脚本（其菜单标签口径早于契约 v1.3 移除 Settings）留待你确认** |

---

## P1 · 契约真源与对外门面失真（11 条）

| # | 状态 | 事项 | 证据 | 处置 |
| --- | --- | --- | --- | --- |
| 11 | ✅ | 对外文档站整片陈旧：仍写「四端 26/27、唯一缺口 Dashboard、Phase 0/C 未启动、Playground 7 页、契约 v1.10/v1.11」 | `apps/website/content/index.mdx:56`；`content/progress/feature-matrix.mdx:18-24`；`content/progress/roadmap.mdx:19-43`；`components/docs/diagrams.tsx:786,813,821,834-842`；`components/landing/faq.tsx:46`；`components/landing/stacks.tsx:95-111` | 已按现状重写：矩阵图与文案改 **29/29 = 100%**（分母提为 `MATRIX_DONE/MATRIX_TOTAL` 常量并注真源），虚线框改列「两处有意保留的架构差异」；路线图四阶段全 ✅（Gate 标「已过」）+ 新增契约版本表与上线清单；`index.mdx` 状态行 + Card 描述、`faq.tsx`、`stacks.tsx` 三处硬编码同步。**顺带发现并修掉 `content/architecture/api.mdx` 端点缺口**：原表恰好 44 行 = 44 条路径，漏了 `/auth/demo-login`(v1.10)、`/roles/{id}/users`(v1.13)、`/stats/overview`(v1.11)、`/health`(v1.14) 四个已实现端点，`/users` 与 `/logs` 两行还漏标批量 `DELETE ?ids=`；已补第 5 个 Tab 与 4 行、计数改 **48 路径 / 77 操作**（python 解析 yaml 实测）。验证：`next build` 通过、20 个静态页生成。「17 张表」经复核为**正确**（见 #50），文档站未改 |
| 14 | ✅ | Vue 端图表口径过期：已迁 Unovis，文档仍写「零依赖手写内联 SVG」 | 迁移提交 `7164b26`/`7169e7b`（2026-09-20），代码 `apps/vue/src/components/chart/AreaChart.vue`、`DonutChart.vue`；未回写处 `docs/feature-matrix.md:33`、`AGENTS.md` §19 | 已三处同步：feature-matrix Dashboard 行 Vue 段改写为 Unovis 事实（并连带修正过时计数——用例 106→**101**、chart-geometry 11→**6** 例，KPI sparkline 仍手写 SVG 三端同口径）；AGENTS §19 两处（当前待办的 Vue 段 + Nuxt 段的「Vue 端维持手写 SVG」）；`progress.md` 置顶补记该迁移（§13 更新触发此前漏执行）。**遗留待复跑**：该行「环形 6 扇区 / 3 条 sparkline 描边取色」两项 DOM 实测为手写时期所做，已在本条与 #32 标注，Unovis 版未复跑 |
| 15 | ✅ | `docs/feature-matrix.md` 自相矛盾：统计表 React/Next/Nuxt 各缺 1 项，与同文件全 ✅ 的表格及「27 项 100%」注脚冲突 | `:77-80` ↔ `:33` 全 ✅、`:84-85` | **根因不止统计表**：按行实测矩阵数据行为 **29 行**（核心 10 + 组织 8 + 基础设施 11），旧「27 项」口径自 2026-09-11 起未随新增「演示模式」「Playground 演示场」两行更新——即该文件历史上同一分母已第三次失真（23→27→29）。已改：统计表四端 29/0/100%、口径注重写并加了「新增行必须同步改分母」的硬性提醒、两条「27 项全部完成」注脚、AGENTS §19「27/27」→29/29（含校正说明）。**连带影响 #11**：文档站须用的正确分母是 29，不是 27 |
| 18 | ✅ | Shadcn 幽灵条款：文档承诺「Hero UI 主 + Shadcn UI 补充」并给三级优先级，实际两端无该目录、无该依赖 | 取证：`grep -E '"cmdk\|shadcn\|radix' apps/react/package.json apps/next/package.json` **两端零命中**；无 `src/components/ui/`；`FormProvider\|FormField\|FormItem\|FormMessage` 在 `apps/react/src` 零命中；原表点名的 Command / Sidebar 实为 `layouts/components/command-menu.tsx` / `app-sidebar.tsx` 自建件 | **按你裁决作废**：§18.3 改两级并重写选型对照表；连带发现并同批改掉同一批虚构——**§10.1 表单「现状」整节写的是 shadcn `Form` 原语**（`h-9` / `dark:bg-input/30` / `text-destructive` 全不存在），按实测重写为 `useForm` + `Controller` + Hero UI 字段件；§8 圆角、文首策略行、§17 技术栈表、import 白名单同步；`AGENTS` §2/§7.1-7.3/§18、`requirements` §2/§4/§7.3/§9/§12/§14 + 两张架构图、`README`、`docs/react.md` 全部校正；ui-spec 加 v1.2 变更记录。复查口径：按 7 个「三级选型」关键词模式扫 7 个文件，残留仅 3 处且全是作废说明 / 历史变更记录行 |
| 19 | ✅ | `ui-spec.md` §8 圆角刻度停在 shadcn 时代 10/14px，HeroUI Card 实测 24px | `docs/ui-spec.md:328-342`；`progress.md:242` 已登记 | 按 HeroUI 实测值重写刻度 |
| 20 | ✅ | `ui-spec.md` §「现状」整段仍是 shadcn-admin 旧形态，Cookie / 文件 / 依赖均不存在，且已有 empty-content / error-content / DataTable 骨架 | `docs/ui-spec.md:143,154,207,441,462,486,570` | 按 HeroUI 现状重写 |
| 21 | ✅ | `nuxt-plan.md` 多处陈旧（契约 v1.9.0、26/27、服务端直出标题 M5 评估、`icon.clientBundle` 误述、图表 Recharts 共评审、登录口径待统一） | 逐条与代码 / mechanisms 对照 | 已全改：文首状态 29/29 + 契约 v1.14.0（48 路径 / 77 操作，Nuxt `server/api` 实测 76 方法文件 = 77 − `/health`）；`icon` 段按 `nuxt.config.ts:183-191` 实读改为 `serverBundle.collections` + `clientBundle.scan` + `fallbackToApi:false`；图表行改双端选型（Vue Unovis 1.7.0 / Nuxt nuxt-charts 3.0.0 / React·Next Recharts 3.10.1，四端 package.json 实测）；标题直出路线标「不采用（D1 已定 SPA，`ssr: false`）」；错误页登录口径标已闭环。H1 v1.3→v1.4，并加「§2/§6 为立项快照、当前以 feature-matrix 为准」免责说明；上一代理只加了修订行未改正文，其夸大表述已改准 |
| 22 | ✅ | `vue-plan.md` 陈旧：契约 v1.7.0；`:202` 称 `GET /api/health`「已上线」**为假** | 该端点 2026-09-22 才由 `e94b860` 实现（`src/modules/health/health.controller.ts` + 契约 v1.14.0） | 已改：文首与 §0 契约版本 → v1.14.0（48 路径 / 77 操作，注明立项时 44 端点）；`:202` 改为「已于 2026-09-22 落地（含 LoggingInterceptor 跳过 /api/health），**线上 UptimeRobot / CF Worker Cron 配置仍未做、正是该环节动作**」。§M4 部署清单**其余内容一字未删**（上线时要用）。顺带核实清单事实无误：`VITE_API_BASE_URL` 与 `apps/vue/.env.example` 一致、`apps/vue/public/` 确无 `_redirects`、Nest 默认 CORS 已含 vue 域。H1「v1.1 修订版」与文内已有 v1.2 行自相矛盾，改 v1.3 并补修订记录。⚠️ §1「22 项」、§2 图表 ECharts 推荐、§M4 进度块「Vercel 部署」（与同段 CF Pages 矛盾）等**带日期的 M4 历史记录**按 §13 未回改 |
| 24 | ✅ | `plan-dashboard-playground.md` 勾选未回填 + 多处陈旧现状 + 页数停在 7/8 页 | 逐条对照 progress.md / 代码 / 迁移脚本 | 已补勾 11 项（§3.4 五条经源码取证：`logging.interceptor.ts:18/38`、`http-exception.filter.ts:104`、`auth.service.ts:230/419`、`log-cleanup.service.ts:14/68` + `demo.constants.ts:27`、`refresh-token-cleanup.service.ts`；Step 8 两项；§4.4 三项）；**Step 8 第 1/3 项与 §4.4 第 7 项保持未勾**——判据指向线上口径或深浅色响应式逐项过检，未做就不勾。§9.2 / §9.3 各加一行「本节为线上部署后验收项」并全部保持未勾。陈旧现状 6 处改准；页数补至 **10 页**（§6 表补两行、§5.1 菜单树补两叶、图标清单补 loader-circle sort 5 / workflow sort 6，取证自两个 migrate 脚本 + `registry.ts` 的 10 条）。带日期的旧实施记录（「7 页占位」「共 8 页」）保留原文、只在其后追加现状 |
| 56 | ⬜ | `usedIn` 长期未回填（plan §302 承诺「Phase C 后回填」，但 Dashboard 早已落地）：四端 `features/playground/number-flow/meta.ts:9` 仍是同一条 TODO，全仓 `usedIn` 只出现在类型定义与 `PlaygroundIntro` 渲染分支，**无一处 meta 赋值** → 演示页「用于生产」关联区一直空着 | `grep -rn usedIn` 四端 features/playground 实测 | 属代码改动（补 4 端 meta），未擅自执行；已在 plan §302 标为遗留待办。要修需四端同批（UI 一致性），量级约 4 行注释替换为数组 |
| 44 | ✅ | `CORS_ORIGINS` 未被模板纳管（AGENTS §9 要求）；且 §17 ③「四端域名」口径可能本身过宽——Next/Nuxt 不消费 Nest | `apps/nest/main.ts:22-33` 缺省含 localhost×5 + react/vue；`.env.example` 无该变量 | 补 `.env.example`；🚫 白名单范围需确认 |
| 45 | 🔧 | CI 从未验证任何一端的构建；`clean-logs.yml` 以生产库写权限长期挂在 GitHub Secrets | `.github/workflows/` 原仅 `check-locales.yml`（只装 apps/next）+ `clean-logs.yml` | **CI 矩阵已建**：新增 `.github/workflows/ci.yml`，PR / push(main) / 手动三触发 + `concurrency` 取消同分支旧任务省额度，17 个步骤按端拆分（react 3 / vue 4 / next 3 / nuxt 4 / nest 2 / website 1）。pnpm 版本取各端自身声明——nuxt 的 `packageManager=pnpm@12.3.4`，其余沿用本仓已验证的 pnpm 11；node 22 与 check-locales.yml 对齐；各端 `working-directory` 独立 install，不引入 workspace。**交付前已把矩阵里 17 个步骤的命令逐条本地实跑全绿**（lint / test / type-check / typecheck / check-locales / build 各端），YAML 解析与矩阵展开亦校验。**未做的半个决策**：`clean-logs.yml` 仍持生产库写凭据——改只读要你在 GitHub 建一个新的受限 Secret，或确认停用 GitHub 侧只留 Nest 进程内 cron（二者等价幂等）。无 test 脚本的 next / nest / website 本轮**不为跑测试而引入框架**（属 #46） |

---

## P2 · 内部文档陈旧与规范不符（14 条）

| # | 状态 | 事项 | 证据 | 处置 |
| --- | --- | --- | --- | --- |
| 6 | ✅ | 契约设计说明断更 5 个版本（v1.9.0→v1.14.0 只写进 yaml description）；§3 端点清单与 §2 权限点数同样滞后 | `apps/nest/docs/openapi-design.md` §9 原末条停在 v1.7.1（2026-09-09）；§3 只写到 `3.8 日志`；§2 写「共 9 个权限点」而 EXPORT(512) 已在 v1.7.1 引入 | 已补：§9 一次性追入 v1.4.1→v1.13.0 共 15 行「补录」记录（日期取 progress.md 对应条目，**历史行零改写**）；§3 补 §3.9–§3.16（我的账户 / 组织 / 岗位 / 通讯录 / 公告 / 站内信 / Stats / 系统探针）并回填早期小节漏项（`POST /auth/demo-login`、`GET /menus/tree`、`DELETE /logs?ids=`、`GET /roles/{id}/users`）与三处过时权限位（reset-password `RESET`→`RESET_PASSWORD`、`PUT /roles/{id}/menus` `EDIT`→`GRANT`）；§2 权限点 9→**10**（`permissions.enum.ts` 实测 10 个）；§3 头标注实测规模 **48 路径 / 77 操作** |
| 52 | ✅ | `database-design.md` §9 变更记录**行序乱**（v0.10 在 v0.6 之上、v0.9 在 v0.5 之下）——与 #6 同类的两份真源文档问题，本条专记行序 | 同文件 §9 表格 | 已由 #50 那轮一并按日期+版本重排为升序，**行内容逐字未改**（§13 历史记录不可回改，仅版式）。若你认为该表本就该保持「追加在最下方」的原序，回退这次重排即可 |
| 53 | ✅ | `database-design.md` §2.1 `users` 字段表缺 2 列：`gender`（迁移 0008）与 `token_version`（契约 v1.2，`integer notNull default 0`，全端强制下线的载体） | 取证 `src/db/schema/users.schema.ts:66/:72` + `drizzle/0001_*.sql:9` / `0008_*.sql:1` | 已按 schema 实际定义补两行（位置随 schema 列序：gender 在 entry_date 后、token_version 在 status 后），token_version 的机制引 mechanisms §5；§9 追加 v0.13。⚠️ **仅逐列核对了 §2.1 users**，其余 16 张表的字段表未做同等逐列比对，不能据此声称全表清单已核完 |
| 54 | ✅ | **§2 各表「类型」列整体失真**：文档写 `varchar(50)` / `varchar(255)`，实现是 `text` + DTO 长度校验 | 取证三处独立一致：`grep varchar src/db/` **0 命中**、`grep varchar drizzle/*.sql` **0 命中**（物理库列也是 `text`）、`0000_*.sql` 建表语句逐列 `text` | **按你裁决「文档改口径」执行**：33 处类型统一改 `text（≤N）`，N 保留原设计意图；§2 头新增「类型口径」说明块，区分用户输入列（N = DTO 实际校验上限）与服务端自写列（`logs.ip` / `logs.user_agent` 无 DTO 约束，N 仅容量参考）；§9 追加 v0.12 变更记录。零 Schema、零迁移、零契约变更 |
| 55 | ⬜ | 两份后端文档文首与 §8 仍是 Phase 2 立项口吻（「只做方案对齐、不编写 yaml」「建议结构 version: 1.0.0」），与它们已是落地真源的身份不符；另 `apps/website` 无 `.env.example`（AGENTS §9 要求，该端仅读一个 `NEXT_MEM_CAP_MB` 构建开关） | `apps/nest/docs/*.md` 文首；`apps/website/` | 建议整体打「已落地/存档」标头而非逐句改；website 是否补一份仅含构建开关的模板由你定 |
| 7 | ✅ | 契约冒烟脚本落后于契约 | `apps/nuxt/scripts/contract-diff.mjs` 原 20 条只覆盖到 v1.7 时代端点 | 已按 openapi 实测扩到 **31 条步骤**：补 `/menus/{id}`、`/roles/{id}`、`/roles/{id}/users`(v1.13)、`/users/{id}`、`/logs/{id}`、`/org/depts/{id}`、`/org/posts/{id}`、`/org/posts/{id}/members`、`/notices/{id}`、`/notices/{id}/read-stats`、`/stats/overview`(v1.11/v1.12)；refs 解析从「只取 roleId」泛化为按来源列表批量取 7 个 id（role/user/menu/log/dept/post/notice），取不到时告警而非静默打向 `MISSING` 造成两侧同 404 的假通过。排除项写明在文件头：`/health` 按契约不做对等实现、`/dict/types/{code}` 用固定 code 实参覆盖。另挂 `pnpm contract-diff` 入口（此前无任何 npm script 指向）；AGENTS §19 的脚本路径误记（根 `scripts/`）一并更正。验证：`node --check` 通过、步骤清单与 yaml GET 集合脚本比对全覆盖。**实跑需 Nuxt + Nest 双服务在线，留待走查时执行** |
| 8 | ✅ | 端点计数陈旧：AGENTS §19 与 feature-matrix 注脚写「70 个方法端点（44 契约路径全覆盖）」 | 实测 `openapi.yaml` v1.14.0 = **48 路径 / 77 操作**；Nest 77/77（含本轮 `/health`）、Next 76/77（契约明示 health 不做对等实现）、Nuxt `server/api` 76 个方法文件（= 77 − health，find 实测） | 已改为双时点表述「当时 70 个 / 44 路径；2026-09-22 按 yaml 实测 48 / 77」，并注明曾缺的 `GET/DELETE /logs/{id}` 已由 `d1284f6` 补齐。⚠️ 本行原记的「47 path / 76 method」是我在 #2 加 `/health` **之前**取的数，一并纠正为 48 / 77 |
| 9 | ✅ | `super_admin` 的 role_menus 有缺口（原记 24/28、"缺 exception 三页 + 主题切换动画页"），靠 -1n 全量位免检掩盖 | `progress.md:352`；实测纠正见下 | **已回填（用户批准写库）**。⚠️ 原记录的两个数字与缺口构成都错：实测 **菜单 30 条 / 超管 26 条**，缺的是**异常页 1 个目录 + 403/404/500 三子页共 4 条**；theme-switch-animation 与全部 playground 页面早已由各 `migrate-menus-add-playground-*.ts` 自带授权——差值同为 4，所以这条记录长期没被发现有问题。新增 `scripts/migrate-menus-add-super-admin-grants.ts`：按 `not exists` 通用规则补齐（非硬编码 4 个 id，可自愈将来新增菜单）、permissions 取 `SUPER_ADMIN_BITS`(-1n) 与既有行同值、**只 INSERT 不 UPDATE/DELETE**。验证：首跑补 4 条 → 总数 30 = menus 总数；二跑报「待补 0 条 / 未做任何写入」证幂等；独立交叉查询 menus=30 / sa=30 / gap=0。行为无变化（超管本就靠聚合位免检），属数据不变量收口 |
| 12 | 🔧 | AGENTS §19 称文档站内容「由 `docs/` 真源自动同步」，实为手写 MDX、无同步脚本 | `apps/website/content/**` 独立成文；根 `scripts/` 只有 `sync-versions.mjs`，website `scripts/` 只有 `gen-stack-icons` / `with-memory-cap` | **已改表述**（§19 现明确写「手写 MDX、非自动同步，docs/ 口径变化须人工回写」，并指向本轮 #11 的积压教训）。**未做的半个决策**：是否真要建一个 `docs/ → content/` 同步机制——建则需定义哪些章节进站点、格式如何映射，属新工具链，留待你定（#12 保持未闭环） |
| 13 | ✅ | website 版本停在 0.1.0，被 `sync-versions.mjs` 排除，且脚本注释与硬编码列表不符 | `apps/website/package.json`；`scripts/sync-versions.mjs:16-22` | 纳入 SUB_PROJECTS |
| 16 | ✅ | AGENTS §19 现状标记失效：「改动未提交」早已入库；Vue 端模块行的 Playground 页数仍写 9 页 | 实测 `git status --porcelain`（含 `-uall`）为空；`playground` 实为 10 页（见本页 feature-matrix 行与 #15 行数实测） | 已改：§19 两处「改动未提交」→「改动已入库」（保留仍然为真的「待 GUI 走查 / 审核」）；Vue 端模块行的「Playground 演示场（9 页…）」改为 10 页并补第 10 页组织架构树。progress.md 内 7 处同类「未提交」表述按 §13「历史记录永不回改」原则不动 |
| 17 | ✅ | `requirements.md` 多处陈旧/自相矛盾（契约 v1.9.0、Dashboard 未实现、个人链接"后续"、Phase 6 待决策、目录树无 `apps/`、「可选 Workspace」） | `:564`、`:574/:602/:613`、`:628`、`:826`、`:73-82`、`:81` | 逐条刷新（Workspace 一条与 §3 明文一致，属错误表述） |
| 23 | ✅ | `docs/react.md` 技术栈表 HeroUI 写 3.2.4，实际 3.2.6（表头自注「记录于 2026-08-30」） | `:33`；`apps/react/package.json` | 刷新版本 |
| 46 | ⬜ | 测试面真实缺口：`apps/next` / `apps/nest` 无 `test` 脚本（Next 0 测试文件）；website 无 lint/test/typecheck；Nest 测试基建备案仍成立。**另发现 lint 覆盖盲区**：Nest 的 `"lint": "eslint \"{src,apps,libs,test}/**/*.ts\""` 不含 `scripts/`，该目录下的 error 永远跑不到（#43 顺手修的那处未使用 import 就是这么漏掉的） | 各 `package.json`；`docs/code-review-backlog.md:33-37`；`apps/nest/package.json:22` | 🚫 立项需拍板（引入框架属架构级）。lint  glob 扩到 `scripts/` 属低风险，可与 #45 CI 挂接一并做 |
| 47 | 🔧 | ① React / Next 两端 `components/common/placeholder-page.tsx` 已零引用（Playground 换真实实现后遗留）；② `/settings` 直连四端行为不一致（占位页 / 空 div / 404） | ① 两端 `grep placeholder-page\|PlaceholderPage` 除自身定义外 0 命中；② Vue `pages/(authenticated)/settings/index.vue:6`、Nuxt 同、React `routes/_authenticated/settings/index.tsx:5` 渲染空 div、**Next 无 `settings/page.tsx`** | ① **已删两个死文件**，删后 react / next `tsc --noEmit` 双双零错误。② **未动，需拍板**：分组兜底空页该统一成哪种形态（路由表已把 `/settings` 登记为「分组节点 to 为空、正常导航不可达」，故也可选择四端都不建页、直连一律 404） |
| 48 | ✅ | gitignore 口子：Next 只忽略 `.env*.local`（裸 `.env` 不被忽略）、Nest 不覆盖 `.env.production`、website 的 `.env*` 连 `.env.example` 一起吃掉 | `apps/next/.gitignore:28`、`apps/nest/.gitignore`、`apps/website/.gitignore:20` | 统一 `.env*` + `!.env.example` |
| 49 | ✅ | 孤儿脚本未挂 npm script | `apps/nuxt/scripts/check-locales.mjs`、`clean-logs.mjs`；react/next `scan-stale-tokens.cjs` | Nuxt 两个已按 Next 端命名惯例挂上 `check-locales` / `db:clean-logs`（实跑 check-locales 通过：14 文件与 React 端一致，退出码 0；clean-logs 会连共用线上库故未实跑）。`scan-stale-tokens.cjs` **保留不挂**：它是 v2→v3 token 迁移期的一次性审计工具，`progress.md:1324` 明确记为「留存供其他端复用」，属有意保留而非疏漏 |
| 31 | ⬜ | 契约外遗留口径：`GET /logs` search 仅匹配 action、旧权限位值清理脚本未出 | `progress.md:1636/:1774` | 登记，随下次契约变更处理 |
| 50 | ✅ | **表数量口径失真**（修 #11 时发现）。⚠️ **本条原判断被复核推翻**：我最初据 `grep pgTable` 得 18 就断言「物理 18 张、文档 17 张错了」——实测 drizzle 最新快照 `drizzle/meta/0009_snapshot.json` 为 **17 张**（含 `refresh_tokens`、不含 `settings`，后者已由迁移 `0002_lively_obadiah_stane.sql` DROP），故**文档站「17 张表」与 `database-design.md` 标题都是对的**。真正的缺陷只有两处：① `refresh_tokens`（契约 v1.2 起建表）在 §2 长期**没有小节**；② `src/db/schema/settings.schema.ts:13` 仍留一份 `pgTable` 声明，但 `src/db/schema/index.ts` 未导出它、不参与迁移生成 → **无引用的死声明**（这就是 18 与 17 的差） | 取证：`python` 读快照 `tables` 计数 = 17；`grep drop drizzle/0002_*.sql` 命中 settings；`grep settings src/db/schema/index.ts` 无结果 | 已修：补 §2.18 `refresh_tokens` 小节（逐列按 schema 写 + 清理机制）；§2 标题计数改为「物理 17 张」并写明 18 处声明的差从何而来；§2.8「已移除」改为准确表述（物理表已 DROP、源码留死声明）；顺带把 §2.9 日志清理从「建议」改为已实现事实。**不动 schema、不删声明**（删声明属代码变更，留待你确认） |
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
| 25 | 🚫 | Dashboard 两级卡片分层（浅色下会变「凹陷」）——曾是唯一挂起的设计决策 | `progress.md:242` | **用户裁决：废弃，不改**（原话「没什么感觉，现状挺好的」）。现状 = 单层卡片 + 页头欢迎横幅承担层次；本条结案，不再出现在待办 |
| 18 | Shadcn 补充条款：正式作废，还是补实现 | 见 P1 #18 |
| 44 | Nest CORS 白名单范围（两端 vs 四端） | 见 P1 #44 |
| 26 | ✅ | Next 登录/刷新响应体是否裁剪双 token（原记为 P2 未做项，称其削弱 httpOnly 防线） | `progress.md:1387`；`apps/next/src/app/api/auth/login/route.ts:13` 注释说明「响应体仍按契约返回，客户端可忽略令牌字段」 | **用户裁决：不裁剪**，改为在契约里写明这是有意双形态。理由：裁剪会让四端共用同一份 Contract 的前提失效（React / Vue 就是靠响应体取令牌），而客户端忽略字段即可、真正防线是 Cookie 的 HttpOnly（已具备），无安全增益。已在 `openapi.yaml` 的 `POST /auth/login` 补 `description` 注记（纯文档性说明，不改响应 schema，故**不升契约版本**） |
| 27 | Nest `phone` 不 trim，是否由 Next 对齐 Nest | `progress.md:889` |
| 28 | 四端 `redirectToSignIn` 带参规则未统一 | `mechanisms.md:907` |
| 29 | Next `/org/notices/[noticeId]` 详情页无 metadata | `mechanisms.md:735` |
| 51 | 文档站 `theme-switch-animation` 是否随四端升 0.2.0（现仍 0.1.0；`components/theme-toggle.tsx:36` 只用了 `CIRCLE_BLUR`，0.2.0 移除的四向擦除类型未被引用，技术上可安全升级，但升级要同步 `pnpm-workspace.yaml` 供应链白名单并触发安装，属依赖变更） | 本页 #51 |
| 30 | 角色矩阵（主管/HR 是否含演示场）+ super_admin 授权数据（关联 #9）；Vue 端是否为组件测试补 vitest plugin-vue；Scalar 白屏是否切自托管 | `plan-phase0-execution.md:146`、`progress.md:118/:402` |

---

## 📋 上线环节执行（非本轮代码修复）

| # | 事项 | 证据 |
| --- | --- | --- |
| 3 | ✅ | SPA 直链回退缺失：React / Vue 深链（如 `/settings/users`）刷新或直达会 404；且仓库只有 `apps/react/vercel.json`（Vercel 语义）与既定平台矛盾 | ⚠️ **平台口径经用户改判**：原 requirements §13 / progress 2026-09-12 拍板为 Cloudflare **Pages**（依据「Pages 免费静态请求 / 带宽无限」），2026-09-22 用户确认实际按 **Workers（Static Assets）** 部署 | 已落地：① 各端新增 `wrangler.jsonc`（`assets.directory=./dist` + **`not_found_handling=single-page-application`**——官方文档确认这是 Workers 侧 SPA 回退机制，Pages 的 `_redirects` / 根 `404.html` 在 Workers **不生效**，故未加也不会加）；② 删 `apps/react/vercel.json`；③ 平台表述五处同步改准（AGENTS §17 + §19、requirements §12/§13 域名表与架构图、vue-plan §M4 部署清单、文档站 feature-matrix 与 roadmap 两页）。**wrangler 未进 package.json 依赖**（§15 不擅自加依赖），部署用 `npx wrangler deploy`。**⚠️ 一项未随迁移复核的前提**：原拍板的「带宽无限」理由不成立于 Workers，Workers 计划按请求计费、静态资源另有额度口径——本轮**没有核对当期官方定价**，requirements §13 已就地标注需上线前另行核对，不在文档里写未经核实的数字。验证：两份 jsonc 去注释后 JSON 解析通过（name / not_found_handling / directory 逐项核对）、`next build` 通过 |
| 4 | ✅ **已由用户改密**（2026-09-22 实测：`POST /api/auth/login` 用 `admin/admin123` 返回 401 `INVALID_CREDENTIALS`）。`.env.example` 的 `SEED_ADMIN_PASSWORD` 已补注释说明语义 | `apps/nest/.env.example:20-23`、实机 curl 验证 | 用户已改线上/共库 admin 密码；本轮只做两件：① `.env.example` 补语义注释——该值**仅对全新库首次 seed 生效**，已有 admin 的库重跑 seed 因 `onConflictDoNothing`（`seed.ts:109-121`）不会覆盖，故留默认值不影响已上线账号；② 台账销项。新建库/演示库重置仍需显式强口令 |
| 5 | ✅ | **Vue / Nuxt 品牌图标不完整**：两端 `public/` 只有 SVG/ICO，缺 `apple-touch-icon.png` 等 7 项 PNG，且页面根本没声明这些图标——Nuxt 连 `app.head` 块都没有，标签页图标纯靠浏览器自动请求 `/favicon.ico` 兜底；与 AGENTS §19 / ui-spec §19「五端图标由脚本统一生成」不符 | `assets/logo/build-assets.py` 的 `app_png_targets` 原只列 react / next / website；`apps/vue/index.html` 原仅 1 条 `favicon.svg` link；`apps/nuxt/nuxt.config.ts` 原无 head | 已补：① 脚本目标表加 vue / nuxt 各 7 项 PNG（`favicon_light.png` 是 react / next 历史兼容项，不给两端复制），并由脚本产出 `site.webmanifest`；② Vue `index.html` 与 Nuxt `app.head.link` 各补 5 条声明（icon / alternate icon / 96 PNG / apple-touch-icon / manifest）；③ ui-spec §19 加「装配范围 + head 声明」说明与**「光生成资产不等于生效」**的验收口径。**验证**：`vite build` 后 `dist/index.html` 五条 link 齐全、图标与 manifest 均进 `dist/`；`nuxt build` 后 `.output/server/chunks/_/nitro.mjs` 含 apple-touch-icon、`.output/public/` 五个新资产到位；nuxt eslint（含 `nuxt-config-keys-order` 规则，`app` 须在 `modules` 之后）与 typecheck 通过 |
| 32–39 | 📋 **（2026-09-22 部分销项）**~~Nuxt Dashboard GUI 走查问题~~ 已由用户确认解决；双端契约冒烟改**随四端上线后全量跑一次**。**仍未回收**：okr-tree 画布三端走查、v1.13.0 关联用户三端走查、Next / Vue Dashboard 像素观感走查、#14 的 Vue Unovis 版 DOM 实测复跑、越权实机验证（换未授权角色）、`git tag v0.2.0`、五端部署 + `DEMO_MODE=true` + `LOG_API_SKIP_GET` 显式开启。注：Next / Nuxt 补跑 build 已在本轮 #45 中本地全量实跑（六端 build 全绿） | `progress.md:11/:22/:203/:509/:1292` |

---

## ✅ 已核实干净（不作为待办，防重复排查）

- Vue / Nuxt `route-access.ts` 两表对 10 条 playground 路径全部登记，与 `(authenticated)/playground/` 下 10 个页面文件一一对应 → mechanisms §34「漏登 = 越权可达」在演示场模块已闭环。
- 端点覆盖已按 path+method 实测：契约 48 路径 / 77 操作，**Nest 77/77、Next 76/77、Nuxt 76/77**（差额唯一是 `/health`，契约明示不做对等实现）；Nuxt 此前的 `/logs/{id}` 缺口已修（#1）。
- 工作树完全干净，无未提交改动。
- 六端 `package.json` version 已全部一致 0.2.0（website 掉队问题已修，见 #13）。
- 源码零 `TODO/FIXME/XXX/HACK`、零 `@ts-ignore` / `@ts-expect-error`；24 处 `eslint-disable` 全为行级且合理（12 处 `vue/no-v-html` 正文均过 `sanitizeNoticeHtml` DOMPurify）。
- Nest 日志拦截器只记 method/path/status/耗时/IP/UA，不落请求体，无密码泄漏面。
- Supabase 密钥仅服务端读取，浏览器包无引用（AGENTS §5 合规）。
- 无 mock / 假数据残留；`/playground/*` 占位页已全部替换为真实实现。

---

## 处置进度（2026-09-22 收尾）

**已闭环（累计 38 个提交；台账 38 个带状态行中 ✅ 31、🔧 半闭环 3）**
- P0：#1 #2 #42 #43（health 端点另做实机 curl + 查库双验证，见 #2 行）。
- P1：#6 #8 #11 #14 #15 #16 #19 #20 #21 #22 #23 #24 #50 #52 #53 #54。
- P2：#7 #13 #44 #48 #49。
- 上线前置五项（用户批准）：**#3**（Workers Static Assets + `not_found_handling`，删 vercel.json，五处平台表述同步）、**#4**（用户已改密，实测 401；seed 语义补注释）、**#5**（Vue/Nuxt 图标 7 项 PNG + webmanifest + 两端 head 五条 link）、**#9**（幂等回填 4 条超管授权，gap=0 交叉复核）、**#45**（CI 六端 17 步矩阵，交付前逐条本地跑绿）。
- 半闭环三项：#12（表述已改准，是否建 docs→content 同步机制待拍板）、#47（死文件已删，`/settings` 四端形态待拍板）、#45（CI 已建，`clean-logs` 生产写凭据待换只读或停用）。

**仍开放**
- 🚫 需拍板：#18 Shadcn 幽灵条款、#25 两级卡片分层、#26 Next 响应体裁剪双令牌、#27 phone trim、#28 redirectToSignIn 统一、#29 Next 公告详情 metadata、#30 角色矩阵/vitest/Scalar、#46 测试基建立项、#51 文档站依赖升 0.2.0、#55 后端文档立项口吻、#12 同步机制、#45 clean-logs 凭据、#47 `/settings` 形态。
- ⬜ 登记后处理：#31（logs search 仅匹配 action、旧权限位清理脚本）、#56（`usedIn` 四端 meta 未回填）。
- ⏸️ P3 已知差异两组：#30 #39。
- 📋 上线环节：#33–#39（GUI 走查回收、Next/Nuxt 补跑 build、双端契约冒烟、越权实机验证、`git tag v0.2.0`、五端部署 + `DEMO_MODE=true` + `LOG_API_SKIP_GET` 显式开启）；**#3 新增一项**：Workers 计划的额度口径需按当期官方定价核对（原 Pages「带宽无限」理由不成立）。

**本轮纠正的记录错误（防下轮误信）**：#9 的「24/28、缺 exception 三页 + 主题切换动画页」→ 实测 30/26、缺异常页目录 + 三子页；#50 的「物理 18 张表」→ 17 张（`settings` 已被迁移 0002 DROP）；#11 我自己写进文档站的「Next 77 操作零缺口」→ 76/77。
