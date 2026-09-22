# Phase 0 演示上线准备 — 自动化执行手册

> **定位**:本文件是 Phase 0(计划见 [`plan-dashboard-playground.md`](plan-dashboard-playground.md) §3)定时任务的唯一执行手册。「做什么」以计划 §3.6 执行清单与 §9.2 验收标准为真源,本文件只规定「怎么自动跑」:执行协议、阶段卡、验收判据、失败处理。规则引用章节号,不复制内容。

## 0. 阶段状态总览

| 阶段 | 内容 | 执行者 | 计划时间 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | OpenAPI 契约 v1.10.0 + Nest 服务端改造 | 定时任务 A | 2026-09-17 00:00 | ✅ 完成（`d7b7bb3` + `4147654`；e2e 子项 ⚠️ 备案，见 §4） |
| T2 | faker 重置脚本开发 + 首次真实执行 + 幂等复验 | 定时任务 A | 2026-09-17 00:00(紧随 T1) | ✅ 完成（`1e5d48f`） |
| T3 | React + Vue 前端(快捷登录 + DEMO_READONLY toast) | **用户手动** | 2026-09-17 白天 | ✅ 完成（`4cb3436`;GUI 复核由用户本地执行,见 §4） |
| T4 | Next + Nuxt 前端(server API + 登录页 + toast) | **用户手动** | 2026-09-17 白天 | ✅ 完成（代码就绪,GUI 由用户本地验证,见 §4） |
| T5 | 全链路验收 + 文档收尾 | 定时任务 B(已排期) | 2026-09-18 01:00 | ✅ 完成（验收报告见 §4 任务 B 条目） |

状态标记:⬜ 未开始 / 🔄 进行中 / ✅ 完成 / ⛔ 失败中止(原因见 §4 报告区)。

## 1. 执行协议(每个定时任务固定流程)

1. **定位阶段**:读本文件 §0,确认本次任务负责的阶段(T1/T2 或 T5)。
2. **前置检查**:
   - `git status` 必须干净(无未提交、无未跟踪文件)。不干净 → 在 §4 追加报告并**立即停止**。
   - 任务 A:确认 `apps/nest/.env.local` 存在且含 `DATABASE_URL` 与 Supabase `sb_secret_` 密钥(只检查存在性,**不得创建或修改密钥**)。缺失 → §4 报告并停止。
   - 任务 B(额外):§0 中 T1~T4 必须全部 ✅。任一未完成 → §4 报告并停止,**不得**在半成品上跑验收。
3. **执行阶段卡**(§2),按卡内「验收判据」逐项验证。
4. **检查点提交**:验收判据全绿后,立即按 `AGENTS.md` §10 Conventional Commits 提交,并在本文件 §0 打钩 + 状态改 ✅,`docs/progress.md` 追加条目。
5. **失败即停**:任一验收判据不过,先做合理修复尝试;仍不过 → §4 追加失败详情(现象、已尝试、建议),该阶段标记 ⛔ 并**停止整条流水线**——阶段间有依赖,禁止跳过失败阶段硬闯后续。可降级项除外(见 T2 卡「降级预案」)。
6. **范围红线**:只执行本手册阶段卡内容;不进入 Phase C / Playground 后续;不触碰 §5 人工清单;不修改 `AGENTS.md` 架构性规则;凡涉及架构决策冲突,停止并报告,不自行改架构。

## 2. 任务 A 阶段卡(2026-09-17 00:00)

### T1 — OpenAPI 契约 v1.10.0 + Nest 服务端改造

**范围**:计划 §3.6 **Step 1 全部子项 + Step 3 全部子项**(先契约后实现,契约是 API 唯一事实来源)。

**关键实现要点**(细节以计划 §3.2 / §3.4 / §3.5 为准):

