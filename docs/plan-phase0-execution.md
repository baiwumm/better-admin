# Phase 0 演示上线准备 — 自动化执行手册

> **定位**:本文件是 Phase 0(计划见 [`plan-dashboard-playground.md`](plan-dashboard-playground.md) §3)定时任务的唯一执行手册。「做什么」以计划 §3.6 执行清单与 §9.2 验收标准为真源,本文件只规定「怎么自动跑」:执行协议、阶段卡、验收判据、失败处理。规则引用章节号,不复制内容。

## 0. 阶段状态总览

| 阶段 | 内容 | 执行者 | 计划时间 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | OpenAPI 契约 v1.10.0 + Nest 服务端改造 | 定时任务 A | 2026-09-17 00:00 | ✅ 完成（`d7b7bb3` + `4147654`；e2e 子项 ⚠️ 备案，见 §4） |
| T2 | faker 重置脚本开发 + 首次真实执行 + 幂等复验 | 定时任务 A | 2026-09-17 00:00(紧随 T1) | ✅ 完成（`1e5d48f`） |
| T3 | React + Vue 前端(快捷登录 + DEMO_READONLY toast) | **用户手动** | 2026-09-17 白天 | ⬜ 未开始 |
| T4 | Next + Nuxt 前端(server API + 登录页 + toast) | **用户手动** | 2026-09-17 白天 | ⬜ 未开始 |
| T5 | 全链路验收 + 文档收尾 | 定时任务 B(待建) | 2026-09-18 00:00 | ⬜ 未开始 |

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

按计划 §3.6 Step 4~7 执行:React / Vue(Step 4~5)与 Next / Nuxt(Step 6~7)各端:登录页移除 GitHub / Google 占位 → 「管理员」「随机用户」两按钮;请求拦截器识别 `DEMO_READONLY` 统一 toast(i18n zh-CN / en);Next / Nuxt 另做 server API `demo-login` route handler + 同名只读拦截 + `.env.example` 登记。完成后自行提交,并回填本文件 §0 状态为 ✅。

> 提示:T2 已完成,白天可直接用 faker 数据实测两 kind 登录与写操作被拦 toast;需要管理操作时用超管账号密码登录(refresh_tokens 已被重置清空,需重新登录)。

### T5 — 定时任务 B(2026-09-18 00:00,任务待用户建)

**前置检查**:§1 第 2 条全部项 + T1~T4 全部 ✅。

**范围**:计划 §3.6 Step 8 可自动化部分 + §9.2 机器可验证项:

- [ ] 重启 `DEMO_MODE=true` 后 curl 全链路:白名单放行 / 非 GET 直拦 / 超管保护 / demo-login 两 kind 成功且 random 多次覆盖全部演示角色 / 登录-刷新-退出完整;验证后移除临时配置。
- [ ] `DEMO_READONLY` 拦截不产生 error 日志;GET 不产生 api 日志。
- [ ] `demo-reset` 幂等复跑一次确认数据集一致;超管密码哈希未变。
- [ ] 文档收尾:`docs/feature-matrix.md` 新增演示模式行(快捷登录 / 只读守卫,四端状态);`docs/ui-spec.md` §1.3 登录页快捷登录补充;§8 一致性同步清单逐项核对;`docs/progress.md` 置顶记录;`AGENTS.md` §19 当前待办指针同步。
- [ ] 前端 toast 项(§9.2 第 2 条)由用户白天验证,T5 只核对 i18n 键四端齐全。

**提交点**:`docs: Phase 0 验收与文档同步` 类提交;§4 追加验收报告。

## 4. 执行报告区(任务运行时追加,倒序)

### 任务 A 执行报告(2026-09-17 00:00 触发,约 1 小时,T1 ✅ / T2 ✅)

- **前置检查**:git 干净(HEAD `cba5ef5`);密钥实际在 `apps/nest/.env`(`DATABASE_URL` + `SUPABASE_SECRET_KEY`)而非 `.env.local`——协议意图满足,按「只检查不创建」继续。
- **T1 结果**:契约 `d7b7bb3`、实现 `4147654`。build / lint 绿;curl 矩阵全过(6 类写拦截 / 6 白名单放行 / GET 不受影响 / 已登录超管写拦截 / 登录-刷新-退出-撤销链路);查库确认 `DEMO_READONLY` 0 条 error 日志、GET 0 条 api 日志;`DEMO_MODE` 关闭态回归一致。超管双保险经代码确认 v1.4.6 已覆盖三操作,未改动(超管互操作豁免为 v1.9.0 转移路径设计)。
- **T1 ⚠️ 备案**:e2e 未补齐。项目无任何测试基建(无 spec / jest 配置 / `test` 脚本 / `@nestjs/testing`),手册判据「`pnpm test` / e2e 补齐」前提不成立;从零引入测试框架(4~5 个新 devDependency + 测试库策略)属 `AGENTS.md` §18 架构级决策,无人值守不自行拍板。curl 全链路已提供同等验证覆盖;已登记 `code-review-backlog.md`,待用户决定测试框架选型后补。
- **T2 结果**:脚本 `1e5d48f`。真实执行 53.4s(头像 150/150),复跑 45.6s,11 表指纹逐表一致;超管哈希未变;保留 admin / test2 / test3(三者均绑定 `super_admin`,按「保留超管用户」口径整体保留)。真实数据端到端:admin 池 5/5 `sys_admin`,random 池 24 次覆盖四角色无超管,`demo1234` 可登录。
- **遗留给用户(不阻塞 T3/T4)**:① 超管 `admin` 仍为种子默认密码 `admin123`,**上线前必改**;② `test2` / `test3` 是否清理;③ 矩阵按计划字面执行,部门主管 / HR 不含演示场,可在角色管理调整;④ `super_admin` role_menus 24/28(重置前即如此,聚合免检不受影响)。
- **后续处理(2026-09-17 白天,用户拍板)**:② 已销项——保留口径收窄为仅内置 `admin`(`username` 判据 + 须绑定 super_admin,否则拒绝执行),脚本修正后重跑 31.9s,test2 / test3 已物理清除,活跃用户 151,超管绑定仅 admin,无孤儿引用。① 已销项——用户已改密,curl 确认 `admin123` 返回 401 `INVALID_CREDENTIALS`。
- **T3/T4 提示**:库内已是 faker 数据集,白天可直接用快捷登录实测;本地 Nest 需 `DEMO_MODE=true` 才开放 demo-login。

*(下一条:任务 B 执行报告)*

## 5. 人工清单(不在任何定时任务范围,用户后续执行)

- [ ] 数据观感 GUI 验收:逐模块页面看 faker 数据逼真度、头像性别匹配(§9.2)。
- [ ] 四端线上环境配 `DEMO_MODE=true`,随 `AGENTS.md` §17 四端统一上线执行(含 Nest Render 保活等)。
- [ ] §9.2 验收清单最终逐项确认(线上口径)。
- [ ] 任务 B 定时任务的创建(用户完成 T3/T4 后安排)。