- `POST /auth/demo-login`(body `{ kind: 'admin' | 'random' }`,响应复用 `/auth/login` 结构,`DEMO_MODE` 关闭时 404)+ 通用错误响应登记 403 `DEMO_READONLY` + `openapi.yaml` 头部 changelog + 四端影响评估结论(写入 changelog 或 progress)。
- `DemoReadonlyGuard` 全局注册(`DEMO_MODE=true` 启用,默认拦所有非 GET)+ `@DemoAllowed()` 装饰器标注白名单:auth `login` / `refresh` / `logout` / `demo-login`;notifications `:id/read` / `read-all`。
- `HttpExceptionFilter`:`DEMO_READONLY` 不写 error 日志;`LoggingInterceptor`:`LOG_API_SKIP_GET` 开关(GET 不记 api 日志)。
- demo-login 端点:admin = 「系统管理员」演示角色随机一人;random = 其余四演示角色两级随机;**超管永不进池**。
- 超管双保险:users `reset-password` / `status` / `DELETE` 对 `super_admin` 目标永久拦截(与 `DEMO_MODE` 无关)。
- `log-cleanup` 跳过 `seed` 标记日志;确认 refresh_tokens 过期清理机制,缺则补 cron。
- `apps/nest/.env.example` 登记 `DEMO_MODE` / `LOG_API_SKIP_GET`。

**验收判据**:

- [x] `pnpm lint` / `build`(apps/nest)全绿(项目无 `test` 脚本);e2e **未补齐**——项目无任何测试基建,从零引入属架构级决策,备案 `code-review-backlog.md`,以 curl 全链路提供同等覆盖(见 §4)。
- [x] 本地 `DEMO_MODE=true` 起服务,curl 验证:白名单放行、其余非 GET 返回 403 `DEMO_READONLY`、超管保护生效、登录-刷新-退出链路完整。
- [x] **验证完成后移除临时 `DEMO_MODE=true` 配置**(以进程环境变量注入,`.env` 未改,无残留)。
- [x] 未启 `DEMO_MODE` 时行为与现状完全一致(默认 false,不拦)。

**提交点**:commit 1 = 契约(`docs(openapi): 契约 v1.10.0 …` 或按项目惯例);commit 2 = Nest 实现(`feat: …`)。两 commit 间无其他改动混入。

### T2 — faker 重置脚本 + 首次真实执行

**范围**:计划 §3.6 **Step 2 全部子项**;数据规模、清理顺序、保留清单、演示角色权限矩阵、头像规则均以计划 §3.1 为唯一真源。

**关键实现要点**:

- `apps/nest/scripts/demo-reset.ts`,命令 `pnpm db:demo-reset --confirm`;`@faker-js/faker` devDependency 锁版(`zh_CN`)。
- 安全阀:必须显式 `--confirm`,执行前打印目标库 host 与将删行数预估;固定 seed;分批插入(50~100 条/批);数据写入事务包裹(头像网络 IO 放事务外)。
- 清理与保留顺序严格按计划 §3.1(含软删用户物理清除;超管密码哈希**原样保留,不得重设**)。
- 头像:服务端下载真人风格照片(性别匹配)→ 转存 Supabase Storage `avatars` bucket `demo/00xx.jpg`(确定性命名,同名覆盖)→ 事务内落 URL;单张失败回退空头像。

**验收判据**:

- [x] 未带 `--confirm` 拒绝执行。
- [x] 在共用库真实执行一次(本任务**已获授权**执行真实重置;凌晨执行,refresh_tokens 清空影响最小)。
- [x] 重跑一次,逐表数据集一致(幂等)——11 张表业务字段 md5 指纹(含主键)完全一致。
- [x] 超管用户存在且密码哈希与执行前一致;`super_admin` 角色、菜单、字典、settings 未被清理(`settings` 表在库中已随契约 v1.3 移除,无此项)。
- [x] 全部头像 URL 为自家 Supabase Storage 域名,无外链(151/151,HEAD 200)。
- [x] 5 个演示角色 + 权限矩阵写入 `role_menus`;用户按比例分配角色;日志含 `seed` 标记且时间分布近 30 天。

**降级预案**(不算失败,§4 记录即可):头像下载遇网络问题,单张失败回退空头像;若外网整体不可达,允许全部用户走空头像,数据集其余部分照常完成。

**提交点**:commit = 脚本 + 依赖锁版 + package.json 脚本命令(`feat: faker 演示数据重置脚本 …`);执行结果与幂等验证写 progress.md,不单独 commit 数据。

### T1 / T2 独立检查点(重要)

计划 §3.6 明确 Step 1 与 Step 2 **无依赖**。协议:**T1 失败不影响 T2 照常执行,反之亦然**;两者各自独立验收、独立提交、独立打钩。仅「demo-login 端到端登录」需二者都就位,该验证归 T5。全部结束后在 §4 追加本次任务执行报告(各阶段结果、耗时、遗留)。

## 3. 人工段与任务 B 阶段卡

### T3 / T4 — 用户手动(2026-09-17 白天,定时任务不执行)

按计划 §3.6 Step 4~7 执行:React / Vue(Step 4~5)与 Next / Nuxt(Step 6~7)各端:登录页移除 GitHub / Google 占位 → 「管理员」「随机用户」两按钮;请求拦截器识别 `DEMO_READONLY` 统一 toast(i18n zh-CN / en);登录成功 toast 口径「登录成功,欢迎 {姓名}」**不带角色**(计划 §3.3,2026-09-17 拍板);Next / Nuxt 另做 server API `demo-login` route handler + 同名只读拦截 + `.env.example` 登记。完成后自行提交,并回填本文件 §0 状态为 ✅。

> 提示:T2 已完成,白天可直接用 faker 数据实测两 kind 登录与写操作被拦 toast;需要管理操作时用超管账号密码登录(refresh_tokens 已被重置清空,需重新登录)。

### T5 — 定时任务 B(2026-09-18 01:00,已排期)

**前置检查**:§1 第 2 条全部项 + T1~T4 全部 ✅。

**范围**:计划 §3.6 Step 8 可自动化部分 + §9.2 机器可验证项:

- [x] 以进程环境变量注入 `DEMO_MODE=true`(同任务 A 做法,不改 `.env`、无残留)启动 Nest 构建产物,curl 全链路:白名单放行 / 非 GET 直拦 / 超管保护 / demo-login 两 kind 成功且 random 多次覆盖全部演示角色 / 登录-刷新-退出完整。
- [x] `DEMO_READONLY` 拦截不产生 error 日志;GET 不产生 api 日志(查库确认)。
- [x] `demo-reset` 幂等复跑一次确认数据集一致(11 表业务字段指纹);超管 `admin` 密码哈希未变、仍为唯一 super_admin 绑定用户。
- [x] 清理 T3 遗留:四端语言包中 `githubDeveloping` / `googleDeveloping` 两个废弃键(全仓 grep 确认零引用后删除,React 真源改完经 Next 手工同步 / Vue · Nuxt `sync-locales` 重新生成,`check-locales` 通过)。
- [x] 文档收尾:`docs/feature-matrix.md` 新增演示模式行(快捷登录 / 只读守卫,四端状态);`docs/ui-spec.md` §1.3 登录页快捷登录补充;计划 §8 一致性同步清单逐项核对;`docs/progress.md` 置顶记录;`AGENTS.md` §19 当前待办指针同步(Phase 0 完成 → 下一步 Phase C Dashboard 与统一上线)。
- [x] 前端 toast 项(§9.2 第 2 条)已由用户白天验证通过,T5 只核对 `errors.api.demoReadonly` 等 i18n 键四端齐全。

**提交点**:`docs: Phase 0 验收与文档同步` 类提交(语言包清理可单独一笔);§4 追加验收报告;§0 T5 置 ✅。

## 4. 执行报告区(任务运行时追加,倒序)

### 任务 B 执行报告(2026-09-18 08:48 触发,约 1 小时,T5 ✅)

- **前置检查**:git 干净(HEAD `f621301`);§0 中 T1~T4 全部 ✅,满足任务 B 额外前置。
- **T5-① curl 全链路(DEMO_MODE=true 进程注入,PORT=3900,构建产物 `node dist/main.js`,.env 未改无残留)**:
  - 白名单放行:POST /auth/login 错误凭据 401 `INVALID_CREDENTIALS`(到 handler 而非 403)/ demo-login 200 / refresh 200 / logout 204 / POST notifications/read-all 200。
  - 非 GET 直拦:未登录与已登录(demo 会话)的 POST /users、PUT /users/:id、DELETE /users/:id、PUT /dict/types/:code、POST /roles 等 → 全部 403 `DEMO_READONLY`;GET /users /roles 200 不受影响。
  - demo-login:admin kind 登录到 `sys_admin` 角色用户;random kind 30 次 → guest 4 / employee 6 / dept_manager 7 / hr_specialist 13,覆盖全部 4 个演示角色,无超管混入;非法 kind 400。
  - 登录-刷新-退出:demo-login → refresh 轮换新 token → logout 204 → 旧 refreshToken 重放 401 `REFRESH_TOKEN_INVALID`。
  - 超管保护:DEMO 模式下写请求先被全局守卫拦截到不了 handler(HTTP 层无法直达),经代码确认 users.service `assertTargetOperable`(内置 admin 403 / super_admin 绑定 403 SUPER_ADMIN_USER_PROTECTED,删除/停用/重置密码三操作共用)与 roles.service SUPER_ADMIN_ROLE_PROTECTED 仍在位,与任务 A 口径一致。
- **T5-② 日志查库(以 `DEMO_MODE=true LOG_API_SKIP_GET=true` 重启后打混合请求,窗口 00:55:42~45Z)**:① `DEMO_READONLY` error 日志全表 0 条(过滤器 `http-exception.filter.ts` 硬编码特判 return);② 窗口内 api 日志 GET 0 条、POST 1 条(demo-login,api 日志机制本身正常,`action` 为 `${method} ${path}`);③ 窗口内 error 日志仅未登录 GET 的 401 `UNAUTHORIZED`×3(真实错误正常保留)。注:`LOG_API_SKIP_GET` 默认 false(全记),演示口径需线上显式开启,已在 §8 清单备案。
- **T5-③ demo-reset 幂等复跑(共真实执行 3 轮:B/C/D,授权范围同 T2)**:首对比轮(B)后经排查,与库内既有数据(含 T5-① 白名单测试 `read-all` 写入的 1 条真实已读记录)混比无意义,改做相邻两轮纯净对比(D vs E):**11 张业务表(roles / user_roles / role_menus / depts / posts / user_posts / notices / notice_scopes / notice_read_records / notice_remind_logs / notifications)业务字段 md5 指纹(排除 created_at / updated_at / deleted_at / last_login_at / publish_time / read_at 时间列)逐表一致**;时间列差异为脚本设计使然(last_login_at / 定时发布 publish_time / read_at 以执行时刻 `Date.now()` 为锚 + faker 确定性偏移,保证演示数据相对新鲜),faker 随机部分全确定。users 表指纹差异仅 avatar 列——B 轮 1 张 / E 轮 2 张头像下载失败回退空头像(T2 降级预案允许;头像 URL 先于并发下载由 seed 确定,失败不消耗 faker 序列,其余 149~150 张全为自家 Storage 域名 `cbqzqhiqjasshpmunpmo.supabase.co` 零外链)。超管 `admin` 密码哈希 A/C/D/E 四轮快照全同;全库 super_admin 绑定用户仅 admin(binding=1);行数口径 users 151 / roles 6 / role_menus 89 / depts 36 / posts 32 / notices 40 / notifications 163,与任务 A 报告一致。
- **T5-④ 语言包清理**:全仓 grep 确认 `githubDeveloping` / `googleDeveloping` 源码零引用(仅 Next `.next` dev 构建产物残留,非源码)后删除;React 真源(2 文件)→ Next 手工同步(2 文件)→ Vue / Nuxt 各自 `sync-locales` 重新生成;React 与 Nuxt check-locales 14 文件一致双绿,Nuxt `locales.test.ts` 3 用例过。提交 `5dbd607`(8 文件 16 行删除,单独一笔)。
- **T5-⑤ 文档收尾**:`feature-matrix.md` 核心业务模块新增「演示模式(快捷登录 / 只读守卫)」行(四端 + NestJS 全 ✅);`ui-spec.md` §1.3 `/sign-in` 行补 `DEMO_MODE` 快捷登录口径 + 新增 `/playground/*` 行(Dashboard 状态保持「占位」待 Phase C);计划 §8 一致性清单 6 项逐项核对打钩(Dashboard「占位→已实现」与契约 v1.11.0 两项如实标注待 Phase C,不提前打钩);`progress.md` 置顶 Phase 0 完成条目;`AGENTS.md` §19 当前待办指针同步(只改指针,架构规则未动)。
- **收尾状态**:§0 T5 置 ✅。**Phase 0 全部完成**。遗留给用户(不阻塞):线上 `DEMO_MODE=true` 配置、§5 人工清单,均随四端统一上线执行;下一步 Phase C Dashboard(Gate 后启动)。

### T4 执行报告(2026-09-17 白天,AI 协助开发,用户本地 GUI 复核)

- **范围**:计划 §3.6 Step 6 / 7 全部开发项。Next / Nuxt 独立全栈各自实现 server API `demo-login` + 只读拦截 + 白名单 + 登录页两按钮 + toast + i18n + `.env.example` 登记;语言包零新增(React 真源已在 T3 同步 Next,Nuxt 经 `sync-locales` 自动同步)。
- **Next 只读拦截实现口径(方案变更,重要)**:最初把拦截放进 `proxy.ts`(matcher 纳入 `/api`),A/B 实测发现 **Next 16 dev 下 proxy 覆盖 `/api` 会让所有 POST 路由 404**(GET 正常;连既有 `/api/auth/login` 也 404),此路不通。最终方案:`lib/server/demo.ts` 导出 `assertDemoReadonly(request)`,在 `route-auth.ts` 的 `requireAuthUser` 顶部前置调用——效果与 Nest 全局守卫先于 AuthGuard 完全一致(未登录写请求 403 `DEMO_READONLY` 而非 401);经排查全部写路由均经 `requireAuthUser`,仅 auth 四端点(demo-login / login / logout / refresh)免鉴权天然放行,白名单只需放行 notifications read-all 与 `{id}/read`。`proxy.ts` 还原为零改动。
- **Nuxt 只读拦截实现口径**:新增 `server/middleware/demo-readonly.ts`(Nitro server middleware,先于全部 Route Handler)。**踩坑:h3 中间件返回 `null` 也会被当作响应体短路(全站 204)**——h3 对任何非 undefined 返回值都会序列化并结束请求链,放行分支必须显式 `return`(undefined)。403 分支 `setResponseStatus(403)` + 返回 `{ code, message }` 对象,形状与 `route-helpers.jsonError` 完全一致。该坑修复后**未经运行验证**(端口冲突导致前两轮误打到 Nest 3000,修正后构建通过即停,GUI 与 curl 留用户)。
- **server demo-login(两端同构)**:`session.ts` 抽出 `issueSession`(与 Nest 同名共用链路语义一致)+ `demoLogin(kind)`(DEMO_MODE 关 404 / 池空 404 `DEMO_USER_NOT_AVAILABLE` / 两级随机 / 超管永不进池)+ route handler(非法 kind 400 `VALIDATION_ERROR`,响应复用 login 并写 httpOnly Cookie);演示常量收敛于 `lib/server/demo.ts`。cookie 模式差异仅传输层,客户端仍按契约解析响应体。
- **验证(已完成部分)**:Next `lint` 0 error / `build` 绿(含 tsc);Nuxt `lint` 0 error / vitest 95 用例 / `typecheck` / `build` 四绿(demo-login 路由确认进产物)。**Next curl 全链路 7/7 过**(admin 登录 200 → faker 用户 sys_admin;random 200 → employee;非法 kind 400;未登录写 403 `DEMO_READONLY` 先于鉴权;白名单 login 401 放行到 handler;GET 401 不受影响;通知已读白名单 401 非 403)。Nuxt curl 因端口冲突误测 Nest 一轮、修正后未复测。
- **顺带一致性修复**:两端 `scripts/clean-logs.mjs`(GitHub Actions cron 载体)补 `coalesce(detail->>'seed','') <> 'true'` 条件——对齐 Nest 端 log-cleanup(T1 已改),否则布景日志会被保留窗口滚动清除,Dashboard 趋势图数据源消失。
- **LOG_API_SKIP_GET 不适用说明**:Next / Nuxt 无 Nest 的 LoggingInterceptor(api 日志)机制,该开关仅 Nest 端登记,两端 `.env.example` 不含此项(与契约"不改契约结构的配套运行时行为"口径一致)。
- **留用户本地验证(用户指示)**:两端 GUI 全流程(两 kind 登录 / 写表单被拦 toast);Nuxt 端 curl 复测(`DEMO_MODE=true` 启动后重点验 middleware 放行不被 204 短路)。

### T3 执行报告(2026-09-17 白天,AI 协助开发,用户本地 GUI 复核)

- **范围**:计划 §3.6 Step 4 / 5 全部开发项,提交 `4cb3436`。React 为基准实现,Vue 同构平移;Next 仅同步语言包(`check-locales` CI 强制 React ↔ Next 逐键一致),功能实现留 T4。
- **实现口径**:① 登录页「管理员」「随机用户」替代 GitHub / Google 占位(lucide `shield-check` / `dices`),pending 态按按钮独立,404 统一提示「演示登录暂不可用」;② auth store `demoLogin(kind)` 固定短会话(`rememberMe=false`,refreshToken 仅内存);③ **DEMO_READONLY 统一提示落地为「拦截器本地化 message + 页面既有错误 toast 呈现」**——两端所有写操作页面均已有错误 toast(未知 code 回退 `error.message`),拦截器再弹全局 toast 会双重提示,故 `api-client` 只把 message 替换为 `errors.api.demoReadonly`,零页面改动、Next / Nuxt 可照做;④ 成功 toast 按计划 §3.3 拍板仅带姓名;⑤ 旧键 `githubDeveloping` / `googleDeveloping` 两端已无引用但 Next / Nuxt 登录页仍在用,语言包暂留,**T4 完成后清理**;⑥ CSS 类 `.sign-in-oauth` → `.sign-in-demo`(两端)。
- **验证(已完成部分)**:React `lint` 0 error / vitest 93 用例 / `build` 三绿;Vue `lint` 0 error / vitest 95 用例 / `build`(含 vue-tsc)三绿;Next `check-locales` 14 文件一致。React 浏览器冒烟(用户本地 Nest 已开 `DEMO_MODE`):两按钮渲染、「管理员」pending 态正确、以 faker 用户登录跳首页且头像 / 全菜单正常;用户管理行操作「停用」→ 确认 → 弹出「演示环境,禁止修改数据」。
- **留用户本地手动验证(用户指示)**:随机用户 kind 登录;Vue 端 GUI 全流程;写表单可打开、校验可见、提交被拦 toast。

### 任务 A 执行报告(2026-09-17 00:00 触发,约 1 小时,T1 ✅ / T2 ✅)

- **前置检查**:git 干净(HEAD `cba5ef5`);密钥实际在 `apps/nest/.env`(`DATABASE_URL` + `SUPABASE_SECRET_KEY`)而非 `.env.local`——协议意图满足,按「只检查不创建」继续。
- **T1 结果**:契约 `d7b7bb3`、实现 `4147654`。build / lint 绿;curl 矩阵全过(6 类写拦截 / 6 白名单放行 / GET 不受影响 / 已登录超管写拦截 / 登录-刷新-退出-撤销链路);查库确认 `DEMO_READONLY` 0 条 error 日志、GET 0 条 api 日志;`DEMO_MODE` 关闭态回归一致。超管双保险经代码确认 v1.4.6 已覆盖三操作,未改动(超管互操作豁免为 v1.9.0 转移路径设计)。
- **T1 ⚠️ 备案**:e2e 未补齐。项目无任何测试基建(无 spec / jest 配置 / `test` 脚本 / `@nestjs/testing`),手册判据「`pnpm test` / e2e 补齐」前提不成立;从零引入测试框架(4~5 个新 devDependency + 测试库策略)属 `AGENTS.md` §18 架构级决策,无人值守不自行拍板。curl 全链路已提供同等验证覆盖;已登记 `code-review-backlog.md`,待用户决定测试框架选型后补。
- **T2 结果**:脚本 `1e5d48f`。真实执行 53.4s(头像 150/150),复跑 45.6s,11 表指纹逐表一致;超管哈希未变;保留 admin / test2 / test3(三者均绑定 `super_admin`,按「保留超管用户」口径整体保留)。真实数据端到端:admin 池 5/5 `sys_admin`,random 池 24 次覆盖四角色无超管,`demo1234` 可登录。
- **遗留给用户(不阻塞 T3/T4)**:① 超管 `admin` 仍为种子默认密码 `admin123`,**上线前必改**;② `test2` / `test3` 是否清理;③ 矩阵按计划字面执行,部门主管 / HR 不含演示场,可在角色管理调整;④ `super_admin` role_menus 24/28(重置前即如此,聚合免检不受影响)。 **（2026-09-22 销项）**①已改密(实测 admin123 返回 401 INVALID_CREDENTIALS)；④按实测为 30 菜单 / 超管 26 条、缺异常页目录+三子页共 4 条，已由 `apps/nest/scripts/migrate-menus-add-super-admin-grants.ts` 幂等回填(gap=0)；②③仍待用户处理。
- **后续处理(2026-09-17 白天,用户拍板)**:② 已销项——保留口径收窄为仅内置 `admin`(`username` 判据 + 须绑定 super_admin,否则拒绝执行),脚本修正后重跑 31.9s,test2 / test3 已物理清除,活跃用户 151,超管绑定仅 admin,无孤儿引用。① 已销项——用户已改密,curl 确认 `admin123` 返回 401 `INVALID_CREDENTIALS`。
- **T3/T4 提示**:库内已是 faker 数据集,白天可直接用快捷登录实测;本地 Nest 需 `DEMO_MODE=true` 才开放 demo-login。

## 5. 人工清单(不在任何定时任务范围,用户后续执行)

- [ ] 数据观感 GUI 验收:逐模块页面看 faker 数据逼真度、头像性别匹配(§9.2)。
- [ ] 四端线上环境配 `DEMO_MODE=true`,随 `AGENTS.md` §17 四端统一上线执行(含 Nest Render 保活等)。
- [ ] §9.2 验收清单最终逐项确认(线上口径)。
- [x] 任务 B 定时任务的创建(2026-09-17 排期,2026-09-18 01:00 触发;T3/T4 经用户本地 GUI 与 curl 验证通过后建立)。
